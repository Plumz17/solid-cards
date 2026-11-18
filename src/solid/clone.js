import { copyDeckImage, loadDeck, saveDeck, newDeckUrl } from "./pod.js";

// Copy a deck into my own container; the original is untouched.
export async function cloneDeck(sourceUrl, myContainerUrl) {
  const source = await loadDeck(sourceUrl);
  // The copy goes into a new folder in my own pod; its images are copied there one by one.
  const url = await newDeckUrl(myContainerUrl, source.name);
  const cards = [];
  for (const card of source.cards) {
    cards.push({
      ...card,
      image: card.image ? await copyDeckImage(card.image, url) : undefined,
      backImage: card.backImage ? await copyDeckImage(card.backImage, url) : undefined,
    });
  }
  // Same deck, but with the copied cards, a new creation date and a pointer back to the original.
  await saveDeck(url, {
    ...source,
    cards,
    dateCreated: new Date().toISOString().slice(0, 10),
    isBasedOn: sourceUrl + "#deck",
  });
  return url;
}
