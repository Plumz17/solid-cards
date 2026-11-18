import { useEffect, useState } from "react";
import { listFollowing, followUser, unfollowUser, listFriendDecks } from "../solid/following.js";
import { Loading, ErrorBox } from "../components.jsx";

// Friends screen: add a friend by WebID, and see the public decks of everyone I follow.
export default function Friends({ container, webId, onBack, onPreview, onStudy }) {
  const [friends, setFriends] = useState(null); // null while loading, then a list of WebIDs
  const [error, setError] = useState("");       // message if the friend list could not be loaded
  const [input, setInput] = useState("");       // text typed in the "add a friend" field
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);      // true while saving a new friend

  // Load my friend list from my pod.
  const load = () => {
    setFriends(null);
    setError("");
    listFollowing(container).then(setFriends).catch((e) => setError(e.message));
  };
  useEffect(load, [container]); // load once when the screen opens

  // "Follow" button: check the WebID, save it to my friend list, then show it in the list.
  async function follow(e) {
    e.preventDefault();
    if (input.trim() === webId) return setFormError("That's your own WebID.");
    setBusy(true);
    setFormError("");
    try {
      const added = await followUser(container, input);
      setFriends((list) => (list.includes(added) ? list : [...list, added]));
      setInput("");
    } catch (err) { setFormError(err.message); }
    setBusy(false);
  }

  // "Unfollow" button: remove from my friend list, then from the screen.
  async function unfollow(friend) {
    try {
      await unfollowUser(container, friend);
      setFriends((list) => list.filter((f) => f !== friend));
    } catch (err) { setFormError("Couldn't unfollow: " + err.message); }
  }

  return (
    <>
      <button className="btn btn-ghost btn-small" onClick={onBack}>← Back</button>
      <h1 style={{ marginTop: 16 }}>Friends</h1>

      {/* Add a friend: paste their WebID */}
      <form className="tile" onSubmit={follow}>
        <label htmlFor="friend">Follow someone by WebID</label>
        <div className="row">
          <input id="friend" className="grow" placeholder="https://name.solidcommunity.net/profile/card#me" value={input}
            onChange={(e) => { setInput(e.target.value); setFormError(""); }} />
          <button className="btn" disabled={busy || !input.trim()}>{busy ? "Checking…" : "Follow"}</button>
        </div>
        {formError && <p style={{ color: "var(--coral-lip)", marginTop: 8 }}>{formError}</p>}
      </form>

      {/* Loading / error / empty states */}
      {error && <ErrorBox onRetry={load}>Couldn't load your friend list. {error}</ErrorBox>}
      {!error && friends === null && <Loading text="Loading your friends…" />}
      {friends?.length === 0 && <p className="muted">You're not following anyone yet.</p>}

      {/* One tile per friend, each showing that friend's public decks */}
      {friends?.map((friend) => (
        <FriendTile key={friend} webId={friend} onUnfollow={() => unfollow(friend)} onPreview={onPreview} onStudy={onStudy} />
      ))}
    </>
  );
}

// One friend: their WebID, an Unfollow button, and their public decks (loaded from their pod).
function FriendTile({ webId, onUnfollow, onPreview, onStudy }) {
  const [decks, setDecks] = useState(null); // null while loading
  const [error, setError] = useState("");

  useEffect(() => {
    setDecks(null);
    setError("");
    listFriendDecks(webId).then(setDecks).catch((e) => setError(e.message));
  }, [webId]);

  return (
    <div className="tile">
      <div className="spread">
        <div>
          {/* Username = first part of the address, same as the "Logged in as" name; the full WebID stays visible below */}
          <h3>{new URL(webId).hostname.split(".")[0]}</h3>
          <p className="muted friend-id">{webId}</p>
        </div>
        <button className="btn btn-ghost btn-small" onClick={onUnfollow}>Unfollow</button>
      </div>

      {error && <p style={{ color: "var(--coral-lip)" }}>Couldn't load their decks. {error}</p>}
      {!error && decks === null && <p className="muted">Loading their decks…</p>}
      {decks?.length === 0 && <p className="muted">No public decks yet.</p>}

      {decks?.map((d) => (
        <div key={d.url} className="friend-deck">
          <div className="deck-info">
            <strong>{d.name}</strong>
            <p className="muted">{d.cardCount} card{d.cardCount === 1 ? "" : "s"}</p>
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-small" onClick={() => onPreview(d.url)}>View</button>
            <button className="btn btn-amber btn-small" disabled={d.cardCount === 0} onClick={() => onStudy(d.url)}>▶ Study</button>
          </div>
        </div>
      ))}
    </div>
  );
}
