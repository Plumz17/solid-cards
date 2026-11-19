import { getPublicAccess, setPublicAccess } from "@inrupt/solid-client/universal";
import { getSolidFetch } from "./auth.js";
import { syncDeckImagesAccess } from "./pod.js";
import { editList } from "./list.js";

// Visibility is the file's permission in the pod, not something stored in the deck.
// Is the deck readable by everyone? -> "public" or "private"
export async function getVisibility(deckUrl) {
  const access = await getPublicAccess(deckUrl, { fetch: getSolidFetch() });
  // Ask the pod what "everyone" may do with this file: { read, write, append }, or null if it can't be read.
  if (!access) throw new Error("Couldn't read this deck's sharing permissions.");
  return access.read ? "public" : "private";
}

// Make the deck public (everyone can read, nobody else can change it) or private (owner only).
export async function setVisibility(deckUrl, mode) {
  const fetch = getSolidFetch();
  // Images first, so a public deck never shows broken images.
  await syncDeckImagesAccess(deckUrl, mode === "public");
  const updateDeckAccess = async () => {
    // read = true only for public; write and append are always false, so nobody else can edit the deck.
    const access = await setPublicAccess(deckUrl, {
      read: mode === "public",
      write: false,
      append: false,
    }, { fetch });
    if (!access) throw new Error("The pod did not allow this deck's sharing permissions to be changed.");
  };

  await updateDeckAccess();
  // Keep the public index in step, so friends who follow me can find this deck.
  if (mode === "public") await addToIndex(deckUrl);
  else await removeFromIndex(deckUrl);
}

// The public index: <pod>/solidcard/public.ttl lists my public decks. A friend can't open my decks
// folder (it is private), so they read this one public file instead. It sits next to the decks folder: deck = <pod>/solidcard/decks/<name>/<name>.ttl, so two levels up.
const HAS_PART = "https://schema.org/hasPart";
const indexUrl = (deckUrl) => new URL("../../public.ttl", deckUrl).href;

// Put a deck on the index. The index file itself must be readable by everyone, or friends can't see it.
async function addToIndex(deckUrl) {
  await editList(indexUrl(deckUrl), HAS_PART, deckUrl, true);
  await setPublicAccess(indexUrl(deckUrl), { read: true, write: false, append: false }, { fetch: getSolidFetch() });
}

// Take a deck off the index (also used when a deck is deleted).
export async function removeFromIndex(deckUrl) {
  await editList(indexUrl(deckUrl), HAS_PART, deckUrl, false);
}

// App link = this site + ?deck=<encoded deck file URL>
export function buildLink(deckUrl) {
  return window.location.origin + import.meta.env.BASE_URL + "?deck=" + encodeURIComponent(deckUrl);
}

// Accepts an app link or a raw deck URL; returns the deck file URL, or null.
export function parseLink(text) {
  try {
    const url = new URL(text.trim());
    const target = new URL(url.searchParams.get("deck") ?? url.href);
    target.hash = ""; // the file is fetched without "#deck"; pod.js adds it back when reading
    return target.href;
  } catch {
    return null;
  }
}
