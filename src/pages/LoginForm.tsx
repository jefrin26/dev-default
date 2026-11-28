import { useState, type FormEvent } from "react";
import { Header } from "../components/Header";
import { api, errorMessage } from "../lib/api";

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      setPassword("");
      onSuccess();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="site">
      <Header />
      <main className="main">
        <form className="login-card" onSubmit={submit}>
          <p className="eyebrow">Restricted</p>
          <h1>Admin login</h1>
          <p className="muted">Sign in to manage server updates.</p>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="button button--primary button--full" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <a className="admin-link admin-link--center" href="/">
            Back to status page
          </a>
        </form>
      </main>
    </div>
  );
}
