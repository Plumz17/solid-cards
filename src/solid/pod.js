import {
  buildThing,
  createContainerAt,
  createSolidDataset,
  deleteFile,
  getContainedResourceUrlAll,
  getDate,
  getInteger,
  getSolidDataset,
  getStringNoLocale,
  getThing,
  getThingAll,
  getUrl,
  getUrlAll,
  removeThing,
  saveSolidDatasetAt,
  setThing,
} from "@inrupt/solid-client";
import { getSolidFetch } from "./auth.js";

// Pod access: the only place decks are read from and written to the pod. Everything returned to the
// screens is a plain object; the Turtle/RDF details stay inside this file.
// Deck shape: { name, description, dateCreated, isBasedOn?, cards: [{ front, back }] }

const STORAGE = "http://www.w3.org/ns/pim/space#storage"; // profile field that points to the pod root
const SCHEMA = "https://schema.org/";                     // vocabulary used for decks and cards
const DECK_SUFFIX = "#deck";                              // the deck itself is the "#deck" entry of its file

// Does something exist at this URL? true = yes, false = 404, anything else (e.g. 403) is an error.
async function resourceExists(url, fetch) {
  let response = await fetch(url, { method: "HEAD" });
  if (response.status === 405 || response.status === 501) {
    response = await fetch(url, { headers: { Accept: "text/turtle" } });
  }
  if (response.ok) return true;
  if (response.status === 404) return false;
  throw new Error(`Couldn't access pod resource ${url}: ${response.status} ${response.statusText}`);
}

// Create the folder at `url` unless it already exists.
async function ensureContainer(url, fetch) {
  if (await resourceExists(url, fetch)) return;
  await createContainerAt(url, { fetch });
}

// Find the user's pod and make sure <pod>/solidcard/decks/ exists. -> URL of the decks folder
export async function ensureDecksContainer(webId) {
  const fetch = getSolidFetch();
  // Read the profile document and look up where the pod's root folder is.
  const profile = await getSolidDataset(webId, { fetch });
  const person = getThing(profile, webId);
  const storageUrl = person && getUrl(person, STORAGE);
  if (!storageUrl) {
    throw new Error(`No pod storage location is listed in the profile for ${webId}.`);
  }

  // Build the fixed path <pod>/solidcard/decks/ and create each folder if it is missing.
  const storage = storageUrl.endsWith("/") ? storageUrl : `${storageUrl}/`;
  const appContainer = new URL("solidcard/", storage).href;
  const decksContainer = new URL("decks/", appContainer).href;
  await ensureContainer(appContainer, fetch);
  await ensureContainer(decksContainer, fetch);
  return decksContainer;
}

// Turn the downloaded Turtle file into a plain deck object.
function getDeckData(dataset, deckUrl) {
  // The deck's own entry ("file#deck"); without it this is not one of our files.
  const deckThing = getThing(dataset, `${deckUrl}${DECK_SUFFIX}`);
  if (!deckThing) {
    throw new Error("This file is not a SolidCard deck.");
  }

  // Each card is its own entry linked from the deck; its answer is another entry linked from the card.
  const cards = getUrlAll(deckThing, `${SCHEMA}hasPart`)
    .map((url) => {
      const card = getThing(dataset, url);
      if (!card) throw new Error(`Deck card data is missing from ${deckUrl}.`);
      const answerUrl = getUrl(card, `${SCHEMA}acceptedAnswer`);
      const answer = answerUrl && getThing(dataset, answerUrl);
      return {
        position: getInteger(card, `${SCHEMA}position`) ?? Number.MAX_SAFE_INTEGER,
        front: getStringNoLocale(card, `${SCHEMA}text`) ?? "",
        back: answer ? getStringNoLocale(answer, `${SCHEMA}text`) ?? "" : "",
      };
    })
    .sort((a, b) => a.position - b.position) // keep the cards in their saved order
    .map(({ front, back }) => ({ front, back }));

  // Missing fields become empty values so the screens never get undefined text.
  return {
    name: getStringNoLocale(deckThing, `${SCHEMA}name`) ?? "",
    description: getStringNoLocale(deckThing, `${SCHEMA}description`) ?? "",
    dateCreated: getDate(deckThing, `${SCHEMA}dateCreated`)?.toISOString().slice(0, 10) ?? "",
    isBasedOn: getUrl(deckThing, `${SCHEMA}isBasedOn`) ?? undefined,
    cards,
  };
}

