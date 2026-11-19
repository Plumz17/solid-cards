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

// Background music. We use Web Audio instead of an <audio> tag because it repeats with no gap.
// The file is downloaded once and decoded into a "buffer" (the sound, ready to play).
const audioContext = new AudioContext();
const musicBuffer = fetch(import.meta.env.BASE_URL + "music.ogg")
  .then((response) => response.arrayBuffer())
  .then((data) => audioContext.decodeAudioData(data));

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
  const [musicOn, setMusicOn] = useState(true);  // setup option: play background music during the round
  const [limit, setLimit] = useState("");       // setup option: max cards this round ("" = all)
  const [roundSize, setRoundSize] = useState(0); // how many cards this round has (the limit can make it less than the deck)
  const [seconds, setSeconds] = useState(0);     // time spent in this round
  const [queue, setQueue] = useState([]);   // card indexes still to learn
  const [flipped, setFlipped] = useState(false); // is the current card showing its back?
  const [misses, setMisses] = useState(0);  // how many times "Again" was pressed
  const [step, setStep] = useState(0);      // changes per card so each one is a fresh element (deals in unflipped)

  // "Start" button: put the cards into the queue (shuffled unless in order), keep only the first
  // "limit" of them (so shuffled = a random few, in order = the first few), and reset the counters.
  const start = () => {
    const indexes = deck.cards.map((_, i) => i);
    const picked = (inOrder ? indexes : shuffle(indexes)).slice(0, Number(limit) || indexes.length);
    setQueue(picked);
    setRoundSize(picked.length);
    setFlipped(false);
    setMisses(0);
    setSeconds(0);
    setStep(step + 1);
    setPhase("playing");
  };

  // Play the music only while cards are being studied and the Music setting is On. Pressing Start is a
  // click, so the browser allows the sound. The cleanup stops it when the round ends or the screen closes.
  const studying = phase === "playing" && queue.length > 0 && musicOn;
  useEffect(() => {
    if (!studying) return;
    let source;
    let cancelled = false; // true if the round ended before the music finished loading
    musicBuffer.then((buffer) => {
      if (cancelled) return;
      audioContext.resume();                       // browsers keep sound off until the user has clicked
      source = audioContext.createBufferSource();  // a "player" for the buffer; a new one per round = starts at 0:00
      source.buffer = buffer;
      source.loop = true;
      source.connect(audioContext.destination);    // destination = the speakers
      source.start();
    }).catch(() => {});
    return () => {
      cancelled = true;
      source?.stop();
    };
  }, [studying]);

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
          {/* Order: the selected button is the filled one */}
          <label>Card order</label>
          <div className="segmented">
            <button className={inOrder ? "btn btn-ghost" : "btn"} onClick={() => setInOrder(false)}>Shuffle</button>
            <button className={inOrder ? "btn" : "btn btn-ghost"} onClick={() => setInOrder(true)}>Deck order</button>
          </div>

          {/* Limit: leave empty to study every card */}
          <label htmlFor="limit">Number of cards</label>
          <input id="limit" type="number" min="1" max={deck.cards.length} placeholder={`All (${deck.cards.length})`} value={limit}
            onChange={(e) => setLimit(e.target.value)} />

          {/* Timer: on = show the stopwatch during the round and the final time at the end */}
          <label>Timer</label>
          <div className="segmented">
            <button className={timerOn ? "btn" : "btn btn-ghost"} onClick={() => setTimerOn(true)}>On</button>
            <button className={timerOn ? "btn btn-ghost" : "btn"} onClick={() => setTimerOn(false)}>Off</button>
          </div>

          {/* Music: on = background music plays during the round */}
          <label>Music</label>
          <div className="segmented">
            <button className={musicOn ? "btn" : "btn btn-ghost"} onClick={() => setMusicOn(true)}>On</button>
            <button className={musicOn ? "btn btn-ghost" : "btn"} onClick={() => setMusicOn(false)}>Off</button>
          </div>
        </div>

        <button className="btn btn-amber" style={{ width: "100%" }} onClick={start}>▶ Start</button>
      </>
    );
  }

  // Round screen: progress, timer, then either the current card or the "Round complete" message.
  const total = roundSize;              // cards in this round (may be fewer than the deck)
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
