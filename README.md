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

Each new deck has its own folder in the pod: `<pod>/solidcard/decks/<name>/<name>.ttl`. The folder is reserved for that deck's Turtle data and future image files. The app discovers the pod's storage URL from the user's WebID profile, creates the `solidcard/decks/` containers when needed, and reads and writes deck data directly with the user's authenticated Solid session. Decks use schema.org `CreativeWork`, `Question`, and `Answer` terms; a clone is a separate deck folder that records its source with `isBasedOn`. Public/private visibility is stored in the deck file's pod access controls. Existing decks stored directly in `solidcard/decks/` remain supported.

## Stack

Vite + plain JavaScript, `@inrupt/solid-client`, `@inrupt/solid-client-authn-browser`, solidcommunity.net pods, GitHub Pages.

## Run locally

```
npm install
npm run dev
```

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the app and publishes it to GitHub Pages (repo settings: Pages source = GitHub Actions) at `https://plumz17.github.io/solid-cards/`.
