# National Card Vending — Website (v3, single-page)

Single-page static site modeled on 701vending.com's structure (Jacob's other vending company), in NCV's blue/gold brand. No build step.

Files: `index.html` (everything — hero, how it works, why host, machine, perfect-for, FAQ, contact), `404.html`, `styles.css`, `script.js`, `machine-photo.jpg` (real in-store machine photo, from the 701 Vending folder — same VTM Slim Tower), `favicon.svg`, `apple-touch-icon.png`, `og-image.png`, `robots.txt`, `sitemap.xml`, `site.webmanifest`.

## Integrations — one config block

Top of `index.html`:

```js
window.SITE_CONFIG = {
  bookingUrl: "https://cal.com/jacob-hagman/pokemon-vending-placement-consultation",
  formEndpoint: "",
  contactEmail: "jacob@nationalcardvending.com"
};
```

- **bookingUrl** — the "Open the booking calendar" button. Update when the cal.com event is renamed to NCV (open task).
- **formEndpoint** — leave `""` and form submissions open a pre-filled email to `contactEmail` (works out of the box). Paste a Formspree or GoHighLevel endpoint to automate; submissions POST JSON with a `_form: "host"` field.

## Deploy (Vercel)

1. Register `nationalcardvending.com` (open task; Vercel registrar ~$11.25/yr).
2. From this folder: `vercel --prod`, then attach the domain to the project.
3. Update `bookingUrl` after the cal.com rename; paste a `formEndpoint` when ready.

## Content rules

- No franchise/rep-recruitment/earnings-figure language — NCV is a local NE Ohio operation.
- Keep the Nintendo/Pokémon footer disclaimer.
- No personal addresses/phones on the site.

## QA note

Built in a sandbox with no headless browser (couldn't render pages live). Structural QA passed everywhere; the machine photo, OG image, and touch icon were visually verified as images. Give it a 30-second look in a real browser (`npx serve .`) on desktop + phone before deploying.
