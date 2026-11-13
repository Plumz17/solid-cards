import { copyDeckImage, loadDeck, saveDeck, newDeckUrl } from "./pod.js";

// Copy a deck into my own container; the original is untouched.
export async function cloneDeck(sourceUrl, myContainerUrl) {
  const source = await loadDeck(sourceUrl);
  // Same cards, but with a new creation date and a pointer back to the original.
  const copy = {
    ...source,
    dateCreated: new Date().toISOString().slice(0, 10),
    isBasedOn: sourceUrl + "#deck",
  };
  // Write the copy as a new file in my own pod.
  const url = await newDeckUrl(myContainerUrl, source.name);
  copy.cards = [];
  for (const card of source.cards) {
    copy.cards.push({
      ...card,
      image: card.image ? await copyDeckImage(card.image, url) : undefined,
      backImage: card.backImage ? await copyDeckImage(card.backImage, url) : undefined,
    });
  }
  await saveDeck(url, copy);
  return url;
}
