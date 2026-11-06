import { useState } from "react";
import { login } from "../solid/auth.js";
import { DEFAULT_ISSUER } from "../solid/config.js";

// Login screen: the user picks their Solid provider, then the provider asks for the password.
export default function Login() {
  const [issuer, setIssuer] = useState(DEFAULT_ISSUER); // the text in the provider field
  const [busy, setBusy] = useState(false);              // true while we hand over to the provider
  const [error, setError] = useState("");               // message if the login could not start

  // Runs when the form is submitted (button click or Enter).
  async function submit(e) {
    e.preventDefault(); // stop the browser from reloading the page
    setBusy(true);
    setError("");
    try {
      await login(issuer.trim()); // leaves this page for the provider's login page
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="tile" onSubmit={submit}>
      <h1>Welcome to SolidCard</h1>
      <p className="muted">Your decks live in your own Solid Pod. Log in with your Solid provider to see them.</p>
      <label htmlFor="issuer">Solid provider</label>
      <div className="row">
        <input id="issuer" className="grow" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
        <button className="btn btn-amber" disabled={busy || !issuer.trim()}>{busy ? "Opening…" : "Log in"}</button>
      </div>
      {error && <p style={{ color: "var(--coral-lip)", marginTop: 8 }}>{error}</p>}
    </form>
  );
}
