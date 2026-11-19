import { useEffect, useState } from "react";
import { loadDeck, saveDeck, deleteDeck, deleteDeckImage, newDeckUrl, uploadDeckImage, validateDeckImage } from "../solid/pod.js";
import { getVisibility, setVisibility, buildLink } from "../solid/sharing.js";
import { DeckImage, Loading, ErrorBox, VisibilityBadge, Icon } from "../components.jsx";

// A new deck: empty name, today's date (YYYY-MM-DD) and one empty card.
const blankDeck = () => ({ name: "", description: "", dateCreated: new Date().toISOString().slice(0, 10), cards: [{ front: "", back: "" }] });

// Short, readable form of the original deck's URL: file name + owner, e.g. "test by alice".
// The full URL stays available as a hover tooltip on the line that shows this.
function describeSource(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const file = decodeURIComponent(pathname.split("/").pop()).replace(/\.ttl$/, "");
    return `"${file}" by ${hostname.split(".")[0]}`;
  } catch {
    return url; // not a valid URL: show it as it is
  }
}

// Image URLs used by a list of cards.
const imagesOf = (cards) => cards.flatMap((card) => [card.image, card.backImage]).filter(Boolean);

// A card with no text and no image is not saved.
const isEmptyCard = (card) => !(card.front.trim() || card.back.trim() || card.image || card.backImage);

// Upload the image files the user picked (card.imageFile / card.backImageFile) into the deck's folder.
// Returns the cards with the new image URLs instead of the files. Every uploaded URL is added to `uploaded`.
async function uploadCardImages(deckUrl, cards, uploaded) {
  const result = [];
  for (const card of cards) {
    const withUrls = { ...card };
    for (const [imageKey, fileKey] of [["image", "imageFile"], ["backImage", "backImageFile"]]) {
      if (!withUrls[fileKey]) continue;
      withUrls[imageKey] = await uploadDeckImage(deckUrl, withUrls[fileKey]);
      uploaded.push(withUrls[imageKey]);
      delete withUrls[fileKey];
    }
    result.push(withUrls);
  }
  return result;
}

// Delete images from the deck's folder. Never throws: returns the error messages of the ones that failed.
async function deleteImages(deckUrl, imageUrls) {
  const errors = [];
  for (const imageUrl of imageUrls) {
    try { await deleteDeckImage(deckUrl, imageUrl); }
    catch (e) { errors.push(e.message); }
  }
  return errors;
}

