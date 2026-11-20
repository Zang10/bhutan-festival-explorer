# Bhutan Festival Explorer

A frontend-only Vue 3 site to explore Bhutan’s festivals for the February 2027 to January 2028 season.

## Live demo

https://bhutan-festival-explorer-slm6.vercel.app

## Features

- Calendar and map views with search and filters
- Festival detail pages with visit checklists
- Saved festivals with a shareable link
- Dark mode
- Bhutan-only vector map drawn from dzongkhag boundary data

## Tech stack

Vue 3, Vite, Vue Router, Pinia, Leaflet, plain CSS, and local JSON data.

## Run locally

```sh
npm install
npm run dev
npm run build
```

## Data and accuracy

Festival dates come from the ABTO / Department of Tourism tentative 2027 calendar (updated 14 February 2025) and may change. Photos come from Wikimedia Commons, with authors and licenses listed on the [credits page](https://bhutan-festival-explorer-slm6.vercel.app/credits). If a photo cannot be matched to its festival or venue, the site shows a placeholder instead of a guess. The `verified` flag in `events.json` marks events whose details have been manually reviewed; none have been reviewed yet.

## Credits

Dzongkhag boundaries: geoBoundaries (CC BY 4.0). Photos: Wikimedia Commons. Photos remain under their original licenses and are not covered by any license for this code.

## Author

Kuenzang Jamtsho


