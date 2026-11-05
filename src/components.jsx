// Small shared pieces: icons, loading / empty / error messages and the visibility badge.
import { FaLock, FaEarthAmericas, FaLayerGroup, FaTriangleExclamation, FaStar } from "react-icons/fa6";

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

// Card that flips in 3D between front and back. `tall` = big study-mode size, `deal` = slide-in on mount.
export function FlipCard({ front, back, flipped, onFlip, tall, deal }) {
  return (
    <button className={`flip ${flipped ? "is-flipped" : ""} ${deal ? "deal" : ""}`} onClick={onFlip}>
      <span className="flip-inner">
        {/* Front face */}
        <span className={`tile flip-face ${tall ? "tall" : ""}`}>
          <span className="flash-side">Front</span>
          <span className="flash-text">{front}</span>
          {tall && <span className="muted">Tap to reveal</span>}
        </span>
        {/* Back face (turned around, so it shows when the card is flipped) */}
        <span className={`tile flip-face flip-back ${tall ? "tall" : ""}`}>
          <span className="flash-side">Back</span>
          <span className="flash-text">{back}</span>
        </span>
      </span>
    </button>
  );
}
