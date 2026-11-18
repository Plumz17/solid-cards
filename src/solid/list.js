import {
  addUrl,
  createSolidDataset,
  createThing,
  getSolidDataset,
  getThing,
  getUrlAll,
  removeUrl,
  saveSolidDatasetAt,
  setThing,
} from "@inrupt/solid-client";
import { getSolidFetch } from "./auth.js";

// A "list file" is a small Turtle file holding a list of URLs, like:
//   <file#list>  <some-predicate>  <url1>, <url2>, <url3> .
// Two features use it: the friend list (following.ttl) and the public deck index (public.ttl).

const LIST_SUFFIX = "#list"; // the list is the "#list" entry of its file, like "#deck" in a deck file

// Read the URLs in a list file. A file that doesn't exist yet is just an empty list.
export async function readList(fileUrl, predicate) {
  let dataset;
  try {
    dataset = await getSolidDataset(fileUrl, { fetch: getSolidFetch() });
  } catch (error) {
    if (error.response?.status === 404) return [];
    throw error;
  }
  const list = getThing(dataset, `${fileUrl}${LIST_SUFFIX}`);
  return list ? getUrlAll(list, predicate) : [];
}

// Add a URL to the list, or remove it. Creates the file the first time something is added.
export async function editList(fileUrl, predicate, value, add) {
  const fetch = getSolidFetch();
  let dataset;
  try {
    dataset = await getSolidDataset(fileUrl, { fetch });
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    if (!add) return;                 // nothing to remove from a file that doesn't exist
    dataset = createSolidDataset();   // a brand-new, empty file
  }

  // Take the existing "#list" entry (or start one), change it, and upload the file again.
  const listUrl = `${fileUrl}${LIST_SUFFIX}`;
  const list = getThing(dataset, listUrl) ?? createThing({ url: listUrl });
  const changed = add ? addUrl(list, predicate, value) : removeUrl(list, predicate, value);
  await saveSolidDatasetAt(fileUrl, setThing(dataset, changed), { fetch });
}
