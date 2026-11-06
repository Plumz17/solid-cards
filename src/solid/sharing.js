import { getPublicAccess, setPublicAccess } from "@inrupt/solid-client/universal";
import { getSolidFetch } from "./auth.js";

export async function getVisibility(deckUrl) {
  const access = await getPublicAccess(deckUrl, { fetch: getSolidFetch() });
  if (!access) throw new Error("Couldn't read this deck's sharing permissions.");
  return access.read ? "public" : "private";
}

export async function setVisibility(deckUrl, mode) {
  const access = await setPublicAccess(deckUrl, {
    read: mode === "public",
    write: false,
    append: false,
  }, { fetch: getSolidFetch() });
  if (!access) throw new Error("The pod did not allow this deck's sharing permissions to be changed.");
}

// App link = this site + ?deck=<encoded deck file URL>
export function buildLink(deckUrl) {
  return window.location.origin + import.meta.env.BASE_URL + "?deck=" + encodeURIComponent(deckUrl);
}

// Accepts an app link or a raw deck URL; returns the deck file URL, or null.
export function parseLink(text) {
  try {
    const url = new URL(text.trim());
    return url.searchParams.get("deck") ?? url.href;
  } catch {
    return null;
  }
}
