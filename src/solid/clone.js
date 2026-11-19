import { copyDeckImages, loadDeck, saveDeck, newDeckUrl } from "./pod.js";

// Copy a deck into my own container; the original is untouched.
export async function cloneDeck(sourceUrl, myContainerUrl) {
  const source = await loadDeck(sourceUrl);
  // The copy goes into a new folder in my own pod.
  const url = await newDeckUrl(myContainerUrl, source.name);
  const imageUrls = source.cards.flatMap((card) => [card.image, card.backImage].filter(Boolean));
  const copiedImageUrls = await copyDeckImages(imageUrls, url);
  let copiedImageIndex = 0;
  const cards = source.cards.map((card) => ({
    ...card,
    image: card.image ? copiedImageUrls[copiedImageIndex++] : undefined,
    backImage: card.backImage ? copiedImageUrls[copiedImageIndex++] : undefined,
  }));
  // Same deck, but with the copied cards, a new creation date and a pointer back to the original.
  await saveDeck(url, {
    ...source,
    cards,
    dateCreated: new Date().toISOString().slice(0, 10),
    isBasedOn: sourceUrl + "#deck",
  });
  return url;
}
