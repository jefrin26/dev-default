import crypto from "node:crypto";

const COOKIE_NAME = "admin_session";
const SESSION_MS = 12 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const password = process.env.ADMIN_PASSWORD ?? "";
const secret = process.env.SESSION_SECRET ?? "";
const secureCookie = process.env.COOKIE_SECURE === "true";
const failedAttempts = new Map();

export function validateConfig() {
  if (!password || password === "change-me-before-deploy") {
    throw new Error(
      "Set ADMIN_PASSWORD to a real password (see .env.example) before starting the server.",
    );
  }
  if (secret.length < 16 || secret === "replace-with-a-long-random-string") {
    throw new Error(
      "Set SESSION_SECRET to a long random string (see .env.example) before starting the server.",
    );
  }
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest();
}

function sameSecret(left, right) {
  const a = digest(left);
  const b = digest(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sign(payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function createToken() {
  const payload = Buffer.from(
    JSON.stringify({
      iat: Date.now(),
      nonce: crypto.randomBytes(16).toString("base64url"),
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (typeof token !== "string") {
    return false;
  }
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(data.iat) && Date.now() - data.iat <= SESSION_MS;
  } catch {
    return false;
  }
}

function readCookie(request, name) {
  const header = request.headers.cookie;
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

function clientIp(request) {
  return request.ip || request.socket.remoteAddress || "unknown";
}

function isLocked(ip) {
  const entry = failedAttempts.get(ip);
  if (!entry) {
    return false;
  }
  if (Date.now() - entry.startedAt > WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const now = Date.now();
  let entry = failedAttempts.get(ip);
  if (!entry || now - entry.startedAt > WINDOW_MS) {
    entry = { count: 0, startedAt: now };
    failedAttempts.set(ip, entry);
  }
  entry.count += 1;

  if (failedAttempts.size > 1000) {
    for (const [key, value] of failedAttempts) {
      if (now - value.startedAt > WINDOW_MS) {
        failedAttempts.delete(key);
      }
    }
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: secureCookie,
  path: "/",
};

export function sessionHandler(request, response) {
  response.json({
    authenticated: verifyToken(readCookie(request, COOKIE_NAME)),
  });
}

export function requireAuth(request, response, next) {
  if (!verifyToken(readCookie(request, COOKIE_NAME))) {
    return response.status(401).json({ error: "Authentication required." });
  }
  next();
}

export function loginHandler(request, response) {
  const ip = clientIp(request);
  if (isLocked(ip)) {
    return response
      .status(429)
      .json({ error: "Too many attempts. Try again in 15 minutes." });
  }

  const provided = request.body?.password;
  if (typeof provided !== "string" || !sameSecret(provided, password)) {
    recordFailure(ip);
    return response.status(401).json({ error: "Incorrect password." });
  }

  failedAttempts.delete(ip);
  response.cookie(COOKIE_NAME, createToken(), {
    ...cookieOptions,
    maxAge: SESSION_MS,
  });
  return response.json({ ok: true });
}

export function logoutHandler(request, response) {
  response.clearCookie(COOKIE_NAME, cookieOptions);
  return response.json({ ok: true });
}
