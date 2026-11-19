// Small shared pieces: icons, loading / empty / error messages and the visibility badge.
import { useEffect, useState } from "react";
import { FaLock, FaEarthAmericas, FaLayerGroup, FaTriangleExclamation, FaStar } from "react-icons/fa6";
import { loadDeckImage } from "./solid/pod.js";

// Short name -> icon, so screens write <Icon name="lock" /> instead of importing icons themselves.
const ICONS = { lock: FaLock, globe: FaEarthAmericas, card: FaLayerGroup, warning: FaTriangleExclamation, star: FaStar };

// Icon by name; react-icons draws it with the surrounding text color.
export function Icon({ name }) {
  const Glyph = ICONS[name];
  return <Glyph className="icon" aria-hidden="true" />;
}

// Spinner with a text, shown while something loads.
export function Loading({ text = "Loading…" }) {
  return (
    <div className="tile message">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

// Friendly message for "nothing here yet".
export function Empty({ icon = <Icon name="card" />, title, children }) {
  return (
    <div className="tile message">
      <span className="message-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
    </div>
  );
}

// Error message; shows a "Try again" button only if onRetry is given.
export function ErrorBox({ children, onRetry }) {
  return (
    <div className="tile message message-error">
      <span className="message-icon"><Icon name="warning" /></span>
      <p>{children}</p>
      {onRetry && <button className="btn btn-ghost btn-small" onClick={onRetry}>Try again</button>}
    </div>
  );
}

// Small label: globe + "Public" or lock + "Private".
export function VisibilityBadge({ mode }) {
  return <span className={`badge badge-${mode}`}><Icon name={mode === "public" ? "globe" : "lock"} /> {mode === "public" ? "Public" : "Private"}</span>;
}

// Shows a card image. `source` is either a pod URL (downloaded with the user's login, so private decks work)
// or a File the user just picked (shown straight away, before it is saved).
export function DeckImage({ source, alt = "Card image" }) {
  // State: the address the <img> can show, and whether loading failed.
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // `active` stops a slow download from updating the screen after the card changed or closed.
    let active = true;
    let objectUrl;
    setImageUrl("");
    setFailed(false);
    if (!source) return undefined;

    // A File/Blob is used as it is; a URL is downloaded from the pod.
    const filePromise = source instanceof Blob
      ? Promise.resolve(source)
      : loadDeckImage(source);
    filePromise
      .then((file) => {
        // The downloaded file becomes a temporary browser address (blob:...) that <img> can show.
        objectUrl = URL.createObjectURL(file);
        if (active) setImageUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      // Cleanup: ignore late answers and free the temporary address (otherwise it leaks memory).
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  // What to show: nothing, an error text, a loading text, or the image itself.
  if (!source) return null;
  if (failed) return <span className="image-unavailable">Image unavailable</span>;
  if (!imageUrl) return <span className="image-loading">Loading image…</span>;
  return <img className="card-image" src={imageUrl} alt={alt} onError={() => setFailed(true)} />;
}

// Card that flips in 3D between front and back. `tall` = big study-mode size, `deal` = slide-in on mount.
export function FlipCard({ front, back, image, backImage, flipped, onFlip, tall, deal }) {
  return (
    <button className={`flip ${flipped ? "is-flipped" : ""} ${deal ? "deal" : ""}`} onClick={onFlip}>
      <span className="flip-inner">
        {/* Front face */}
        <span className={`tile flip-face ${tall ? "tall" : ""}`}>
          <span className="flash-side">Front</span>
          {image && <DeckImage source={image} alt="Flashcard" />}
          <span className="flash-text">{front}</span>
          {tall && <span className="muted">Tap to reveal</span>}
        </span>
        {/* Back face (turned around, so it shows when the card is flipped) */}
        <span className={`tile flip-face flip-back ${tall ? "tall" : ""}`}>
          <span className="flash-side">Back</span>
          {backImage && <DeckImage source={backImage} alt="Flashcard back" />}
          <span className="flash-text">{back}</span>
        </span>
      </span>
    </button>
  );
}
