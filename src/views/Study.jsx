import { useEffect, useState } from "react";
import { loadDeck } from "../solid/pod.js";
import { Loading, Empty, ErrorBox, FlipCard, Icon } from "../components.jsx";

// Returns a shuffled copy of the list (Fisher-Yates: swap each item with a random earlier one).
const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// 95 seconds -> "1:35"
const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Study one deck, one card at a time. Progress lives in memory only; nothing is written to the pod.
// First a setup screen (order + timer), then the round. "Again" sends the card to the back of the queue;
// the round ends when the queue is empty.
export default function Study({ deckUrl, onBack }) {
  const [deck, setDeck] = useState(null);   // the loaded deck (null while loading)
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("setup"); // "setup" = choose options, "playing" = studying
  const [inOrder, setInOrder] = useState(false); // setup option: true = deck's own order instead of shuffled
  const [timerOn, setTimerOn] = useState(true);  // setup option: show a count-up stopwatch
  const [seconds, setSeconds] = useState(0);     // time spent in this round
  const [queue, setQueue] = useState([]);   // card indexes still to learn
  const [flipped, setFlipped] = useState(false); // is the current card showing its back?
  const [misses, setMisses] = useState(0);  // how many times "Again" was pressed
  const [step, setStep] = useState(0);      // changes per card so each one is a fresh element (deals in unflipped)

  // "Start" button: put all cards into the queue (shuffled unless in order) and reset the counters.
  const start = () => {
    const indexes = deck.cards.map((_, i) => i);
    setQueue(inOrder ? indexes : shuffle(indexes));
    setFlipped(false);
    setMisses(0);
    setSeconds(0);
    setStep(step + 1);
    setPhase("playing");
  };

  // Load the deck; the round starts when the user presses Start.
  useEffect(() => {
    loadDeck(deckUrl).then(setDeck).catch((e) => setError(e.message));
  }, [deckUrl]);

  // Stopwatch: tick once a second while a round is running. It stops when the queue is empty,
  // so the final time stays on screen.
  const running = phase === "playing" && timerOn && queue.length > 0;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id); // stop the old timer when the round ends or the screen closes
  }, [running]);

  // "Got it" removes the card from the queue; "Again" moves it to the back.
  function answer(gotIt) {
    const [first, ...rest] = queue;
    setQueue(gotIt ? rest : [...rest, first]);
    if (!gotIt) setMisses(misses + 1);
    setFlipped(false);
    setStep(step + 1);
  }

  // Error, loading and empty-deck screens.
  if (error) return <ErrorBox onRetry={onBack}>{error}</ErrorBox>;
  if (!deck) return <Loading text="Getting your cards…" />;
  if (deck.cards.length === 0) return <Empty title="No cards to study">Add some cards to this deck first.</Empty>;

  // Setup screen: choose the order and the timer, then start.
  if (phase === "setup") {
    return (
      <>
        <button className="btn btn-ghost btn-small" onClick={onBack}>← Exit</button>
        <h1 style={{ marginTop: 16 }}>{deck.name}</h1>
        <p className="muted">{deck.cards.length} card{deck.cards.length === 1 ? "" : "s"}</p>

        <div className="tile">
          <label>Card order</label>
          <div className="segmented">
            <button className={inOrder ? "btn btn-ghost" : "btn"} onClick={() => setInOrder(false)}>Shuffle</button>
            <button className={inOrder ? "btn" : "btn btn-ghost"} onClick={() => setInOrder(true)}>Deck order</button>
          </div>

          <label>Timer</label>
          <div className="segmented">
            <button className={timerOn ? "btn" : "btn btn-ghost"} onClick={() => setTimerOn(true)}>On</button>
            <button className={timerOn ? "btn btn-ghost" : "btn"} onClick={() => setTimerOn(false)}>Off</button>
          </div>
        </div>

        <button className="btn btn-amber" style={{ width: "100%" }} onClick={start}>▶ Start</button>
      </>
    );
  }

  const total = deck.cards.length;
  const learned = total - queue.length;  // cards already answered "Got it"
  const card = deck.cards[queue[0]];     // the card to show now

  return (
    <>
      <button className="btn btn-ghost btn-small" onClick={onBack}>← Exit</button>
      <h1 style={{ marginTop: 16 }}>{deck.name}</h1>

      {/* Progress bar: width = learned / total */}
      <div className="progress" aria-label={`${learned} of ${total} learned`}>
        <div className="progress-fill" style={{ width: `${(learned / total) * 100}%` }} />
      </div>
      <div className="spread" style={{ alignItems: "center" }}>
        <p className="muted">{learned} / {total} learned</p>
        {timerOn && <p className="muted">⏱ {formatTime(seconds)}</p>}
      </div>

      {queue.length === 0 ? (
        // Queue empty = round finished
        <div className="tile message">
          <span className="message-icon"><Icon name="star" /></span>
          <h2>Round complete!</h2>
          <p className="muted">
            {misses === 0 ? "You got every card first try." : `You needed ${misses} extra ${misses === 1 ? "try" : "tries"}.`}
            {timerOn && ` Time: ${formatTime(seconds)}.`}
          </p>
          <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={onBack}>Done</button>
            <button className="btn btn-amber" onClick={() => setPhase("setup")}>Study again</button>
          </div>
        </div>
      ) : (
        // Still cards left: show the current card and the answer buttons (enabled after flipping)
        <>
          <FlipCard key={step} tall deal front={card.front} back={card.back} image={card.image} backImage={card.backImage} flipped={flipped} onFlip={() => setFlipped(!flipped)} />
          <div className="segmented">
            <button className="btn btn-coral" disabled={!flipped} onClick={() => answer(false)}>Again</button>
            <button className="btn" disabled={!flipped} onClick={() => answer(true)}>Got it</button>
          </div>
        </>
      )}
    </>
  );
}
