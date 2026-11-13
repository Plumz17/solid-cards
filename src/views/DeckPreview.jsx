import { useEffect, useState } from "react";
import { loadDeck } from "../solid/pod.js";
import { cloneDeck } from "../solid/clone.js";
import { Loading, Empty, ErrorBox, FlipCard } from "../components.jsx";

// Read-only view of any deck URL, with a Clone button. Tap a card to flip it.
// `container` is the viewer's own decks folder (null when logged out or not loaded yet): clones are saved there.
export default function DeckPreview({ deckUrl, container, loggedIn, onBack, onOpen, onStudy, notify }) {
  const [deck, setDeck] = useState(null);     // the loaded deck (null while loading)
  const [error, setError] = useState("");     // e.g. "private or not found"
  const [flipped, setFlipped] = useState({}); // which cards are flipped, e.g. { 0: true }
  const [busy, setBusy] = useState(false);    // true while cloning

  // Load the deck whenever the URL changes.
  useEffect(() => {
    setDeck(null);
    setError("");
    loadDeck(deckUrl).then(setDeck).catch((e) => setError(e.message));
  }, [deckUrl]);

  // Copy this deck into the viewer's own pod, then open the copy in the editor.
  async function clone() {
    setBusy(true);
    try {
      const url = await cloneDeck(deckUrl, container);
      notify("Cloned into your pod!");
      onOpen(url);
    } catch (e) { notify("Couldn't clone: " + e.message); }
    setBusy(false);
  }

  return (
    <>
      <button className="btn btn-ghost btn-small" onClick={onBack}>← Back</button>

      {/* Error or loading state */}
      {error && <div style={{ marginTop: 16 }}><ErrorBox>{error}</ErrorBox></div>}
      {!error && !deck && <Loading text="Fetching deck…" />}

      {deck && (
        <>
          {/* Deck title and the Study / Clone buttons */}
          <div className="spread" style={{ marginTop: 16 }}>
            <div>
              <h1>{deck.name}</h1>
              <p className="muted">{deck.description}</p>
              <p className="muted">Read-only preview · {deck.cards.length} cards</p>
            </div>
            <div className="row">
              <button className="btn btn-ghost" onClick={() => onStudy(deckUrl)}>▶ Study</button>
              <button className="btn btn-amber" disabled={busy || !container} onClick={clone}>
                {loggedIn ? "Clone" : "Log in to clone"}
              </button>
            </div>
          </div>

          {/* The cards; clicking one flips just that card */}
          {deck.cards.length === 0 && <Empty title="No cards">This deck is empty.</Empty>}
          {deck.cards.map((c, i) => (
            <FlipCard key={i} front={c.front} back={c.back} image={c.image} backImage={c.backImage} flipped={!!flipped[i]} onFlip={() => setFlipped({ ...flipped, [i]: !flipped[i] })} />
          ))}
        </>
      )}
    </>
  );
}
