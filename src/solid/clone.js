import { loadDeck, saveDeck, newDeckUrl } from "./pod.js";

// Copy a deck into my own container as a separate file; original is untouched.
export async function cloneDeck(sourceUrl, myContainerUrl) {
  const source = await loadDeck(sourceUrl);
  const copy = {
    ...source,
    dateCreated: new Date().toISOString().slice(0, 10),
    isBasedOn: sourceUrl + "#deck",
  };
  const url = await newDeckUrl(myContainerUrl, source.name);
  await saveDeck(url, copy);
  return url;
}
