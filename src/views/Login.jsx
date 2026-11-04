import { useState } from "react";
import { Icon } from "../components.jsx";

// Login screen: the user picks their Solid provider. For now the button logs in as the mock user whatever is typed.
export default function Login({ onLogin }) {
  const [issuer, setIssuer] = useState("https://solidcommunity.net");

  function submit(e) {
    e.preventDefault();
    onLogin();
  }

  return (
    <form className="tile" onSubmit={submit}>
      <h1>Welcome to SolidCard</h1>
      <p className="muted">Your decks live in your own Solid Pod. Log in with your Solid provider to see them.</p>
      <label htmlFor="issuer">Solid provider</label>
      <div className="row">
        <input id="issuer" className="grow" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
        <button className="btn btn-amber">Log in</button>
      </div>
    </form>
  );
}
