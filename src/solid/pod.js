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

const STORAGE = "http://www.w3.org/ns/pim/space#storage";
const SCHEMA = "https://schema.org/";
const DECK_SUFFIX = "#deck";

async function resourceExists(url, fetch) {
  let response = await fetch(url, { method: "HEAD" });
  if (response.status === 405 || response.status === 501) {
    response = await fetch(url, { headers: { Accept: "text/turtle" } });
  }
  if (response.ok) return true;
  if (response.status === 404) return false;
  throw new Error(`Couldn't access pod resource ${url}: ${response.status} ${response.statusText}`);
}

async function ensureContainer(url, fetch) {
  if (await resourceExists(url, fetch)) return;
  await createContainerAt(url, { fetch });
}

export async function ensureDecksContainer(webId) {
  const fetch = getSolidFetch();
  const profile = await getSolidDataset(webId, { fetch });
  const person = getThing(profile, webId);
  const storageUrl = person && getUrl(person, STORAGE);
  if (!storageUrl) {
    throw new Error(`No pod storage location is listed in the profile for ${webId}.`);
  }

  const storage = storageUrl.endsWith("/") ? storageUrl : `${storageUrl}/`;
  const appContainer = new URL("solidcard/", storage).href;
  const decksContainer = new URL("decks/", appContainer).href;
  await ensureContainer(appContainer, fetch);
  await ensureContainer(decksContainer, fetch);
  return decksContainer;
}

function getDeckData(dataset, deckUrl) {
  const deckThing = getThing(dataset, `${deckUrl}${DECK_SUFFIX}`);
  if (!deckThing) {
    throw new Error("This file is not a SolidCard deck.");
  }

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
    .sort((a, b) => a.position - b.position)
    .map(({ front, back }) => ({ front, back }));

  return {
    name: getStringNoLocale(deckThing, `${SCHEMA}name`) ?? "",
    description: getStringNoLocale(deckThing, `${SCHEMA}description`) ?? "",
    dateCreated: getDate(deckThing, `${SCHEMA}dateCreated`)?.toISOString().slice(0, 10) ?? "",
    isBasedOn: getUrl(deckThing, `${SCHEMA}isBasedOn`) ?? undefined,
    cards,
  };
}

export async function listDecks(containerUrl) {
  const fetch = getSolidFetch();
  const container = await getSolidDataset(containerUrl, { fetch });
  const urls = getContainedResourceUrlAll(container)
    .filter((url) => url.toLowerCase().endsWith(".ttl"));

  return Promise.all(urls.map(async (url) => {
    const deck = await loadDeck(url);
    return {
      url,
      name: deck.name,
      cardCount: deck.cards.length,
      isBasedOn: deck.isBasedOn,
    };
  }));
}

export async function loadDeck(deckUrl) {
  const dataset = await getSolidDataset(deckUrl, { fetch: getSolidFetch() });
  return getDeckData(dataset, deckUrl);
}

function makeDeckThings(deckUrl, deck) {
  const deckThing = buildThing({ url: `${deckUrl}${DECK_SUFFIX}` })
    .addUrl("http://www.w3.org/1999/02/22-rdf-syntax-ns#type", `${SCHEMA}CreativeWork`)
    .setStringNoLocale(`${SCHEMA}name`, deck.name)
    .setStringNoLocale(`${SCHEMA}description`, deck.description ?? "")
    .setDate(`${SCHEMA}dateCreated`, new Date(`${deck.dateCreated}T00:00:00.000Z`));
  if (deck.isBasedOn) deckThing.setUrl(`${SCHEMA}isBasedOn`, deck.isBasedOn);

  const things = [deckThing.build()];
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
  things[0] = deckThing.build();
  return things;
}

export async function saveDeck(deckUrl, deck) {
  const fetch = getSolidFetch();
  let dataset;
  try {
    dataset = await getSolidDataset(deckUrl, { fetch });
    dataset = getThingAll(dataset).reduce(
      (current, thing) => removeThing(current, thing),
      dataset,
    );
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    dataset = createSolidDataset();
  }

  dataset = makeDeckThings(deckUrl, deck).reduce(setThing, dataset);
  await saveSolidDatasetAt(deckUrl, dataset, { fetch });
}

export async function deleteDeck(deckUrl) {
  await deleteFile(deckUrl, { fetch: getSolidFetch() });
}

export async function newDeckUrl(containerUrl, name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "deck";
  const fetch = getSolidFetch();
  for (let suffix = 1; ; suffix++) {
    const filename = suffix === 1 ? `${slug}.ttl` : `${slug}_${suffix}.ttl`;
    const url = new URL(filename, containerUrl).href;
    if (!(await resourceExists(url, fetch))) return url;
  }
}
