import { useEffect, useState } from "react";
import { ensureDecksContainer } from "./solid/pod.js";
import { Icon } from "./components.jsx";
import MyDecks from "./views/MyDecks.jsx";
import DeckEditor from "./views/DeckEditor.jsx";
import DeckPreview from "./views/DeckPreview.jsx";
import Study from "./views/Study.jsx";

// Fake session until real login exists (login screen comes after the auth meeting).
const FAKE_USER = { loggedIn: true, name: "anders" };

// Which screen is showing: { name: "list" | "edit" | "preview" | "study", url, from }
// Opening an app link (?deck=...) starts on the preview.
export default function App() {
  const [container, setContainer] = useState(null);
  const [view, setView] = useState(() => {
    const deck = new URLSearchParams(window.location.search).get("deck");
    return deck ? { name: "preview", url: deck } : { name: "list", url: null, from: null };
  });
  const [toast, setToast] = useState("");

  useEffect(() => { ensureDecksContainer(FAKE_USER.name).then(setContainer); }, []);

  function notify(text) {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  }

  const go = (name, url = null) => setView({ name, url, from: view });
  const back = () => setView(view.from ?? { name: "list", url: null, from: null });

  return (
    <>
      <div className="topbar">
        <button className="logo" onClick={() => go("list")}><span className="logo-mark"><Icon name="card" /></span>SolidCard</button>
        <span className="user">Logged in as {FAKE_USER.name}</span>
      </div>

      {container && view.name === "list" && (
        <MyDecks container={container} onOpen={(u) => go("edit", u)} onNew={() => go("edit")} onPreview={(u) => go("preview", u)} onStudy={(u) => go("study", u)} />
      )}
      {container && view.name === "edit" && (
        <DeckEditor key={view.url} container={container} deckUrl={view.url} onOpen={(u) => go("edit", u)} onStudy={(u) => go("study", u)} onBack={() => go("list")} notify={notify} />
      )}
      {container && view.name === "preview" && (
        <DeckPreview deckUrl={view.url} container={container} loggedIn={FAKE_USER.loggedIn} onBack={() => go("list")} onOpen={(u) => go("edit", u)} onStudy={(u) => go("study", u)} notify={notify} />
      )}
      {container && view.name === "study" && <Study deckUrl={view.url} onBack={back} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