// Edit one deck. deckUrl === null means a brand-new deck (folder and file created on first save).
export default function DeckEditor({ container, deckUrl, onOpen, onStudy, onBack, notify }) {
  const [deck, setDeck] = useState(deckUrl ? null : blankDeck()); // the deck being edited (null while loading)
  const [mode, setMode] = useState("private");                    // "private", "public", or null if it could not be read
  const [error, setError] = useState("");                         // message if loading failed
  const [busy, setBusy] = useState(false);                        // true while saving, so buttons are disabled

  // Existing deck: load its content and visibility.
  useEffect(() => {
    if (!deckUrl) return;
    Promise.all([loadDeck(deckUrl), getVisibility(deckUrl).catch(() => null)]) // no permission info is not a reason to block editing
      .then(([d, v]) => { setDeck(d); setMode(v); })
      .catch((e) => setError(e.message));
  }, [deckUrl]);

  if (error) return <ErrorBox onRetry={onBack}>{error}</ErrorBox>;
  if (!deck) return <Loading text="Opening deck…" />;

  // --- Small editing helpers (each makes a changed copy of the deck) ---
  const setField = (key, value) => setDeck({ ...deck, [key]: value });                 // change name / description / cards
  const setCard = (i, key, value) => setField("cards", deck.cards.map((c, j) => (j === i ? { ...c, [key]: value } : c))); // change one card
  const addCard = () => setField("cards", [...deck.cards, { front: "", back: "" }]);   // add an empty card
  const removeCard = (i) => setField("cards", deck.cards.filter((_, j) => j !== i));   // remove card number i
  const moveCard = (i, step) => {                                                       // move card i up (-1) or down (+1)
    const cards = [...deck.cards];
    [cards[i], cards[i + step]] = [cards[i + step], cards[i]];                          // swap with its neighbour
    setField("cards", cards);
  };

  // Save the deck to the pod (creates the file the first time).
  async function save() {
    if (!deck.name.trim()) return notify("Give your deck a name first.");
    setBusy(true);
    const uploaded = []; // images uploaded during this save, so a failed save can delete them again
    let url = deckUrl;
    let cards;           // every card, with its new image files replaced by pod URLs
    try {
      url = deckUrl ?? await newDeckUrl(container, deck.name); // new deck -> make a folder and file name from the title
      cards = await uploadCardImages(url, deck.cards, uploaded);
      await saveDeck(url, { ...deck, cards: cards.filter((card) => !isEmptyCard(card)) });
    } catch (e) {
      const cleanupErrors = await deleteImages(url, uploaded);
      const cleanupMessage = cleanupErrors.length ? ` Image cleanup failed: ${cleanupErrors.join("; ")}` : "";
      notify("Couldn't save: " + e.message + cleanupMessage);
      return setBusy(false);
    }

    // Saved. Show the uploaded images as normal pod images, and delete the ones no card uses any more.
    setDeck({ ...deck, cards });
    const stillUsed = new Set(imagesOf(cards));
    const removeErrors = await deleteImages(url, imagesOf(deck.cards).filter((image) => !stillUsed.has(image)));
    notify(removeErrors.length ? "Deck saved, but an old image couldn't be removed: " + removeErrors.join("; ") : "Deck saved!");
    if (!deckUrl) onOpen(url); // after creating, switch to editing the saved deck
    setBusy(false);
  }

  // Switch the deck between private and public.
  async function changeVisibility(next) {
    setBusy(true);
    try {
      await setVisibility(deckUrl, next);
      setMode(next);
      notify(next === "public" ? "Anyone with the link can read this deck." : "Only you can see this deck.");
    } catch (e) { notify("Couldn't change visibility: " + e.message); }
    setBusy(false);
  }

  // Copy the share link to the clipboard.
  async function copyLink() {
    await navigator.clipboard.writeText(buildLink(deckUrl));
    notify(mode === "public" ? "Link copied!" : "Link copied. Make the deck public so others can open it.");
  }

  // Delete the deck (after asking). Clones owned by others are not affected.
  async function remove() {
    if (!confirm("Delete this deck? Existing clones stay with their owners.")) return;
    setBusy(true);
    try {
      await deleteDeck(deckUrl);
      onBack();
    } catch (e) {
      notify("Couldn't delete: " + e.message);
    }
    setBusy(false);
  }

  return (
    <>
      {/* Top row: back, and study (only for a saved deck) */}
      <div className="spread">
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Back</button>
        {deckUrl && <button className="btn btn-amber btn-small" onClick={() => onStudy(deckUrl)}>▶ Study</button>}
      </div>
      <h1 style={{ marginTop: 16 }}>{deckUrl ? "Edit deck" : "New deck"}</h1>

      {/* Name, description, and "clone of" note */}
      <div className="tile">
        <label htmlFor="name">Deck name</label>
        <input id="name" value={deck.name} onChange={(e) => setField("name", e.target.value)} />
        <label htmlFor="desc">Description</label>
        <textarea id="desc" rows={2} value={deck.description} onChange={(e) => setField("description", e.target.value)} />
        {deck.isBasedOn && <p className="row muted" style={{ marginTop: 12, gap: 8, flexWrap: "nowrap" }} title={deck.isBasedOn}><span className="badge badge-clone">Clone</span><span style={{ overflowWrap: "anywhere" }}>of {describeSource(deck.isBasedOn)}</span></p>}
      </div>

      {/* Visibility: private/public buttons and copy link (only after the deck is saved) */}
      <div className="tile">
        <div className="spread">
          <h2>Who can see this deck?</h2>
          {deckUrl && mode && <VisibilityBadge mode={mode} />}
        </div>
        {deckUrl ? (
          <>
            <div className="segmented">
              <button className={`btn ${mode === "private" ? "" : "btn-ghost"}`} disabled={busy} onClick={() => changeVisibility("private")}><Icon name="lock" /> Private</button>
              <button className={`btn ${mode === "public" ? "btn-amber" : "btn-ghost"}`} disabled={busy} onClick={() => changeVisibility("public")}><Icon name="globe" /> Public</button>
            </div>
            {!mode && <p className="muted" style={{ marginTop: 12 }}>Couldn't read this deck's sharing settings. You can still choose one above.</p>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-ghost btn-small" onClick={copyLink}>Copy link</button>
              <span className="muted">Anyone with a public link can read this deck.</span>
            </div>
          </>
        ) : (
          <p className="muted">New decks are private. Save first, then you can share it.</p>
        )}
      </div>

      {/* The cards: one tile each, with front/back fields and a remove button */}
      <h2>Cards ({deck.cards.length})</h2>
      {deck.cards.map((c, i) => (
        <div className="tile" key={i}>
          <div className="spread">
            <span className="card-num">#{i + 1}</span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn btn-ghost btn-small" disabled={i === 0} onClick={() => moveCard(i, -1)} aria-label={`Move card ${i + 1} up`}>▲</button>
              <button className="btn btn-ghost btn-small" disabled={i === deck.cards.length - 1} onClick={() => moveCard(i, 1)} aria-label={`Move card ${i + 1} down`}>▼</button>
              <button className="btn btn-coral btn-small" onClick={() => removeCard(i)} aria-label={`Remove card ${i + 1}`}>✕</button>
            </div>
          </div>
          <label>Front</label>
          <input value={c.front} onChange={(e) => setCard(i, "front", e.target.value)} />
          <label>Back</label>
          <input value={c.back} onChange={(e) => setCard(i, "back", e.target.value)} />
          {/* Two image slots per card (front and back); the same code runs for both. */}
          {[
            { key: "image", fileKey: "imageFile", label: "Front image" },
            { key: "backImage", fileKey: "backImageFile", label: "Back image" },
          ].map(({ key, fileKey, label }) => (
            <div key={key}>
              <label htmlFor={`${key}-${i}`}>{label}</label>
              <input
                id={`${key}-${i}`}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                disabled={busy}
                // Check the picked file; it is only uploaded when the deck is saved.
                onChange={(e) => {
                  const file = e.target.files[0];
                  // Clear the input so picking the same file again still triggers onChange.
                  e.target.value = "";
                  if (!file) return;
                  try {
                    validateDeckImage(file);
                    setCard(i, fileKey, file);
                  } catch (error) {
                    notify(error.message);
                  }
                }}
              />
              {/* Preview: a newly picked file if there is one, otherwise the saved image, with a remove button */}
              {(c[fileKey] || c[key]) && (
                <div className="image-editor">
                  <DeckImage source={c[fileKey] ?? c[key]} alt={`${label} for card ${i + 1}`} />
                  <button
                    className="btn btn-coral btn-small image-remove"
                    disabled={busy}
                    aria-label={`Remove ${label.toLowerCase()} from card ${i + 1}`}
                    onClick={() => setDeck({
                      ...deck,
                      cards: deck.cards.map((card, j) => j === i
                        ? { ...card, [key]: undefined, [fileKey]: undefined }
                        : card),
                    })}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
          <p className="muted image-help">JPEG, PNG, GIF, or WebP · 5 MB max · saved with the deck</p>
        </div>
      ))}
      <button className="btn btn-ghost" onClick={addCard}>+ Add card</button>

      {/* Bottom buttons */}
      <div className="row row-end" style={{ marginTop: 24 }}>
        {deckUrl && <button className="btn btn-coral" disabled={busy} onClick={remove}>Delete</button>}
        <button className="btn" disabled={busy} onClick={save}>Save deck</button>
      </div>
    </>
  );
}