// List the decks in a folder. -> [{ url, name, cardCount, isBasedOn? }]
export async function listDecks(containerUrl) {
  const fetch = getSolidFetch();
  // A folder is a dataset too; it lists the files inside it. Only .ttl files can be decks.
  const container = await getSolidDataset(containerUrl, { fetch });
  const urls = getContainedResourceUrlAll(container)
    .filter((url) => url.toLowerCase().endsWith(".ttl"));

  // Open every file to get its name and card count.
  const results = await Promise.allSettled(urls.map(async (url) => {
    const deck = await loadDeck(url);
    return {
      url,
      name: deck.name,
      cardCount: deck.cards.length,
      isBasedOn: deck.isBasedOn,
    };
  }));

  // One unreadable file must not hide the other decks; only fail if nothing could be read.
  const decks = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failed = results.find((r) => r.status === "rejected");
  if (decks.length === 0 && failed) throw failed.reason;
  return decks;
}

// Download one deck file. Rejects (with a message) if it is private, missing or not a deck.
export async function loadDeck(deckUrl) {
  const dataset = await getSolidDataset(deckUrl, { fetch: getSolidFetch() });
  return getDeckData(dataset, deckUrl);
}

// Turn a deck object into the Turtle entries to save: one for the deck, then a question and an answer per card.
function makeDeckThings(deckUrl, deck) {
  // The deck entry: name, description, creation date, and (for clones) the original it is based on.
  const deckThing = buildThing({ url: `${deckUrl}${DECK_SUFFIX}` })
    .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", `${SCHEMA}CreativeWork`)
    .setStringNoLocale(`${SCHEMA}name`, deck.name)
    .setStringNoLocale(`${SCHEMA}description`, deck.description ?? "")
    .setDate(`${SCHEMA}dateCreated`, new Date(`${deck.dateCreated}T00:00:00.000Z`));
  if (deck.isBasedOn) deckThing.setUrl(`${SCHEMA}isBasedOn`, deck.isBasedOn);

  const things = [deckThing.build()];
  // One question entry and one answer entry per card, numbered by position; the deck links to each card.
  deck.cards.forEach((card, index) => {
    const cardUrl = `${deckUrl}#card-${index + 1}`;
    const answerUrl = `${deckUrl}#answer-${index + 1}`;
    deckThing.addUrl(`${SCHEMA}hasPart`, cardUrl);
    things.push(
      buildThing({ url: cardUrl })
        .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", `${SCHEMA}Question`)
        .setStringNoLocale(`${SCHEMA}text`, card.front)
        .setInteger(`${SCHEMA}position`, index + 1)
        .setUrl(`${SCHEMA}acceptedAnswer`, answerUrl)
        .build(),
      buildThing({ url: answerUrl })
        .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", `${SCHEMA}Answer`)
        .setStringNoLocale(`${SCHEMA}text`, card.back)
        .build(),
    );
  });
  things[0] = deckThing.build(); // rebuild the deck entry, now that it links to all its cards
  return things;
}

// Save a deck to its file. Creates the file the first time, replaces the content afterwards.
export async function saveDeck(deckUrl, deck) {
  const fetch = getSolidFetch();
  let dataset;
  try {
    // Existing file: load it and remove all old entries, so deleted cards don't linger.
    dataset = await getSolidDataset(deckUrl, { fetch });
    dataset = getThingAll(dataset).reduce(
      (current, thing) => removeThing(current, thing),
      dataset,
    );
  } catch (error) {
    if (error.response?.status !== 404) throw error; // only "file not found" means a new deck
    dataset = createSolidDataset();                  // a brand-new, empty file
  }

  // Add the new entries and upload the file.
  dataset = makeDeckThings(deckUrl, deck).reduce(setThing, dataset);
  await saveSolidDatasetAt(deckUrl, dataset, { fetch });
}

// Delete the deck's file from the pod.
export async function deleteDeck(deckUrl) {
  await deleteFile(deckUrl, { fetch: getSolidFetch() });
}

// Pick a file URL for a new deck: the name as a readable file name, with _2, _3... if it is taken.
export async function newDeckUrl(containerUrl, name) {
  // "Platform Basics!" -> "platform_basics"
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "deck";
  const fetch = getSolidFetch();
  for (let suffix = 1; ; suffix++) {
    const filename = suffix === 1 ? `${slug}.ttl` : `${slug}_${suffix}.ttl`;
    const url = new URL(filename, containerUrl).href;
    if (!(await resourceExists(url, fetch))) return url;
  }
}
