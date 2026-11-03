import { useEffect, useState } from "react";
import { loadDeck, saveDeck, deleteDeck, newDeckUrl } from "../solid/pod.js";
import { getVisibility, setVisibility, buildLink } from "../solid/sharing.js";
import { Loading, ErrorBox, VisibilityBadge, Icon } from "../components.jsx";

const blankDeck = () => ({ name: "", description: "", dateCreated: new Date().toISOString().slice(0, 10), cards: [{ front: "", back: "" }] });

// Edit one deck. deckUrl === null means a brand-new deck (file created on first save).
export default function DeckEditor({ container, deckUrl, onOpen, onStudy, onBack, notify }) {
  const [deck, setDeck] = useState(deckUrl ? null : blankDeck());
  const [mode, setMode] = useState("private");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!deckUrl) return;
    Promise.all([loadDeck(deckUrl), getVisibility(deckUrl)])
      .then(([d, v]) => { setDeck(d); setMode(v); })
      .catch((e) => setError(e.message));
  }, [deckUrl]);

  if (error) return <ErrorBox onRetry={onBack}>{error}</ErrorBox>;
  if (!deck) return <Loading text="Opening deck…" />;

  const setField = (key, value) => setDeck({ ...deck, [key]: value });
  const setCard = (i, key, value) => setField("cards", deck.cards.map((c, j) => (j === i ? { ...c, [key]: value } : c)));
  const addCard = () => setField("cards", [...deck.cards, { front: "", back: "" }]);
  const removeCard = (i) => setField("cards", deck.cards.filter((_, j) => j !== i));

  async function save() {
    if (!deck.name.trim()) return notify("Give your deck a name first.");
    setBusy(true);
    try {
      const url = deckUrl ?? newDeckUrl(container, deck.name);
      await saveDeck(url, { ...deck, cards: deck.cards.filter((c) => c.front.trim() || c.back.trim()) });
      notify("Deck saved!");
      if (!deckUrl) onOpen(url);
    } catch (e) { notify("Couldn't save: " + e.message); }
    setBusy(false);
  }

  async function changeVisibility(next) {
    setBusy(true);
    try {
      await setVisibility(deckUrl, next);
      setMode(next);
      notify(next === "public" ? "Anyone with the link can read this deck." : "Only you can see this deck.");
    } catch (e) { notify("Couldn't change visibility: " + e.message); }
    setBusy(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(buildLink(deckUrl));
    notify(mode === "public" ? "Link copied!" : "Link copied. Make the deck public so others can open it.");
  }

  async function remove() {
    if (!confirm("Delete this deck? Existing clones stay with their owners.")) return;
    await deleteDeck(deckUrl);
    onBack();
  }

  return (
    <>
      <div className="spread">
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Back</button>
        {deckUrl && <button className="btn btn-amber btn-small" onClick={() => onStudy(deckUrl)}>▶ Study</button>}
      </div>
      <h1 style={{ marginTop: 16 }}>{deckUrl ? "Edit deck" : "New deck"}</h1>

      <div className="tile">
        <label htmlFor="name">Deck name</label>
        <input id="name" value={deck.name} onChange={(e) => setField("name", e.target.value)} />
        <label htmlFor="desc">Description</label>
        <textarea id="desc" rows={2} value={deck.description} onChange={(e) => setField("description", e.target.value)} />
        {deck.isBasedOn && <p className="muted" style={{ marginTop: 12 }}><span className="badge badge-clone">Clone</span> based on {deck.isBasedOn}</p>}
      </div>

      <div className="tile">
        <div className="spread">
          <h2>Who can see this deck?</h2>
          {deckUrl && <VisibilityBadge mode={mode} />}
        </div>
        {deckUrl ? (
          <>
            <div className="segmented">
              <button className={`btn ${mode === "private" ? "" : "btn-ghost"}`} disabled={busy} onClick={() => changeVisibility("private")}><Icon name="lock" /> Private</button>
              <button className={`btn ${mode === "public" ? "btn-amber" : "btn-ghost"}`} disabled={busy} onClick={() => changeVisibility("public")}><Icon name="globe" /> Public</button>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" onClick={copyLink}>Copy link</button>
              <span className="muted">Anyone with a public link can read this deck.</span>
            </div>
          </>
        ) : (
          <p className="muted">New decks are private. Save first, then you can share it.</p>
        )}
      </div>

      <h2>Cards ({deck.cards.length})</h2>
      {deck.cards.map((c, i) => (
        <div className="tile" key={i}>
          <div className="spread">
            <span className="card-num">#{i + 1}</span>
            <button className="btn btn-coral btn-small" onClick={() => removeCard(i)} aria-label={`Remove card ${i + 1}`}>✕</button>
          </div>
          <label>Front</label>
          <input value={c.front} onChange={(e) => setCard(i, "front", e.target.value)} />
          <label>Back</label>
          <input value={c.back} onChange={(e) => setCard(i, "back", e.target.value)} />
        </div>
      ))}
      <button className="btn btn-ghost" onClick={addCard}>+ Add card</button>

      <div className="row row-end" style={{ marginTop: 24 }}>
        {deckUrl && <button className="btn btn-coral" onClick={remove}>Delete</button>}
        <button className="btn" disabled={busy} onClick={save}>Save deck</button>
      </div>
    </>
  );
}
