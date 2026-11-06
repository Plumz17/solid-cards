import { useEffect, useState } from "react";
import { listDecks } from "../solid/pod.js";
import { parseLink } from "../solid/sharing.js";
import { Loading, Empty, ErrorBox } from "../components.jsx";

// Deck list + "Paste a deck link" field.
export default function MyDecks({ container, onOpen, onNew, onPreview, onStudy }) {
  const [decks, setDecks] = useState(null);   // null while loading, then the list of decks
  const [error, setError] = useState("");     // message if loading failed
  const [link, setLink] = useState("");       // text typed in the "paste a link" field
  const [linkError, setLinkError] = useState("");

  // Load deck content only; permission checks are handled from the editor on demand.
  const load = () => {
    setDecks(null);
    setError("");
    listDecks(container).then(setDecks).catch((e) => setError(e.message));
  };
  useEffect(load, [container]); // load once when the screen opens

  // "Open" button: turn the pasted text into a deck URL and show its preview.
  function openLink(e) {
    e.preventDefault();
    const url = parseLink(link);
    if (!url) return setLinkError("That doesn't look like a deck link.");
    onPreview(url);
  }

  return (
    <>
      {/* Title and "new deck" button */}
      <div className="spread">
        <h1>My decks</h1>
        <button className="btn btn-amber" onClick={onNew}>+ New deck</button>
      </div>

      {/* Paste a deck link (app link or raw deck URL) */}
      <form className="tile" onSubmit={openLink}>
        <label htmlFor="link">Paste a deck link</label>
        <div className="row">
          <input id="link" className="grow" placeholder="https://… or app link" value={link}
            onChange={(e) => { setLink(e.target.value); setLinkError(""); }} />
          <button className="btn">Open</button>
        </div>
        {linkError && <p style={{ color: "var(--coral-lip)", marginTop: 8 }}>{linkError}</p>}
      </form>

      {/* Loading / error / empty states */}
      {error && <ErrorBox onRetry={load}>Couldn't load your decks. {error}</ErrorBox>}
      {!error && decks === null && <Loading text="Loading your decks…" />}
      {decks?.length === 0 && <Empty title="No decks yet">Create your first deck to get started.</Empty>}

      {/* One tile per deck */}
      {decks?.map((d) => (
        <div key={d.url} className="tile deck-item">
          <div className="deck-info">
            <h2>{d.name}</h2>
            <p className="muted">
              {d.cardCount} card{d.cardCount === 1 ? "" : "s"}
              {d.isBasedOn && <> · <span className="badge badge-clone">Clone</span></>}
            </p>
            <p className="muted">Sharing settings are in Edit.</p>
          </div>
          <div className="deck-side">
            <div className="row">
              <button className="btn btn-ghost btn-small" onClick={() => onOpen(d.url)}>✎ Edit</button>
              <button className="btn btn-amber btn-small" disabled={d.cardCount === 0} onClick={() => onStudy(d.url)}>▶ Study</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
