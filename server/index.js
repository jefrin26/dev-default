import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  loginHandler,
  logoutHandler,
  requireAuth,
  sessionHandler,
  validateConfig,
} from "./auth.js";
import { validateStatus } from "./events.js";
import * as store from "./store.js";

validateConfig();

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(root, "dist");
const port = Number(process.env.PORT) || 8080;

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));

const route = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

app.get(
  "/api/events",
  route(async (request, response) => {
    const events = await store.listEvents();
    response.json({ events, serverNow: new Date().toISOString() });
  }),
);

app.get("/api/admin/session", sessionHandler);
app.post("/api/admin/login", loginHandler);
app.post("/api/admin/logout", logoutHandler);

app.get(
  "/api/admin/events",
  requireAuth,
  route(async (request, response) => {
    const events = await store.listEvents({ includeOld: true });
    response.json({ events, serverNow: new Date().toISOString() });
  }),
);

app.post(
  "/api/admin/events",
  requireAuth,
  route(async (request, response) => {
    const event = await store.createEvent(request.body ?? {});
    response.status(201).json(event);
  }),
);

app.patch(
  "/api/admin/events/:id",
  requireAuth,
  route(async (request, response) => {
    const body = request.body ?? {};
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      validateStatus(body.status);
    }
    const event = await store.updateEvent(request.params.id, body);
    response.json(event);
  }),
);

app.post(
  "/api/admin/events/:id/extend",
  requireAuth,
  route(async (request, response) => {
    const minutes = Number(request.body?.minutes);
    const event = await store.extendEvent(request.params.id, minutes);
    response.json(event);
  }),
);

app.delete(
  "/api/admin/events/:id",
  requireAuth,
  route(async (request, response) => {
    await store.deleteEvent(request.params.id);
    response.status(204).end();
  }),
);

app.use("/api", (request, response) => {
  response.status(404).json({ error: "Not found." });
});

if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist, { index: false }));
  app.get(/^(?!\/api(?:\/|$)).*/, (request, response) => {
    response.sendFile(path.join(dist, "index.html"));
  });
} else {
  app.get("/", (request, response) => {
    response
      .status(503)
      .type("text/plain")
      .send("Frontend not built. Run `npm run build` or use `npm run dev:web`.");
  });
}

app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) {
    console.error(error);
  }
  return response.status(status).json({
    error: status >= 500 ? "Server error." : error.message,
  });
});

app.listen(port, () => {
  console.log(`Dev updates server listening on http://localhost:${port}`);
});
