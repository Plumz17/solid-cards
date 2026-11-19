import { findStorage, loadDeck } from "./pod.js";
import { readList, editList } from "./list.js";

// Friends: the people I follow. Everything here is plain files in pods, no server.
//  - My friend list is <my pod>/solidcard/following.ttl (private, only I can read it).
//    It is a list of WebIDs, stored with the "knows" relation from the FOAF vocabulary.
//  - A friend's public decks are found through THEIR public index (<their pod>/solidcard/public.ttl,
//    written by sharing.js whenever they make a deck public).

const KNOWS = "http://xmlns.com/foaf/0.1/knows";

// The friend list sits next to the decks folder: <pod>/solidcard/decks/ -> <pod>/solidcard/following.ttl
const followingUrl = (container) => new URL("../following.ttl", container).href;

// Who do I follow? -> [WebID, ...]
export function listFollowing(container) {
  return readList(followingUrl(container), KNOWS);
}

// Follow someone by WebID. Checks the WebID first, so typos are caught before anything is saved.
export async function followUser(container, text) {
  let webId;
  try {
    webId = new URL(text.trim()).href;
  } catch {
    throw new Error("That doesn't look like a WebID. It should look like https://name.solidcommunity.net/profile/card#me");
  }
  if (!["http:", "https:"].includes(new URL(webId).protocol)) {
    throw new Error("A WebID must use HTTP or HTTPS.");
  }
  try {
    await findStorage(webId); // can we read this profile, and does it point to a pod?
  } catch {
    throw new Error("Couldn't find a Solid profile at that WebID. Check the address.");
  }
  await editList(followingUrl(container), KNOWS, webId, true);
  return webId;
}

// Stop following someone.
export async function unfollowUser(container, webId) {
  await editList(followingUrl(container), KNOWS, webId, false);
}

// The public decks of one friend. -> [{ url, name, cardCount }]
export async function listFriendDecks(webId) {
  // Find their pod from their profile, then open their public index.
  const storage = await findStorage(webId);
  let urls;
  try {
    urls = await readList(new URL("solidcard/public.ttl", storage).href, "https://schema.org/hasPart");
  } catch (error) {
    // A pod can answer 401/403 (not 404) for a file we may not see, and a missing index is also
    // "not readable" to a stranger. Either way: nothing public to show.
    const status = error.response?.status;
    if (status === 401 || status === 403) return [];
    throw new Error("Couldn't reach their pod. Try again later.");
  }

  // Open each deck. loadDeck needs no login for a public deck; one that fails (e.g. deleted) is skipped.
  const results = await Promise.allSettled(urls.map(async (url) => {
    const deck = await loadDeck(url);
    return { url, name: deck.name, cardCount: deck.cards.length };
  }));
  return results.filter((r) => r.status === "fulfilled").map((r) => r.value);
}
