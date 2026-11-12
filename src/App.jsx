// App = the controller. It holds who is logged in, which screen is showing, and the toast message.
// The screens themselves live in src/views/.
import { useEffect, useState } from "react";
import { getSession, logout, takeSavedDeck } from "./solid/auth.js";
import { ensureDecksContainer } from "./solid/pod.js";
import MyDecks from "./views/MyDecks.jsx";
import DeckEditor from "./views/DeckEditor.jsx";
import DeckPreview from "./views/DeckPreview.jsx";
import Study from "./views/Study.jsx";
import Login from "./views/Login.jsx";
import { ErrorBox, Loading } from "./components.jsx";

// Which screen is showing: { name: "list" | "edit" | "preview" | "study", url, from }
// Opening an app link (?deck=...) starts on the preview.
export default function App() {
  // --- Things the app remembers (changing one redraws the screen) ---
  const [checking, setChecking] = useState(true);  // true until we know whether the user is logged in
  const [user, setUser] = useState(null);           // null = logged out, else { webId, name }
  const [container, setContainer] = useState(null); // URL of the user's decks folder (null until loaded)
  const [containerError, setContainerError] = useState(""); // message if the decks folder could not be opened
  const [attempt, setAttempt] = useState(0);        // bumped by "Try again" to reload the decks folder
  const [view, setView] = useState(() => {          // which screen is showing
    const deck = new URLSearchParams(window.location.search).get("deck"); // the ?deck=... part of the address
    return deck ? { name: "preview", url: deck } : { name: "list", url: null, from: null };
  });
  const [toast, setToast] = useState("");           // pop-up message ("" = hidden)

  // At startup: finish a login in progress or restore an earlier one.
  useEffect(() => {
    getSession().then((session) => {
      if (session.loggedIn) {
        setUser(session);
        // The login redirect dropped the deck link; open the deck the user was looking at.
        const deck = takeSavedDeck();
        if (deck) setView({ name: "preview", url: deck });
      }
      setChecking(false);
    });
  }, []);

  // When someone logs in, find their decks folder in the pod.
  useEffect(() => {
    if (!user) return;
    let active = true; // set to false on cleanup, so an answer arriving after logout is ignored
    setContainer(null);
    setContainerError("");
    ensureDecksContainer(user.webId)
      .then((url) => { if (active) setContainer(url); })
      .catch((error) => { if (active) setContainerError(error.message); });
    return () => { active = false; };
  }, [user, attempt]);

  // Forget the user and go back to the start.
  async function logOut() {
    await logout();
    setUser(null);
    setContainer(null);
    setContainerError("");
    setView({ name: "list", url: null, from: null });
  }

  // Show a pop-up message for 2.5 seconds.
  function notify(text) {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  }

  // Switch screen, remembering the current one so "back" can return to it.
  const go = (name, url = null) => setView({ name, url, from: view });
  const back = () => setView(view.from ?? { name: "list", url: null, from: null });

  // Previews and study only read a deck, so they work without a decks folder (and when logged out).
  const readOnly = view.name === "preview" || view.name === "study";

  return (
    <>
      {/* Top bar: logo (goes to the list) and, when logged in, the user name + Log out */}
      <div className="topbar">
        <button className="logo" onClick={() => go("list")}><img className="logo-mark" src={import.meta.env.BASE_URL + "logo.svg"} alt="" />SolidCard</button>
        {user && (
          <span className="user"><span className="user-name">Logged in as {user.name}</span><button className="btn btn-ghost btn-small" onClick={logOut}>Log out</button></span>
        )}
      </div>

      {/* Still checking the session */}
      {checking && <Loading text="Checking your login…" />}

      {/* Logged out: login screen (a deck link goes straight to the read-only screens below) */}
      {!checking && !user && !readOnly && <Login />}

      {/* Logged in: waiting for, or failed to open, the decks folder (only the list and editor need it) */}
      {user && !readOnly && !container && !containerError && <Loading text="Opening your pod…" />}
      {user && !readOnly && containerError && <ErrorBox onRetry={() => setAttempt(attempt + 1)}>{containerError}</ErrorBox>}

      {/* Screens that need the decks folder */}
      {container && view.name === "list" && (
        <MyDecks container={container} onOpen={(u) => go("edit", u)} onNew={() => go("edit")} onPreview={(u) => go("preview", u)} onStudy={(u) => go("study", u)} />
      )}
      {/* key = deck URL, so switching decks starts a fresh editor */}
      {container && view.name === "edit" && (
        <DeckEditor key={view.url} container={container} deckUrl={view.url} onOpen={(u) => go("edit", u)} onStudy={(u) => go("study", u)} onBack={() => go("list")} notify={notify} />
      )}

      {/* Read-only screens: work logged out too (Clone needs the decks folder, so it stays disabled without one) */}
      {!checking && view.name === "preview" && (
        <DeckPreview deckUrl={view.url} container={container} loggedIn={!!user} onBack={() => go("list")} onOpen={(u) => go("edit", u)} onStudy={(u) => go("study", u)} notify={notify} />
      )}
      {!checking && view.name === "study" && <Study deckUrl={view.url} onBack={back} />}

      {/* Pop-up message */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
