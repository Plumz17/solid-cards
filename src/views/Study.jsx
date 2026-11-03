import { useEffect, useState } from "react";
import { loadDeck } from "../solid/pod.js";
import { Loading, Empty, ErrorBox, FlipCard, Icon } from "../components.jsx";

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Study one deck, one card at a time. Progress lives in memory only; nothing is written to the pod.
// "Again" sends the card to the back of the queue; the round ends when the queue is empty.
export default function Study({ deckUrl, onBack }) {
  const [deck, setDeck] = useState(null);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState([]);   // card indexes still to learn
  const [flipped, setFlipped] = useState(false);
  const [misses, setMisses] = useState(0);
  const [step, setStep] = useState(0);    // changes per card so each one is a fresh element (deals in unflipped)

  const start = (d) => { setQueue(shuffle(d.cards.map((_, i) => i))); setFlipped(false); setMisses(0); };

  useEffect(() => {
    loadDeck(deckUrl).then((d) => { setDeck(d); start(d); }).catch((e) => setError(e.message));
  }, [deckUrl]);

  function answer(gotIt) {
    const [first, ...rest] = queue;
    setQueue(gotIt ? rest : [...rest, first]);
    if (!gotIt) setMisses(misses + 1);
    setFlipped(false);
    setStep(step + 1);
  }

  if (error) return <ErrorBox onRetry={onBack}>{error}</ErrorBox>;
  if (!deck) return <Loading text="Getting your cards…" />;
  if (deck.cards.length === 0) return <Empty title="No cards to study">Add some cards to this deck first.</Empty>;

  const total = deck.cards.length;
  const learned = total - queue.length;
  const card = deck.cards[queue[0]];

  return (
    <>
      <button className="btn btn-ghost btn-small" onClick={onBack}>← Exit</button>
      <h1 style={{ marginTop: 16 }}>{deck.name}</h1>

      <div className="progress" aria-label={`${learned} of ${total} learned`}>
        <div className="progress-fill" style={{ width: `${(learned / total) * 100}%` }} />
      </div>
      <p className="muted">{learned} / {total} learned</p>

      {queue.length === 0 ? (
        <div className="tile message">
          <span className="message-icon"><Icon name="star" /></span>
          <h2>Round complete!</h2>
          <p className="muted">{misses === 0 ? "You got every card first try." : `You needed ${misses} extra ${misses === 1 ? "try" : "tries"}.`}</p>
          <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={onBack}>Done</button>
            <button className="btn btn-amber" onClick={() => start(deck)}>Study again</button>
          </div>
        </div>
      ) : (
        <>
          <FlipCard key={step} tall deal front={card.front} back={card.back} flipped={flipped} onFlip={() => setFlipped(!flipped)} />
          <div className="segmented">
            <button className="btn btn-coral" disabled={!flipped} onClick={() => answer(false)}>Again</button>
            <button className="btn" disabled={!flipped} onClick={() => answer(true)}>Got it</button>
          </div>
        </>
      )}
    </>
  );
}
