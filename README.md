# SolidCard

The final project for Platform-based Software Development.

SolidCard is a flashcard-sharing web app where every deck lives in the user's own Solid Pod. There is no backend: the browser talks directly to the pods.

## Features

- Create decks and cards in your own pod
- Share a deck with a link (decks are public)
- Anyone with the link can preview the deck and clone it into their own pod
- Edit your clone freely; the original is never touched
- No collaboration: nobody gets write access to someone else's deck

Planned: follow other users to see their decks.

## Data

One deck = one file in the pod: `<pod>/solidcard/decks/<name>.ttl`, using schema.org terms. A clone is a separate file that records its source with `isBasedOn`.

## Stack

Vite + plain JavaScript, `@inrupt/solid-client`, `@inrupt/solid-client-authn-browser`, solidcommunity.net pods, GitHub Pages.

## Run locally

```
npm install
npm run dev
```

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages (repo settings: Pages source = GitHub Actions) at `https://plumz17.github.io/solid-cards/`.
