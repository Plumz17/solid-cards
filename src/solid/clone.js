import { loadDeck, saveDeck, newDeckUrl } from "./pod.js";

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
  await saveDeck(url, copy);
  return url;
}
