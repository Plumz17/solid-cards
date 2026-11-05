// App = the controller. It holds who is logged in, which screen is showing, and the toast message.
// The screens themselves live in src/views/.
import { useEffect, useState } from "react";
import { ensureDecksContainer } from "./solid/pod.js";
import { Icon } from "./components.jsx";
import MyDecks from "./views/MyDecks.jsx";
import DeckEditor from "./views/DeckEditor.jsx";
import DeckPreview from "./views/DeckPreview.jsx";
import Study from "./views/Study.jsx";
import Login from "./views/Login.jsx";

// Mock account until real login exists.
const MOCK_USER = { webId: "https://anders.solidcommunity.net/profile/card#me", name: "anders" };

// Which screen is showing: { name: "list" | "edit" | "preview" | "study", url, from }
// Opening an app link (?deck=...) starts on the preview.
export default function App() {
  // --- Things the app remembers (changing one redraws the screen) ---
  const [user, setUser] = useState(null);           // null = logged out
  const [container, setContainer] = useState(null); // URL of the user's decks folder (null until loaded)
  const [view, setView] = useState(() => {          // which screen is showing
    const deck = new URLSearchParams(window.location.search).get("deck"); // the ?deck=... part of the address
    return deck ? { name: "preview", url: deck } : { name: "list", url: null, from: null };
  });
  const [toast, setToast] = useState("");           // pop-up message ("" = hidden)

  // When someone logs in, find their decks folder in the pod.
  useEffect(() => {
    if (user) ensureDecksContainer(user.webId).then(setContainer);
  }, [user]);

  // Forget the user and go back to the start.
  function logOut() {
    setUser(null);
    setContainer(null);
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

  return (
    <>
      {/* Top bar: logo (goes to the list) and, when logged in, the user name + Log out */}
      <div className="topbar">
        <button className="logo" onClick={() => go("list")}><span className="logo-mark"><Icon name="card" /></span>SolidCard</button>
        {user && (
          <span className="user">Logged in as {user.name} <button className="btn btn-ghost btn-small" onClick={logOut}>Log out</button></span>
        )}
      </div>

      {/* Logged out: login screen, or a read-only preview if a deck link was opened */}
      {!user && view.name !== "preview" && <Login onLogin={() => setUser(MOCK_USER)} />}
      {!user && view.name === "preview" && (
        <DeckPreview deckUrl={view.url} container={null} loggedIn={false} onBack={() => go("list")} notify={notify} />
      )}

      {/* Logged in: show the screen named in `view` (each callback below just calls go) */}
      {container && view.name === "list" && (
        <MyDecks container={container} onOpen={(u) => go("edit", u)} onNew={() => go("edit")} onPreview={(u) => go("preview", u)} onStudy={(u) => go("study", u)} />
      )}
      {/* key = deck URL, so switching decks starts a fresh editor */}
      {container && view.name === "edit" && (
        <DeckEditor key={view.url} container={container} deckUrl={view.url} onOpen={(u) => go("edit", u)} onStudy={(u) => go("study", u)} onBack={() => go("list")} notify={notify} />
      )}
      {container && view.name === "preview" && (
        <DeckPreview deckUrl={view.url} container={container} loggedIn={true} onBack={() => go("list")} onOpen={(u) => go("edit", u)} onStudy={(u) => go("study", u)} notify={notify} />
      )}
      {container && view.name === "study" && <Study deckUrl={view.url} onBack={back} />}

      {/* Pop-up message */}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
