// Real Solid login. This is the only file that talks to the authentication library.
import { login as solidLogin, logout as solidLogout, handleIncomingRedirect, getDefaultSession } from "@inrupt/solid-client-authn-browser";
import { APP_NAME, REDIRECT_URL } from "./config.js";

// The login redirect drops "?deck=..." from the address, so we keep it here meanwhile.
const SAVED_DECK = "solidcard-deck";

// Call once when the app starts. If we just came back from the provider, this finishes the login;
// if the user logged in earlier, it restores that session. -> { loggedIn, webId?, name? }
export async function getSession() {
  await handleIncomingRedirect({ restorePreviousSession: true });
  const info = getDefaultSession().info;
  if (!info.isLoggedIn) return { loggedIn: false };
  // WebID looks like https://alice.solidcommunity.net/profile/card#me; "alice" is the display name.
  return { loggedIn: true, webId: info.webId, name: new URL(info.webId).hostname.split(".")[0] };
}

// The fetch to use for every pod request: it sends the user's login when there is one,
// and works as a plain request when logged out (enough for public decks).
export function getSolidFetch() {
  const session = getDefaultSession();
  return session.fetch.bind(session);
}

// Send the user to their provider to log in (the page leaves; getSession finishes the job on return).
// `issuer` is the provider address, e.g. https://solidcommunity.net
export async function login(issuer) {
  const deck = new URLSearchParams(window.location.search).get("deck");
  if (deck) sessionStorage.setItem(SAVED_DECK, deck);
  await solidLogin({ oidcIssuer: issuer, redirectUrl: REDIRECT_URL, clientName: APP_NAME });
}

// Deck link saved before login, or null. Reading it also forgets it, so it is used only once.
export function takeSavedDeck() {
  const deck = sessionStorage.getItem(SAVED_DECK);
  sessionStorage.removeItem(SAVED_DECK);
  return deck;
}

// Log out of this app only (the user stays logged in at their provider).
export async function logout() {
  await solidLogout();
}
