#!/usr/bin/env node
/* Store locator generator for nationalcardvending.com/locations
 *
 * The site has no framework, so the locator is pre-rendered: this script reads
 * locations.json and writes locations.html (plain HTML, every address in the
 * markup, so Google can crawl it) plus the sitemap entry. Vercel runs it on
 * every deploy (vercel.json buildCommand), and the generated file is committed
 * too, so the page is correct even if the build step were skipped.
 *
 * To add a machine: add one object to locations.json, then push.
 *   { "host": "Name", "hostType": "GroceryStore", "street": "...", "city": "...", "state": "OH", "zip": "..." }
 * hostType is a schema.org type: GroceryStore, ConvenienceStore, GasStation,
 * Restaurant, EntertainmentBusiness, Store (any shop), CafeOrCoffeeShop, etc.
 *
 * Run locally: node build_locations.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = "https://nationalcardvending.com";
const PAGE_URL = `${SITE}/locations`;
const PHONE = "+17157819207";
const PHONE_DISPLAY = "(715) 781-9207";

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const slug = (s) => String(s).toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const raw = JSON.parse(readFileSync(join(ROOT, "locations.json"), "utf8"));
const required = ["host", "street", "city", "state", "zip"];
raw.forEach((l, i) => {
  for (const k of required) if (!l[k]) throw new Error(`locations.json entry ${i + 1} is missing "${k}"`);
});

/* Stable, unique id per machine: host + city, with the street number added
   only when the same host is in the same city twice (e.g. two Buehler's in Medina). */
const seen = {};
raw.forEach((l) => { const k = slug(`${l.host} ${l.city}`); seen[k] = (seen[k] || 0) + 1; });
const locs = raw.map((l) => {
  let id = slug(`${l.host} ${l.city}`);
  if (seen[id] > 1) id = slug(`${l.host} ${l.city} ${l.street.split(" ")[0]}`);
  const full = `${l.street}, ${l.city}, ${l.state} ${l.zip}`;
  return { ...l, id, full, maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.host}, ${full}`)}` };
}).sort((a, b) => a.city.localeCompare(b.city) || a.host.localeCompare(b.host) || a.street.localeCompare(b.street));

const cities = [...new Set(locs.map((l) => l.city))];
const count = locs.length;

/* ---------- JSON-LD: one Store per machine, inside the host business ---------- */
const org = { "@type": "Organization", "@id": `${SITE}/#organization`, name: "National Card Vending", legalName: "National Card Vending LLC", url: `${SITE}/`, telephone: PHONE };
const addr = (l) => ({ "@type": "PostalAddress", streetAddress: l.street, addressLocality: l.city, addressRegion: l.state, postalCode: l.zip, addressCountry: "US" });
const graph = [
  org,
  {
    "@type": "WebPage", "@id": `${PAGE_URL}#webpage`, url: PAGE_URL,
    name: "Find a Pokemon Card Vending Machine Near You | National Card Vending",
    isPartOf: { "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "National Card Vending" },
    about: { "@id": `${SITE}/#organization` }
  },
  ...locs.map((l) => ({
    "@type": "Store",
    "@id": `${PAGE_URL}#${l.id}`,
    name: "National Card Vending",
    description: `Pokemon card vending machine inside ${l.host} in ${l.city}, ${l.state}. Sealed Pokemon booster packs, graded slabs and sports cards. Cashless, self-serve.`,
    url: `${PAGE_URL}#${l.id}`,
    telephone: PHONE,
    image: `${SITE}/machine-photo.jpg`,
    priceRange: "$$",
    paymentAccepted: "Credit card, debit card, Apple Pay, Google Pay",
    currenciesAccepted: "USD",
    address: addr(l),
    hasMap: l.maps,
    parentOrganization: { "@id": `${SITE}/#organization` },
    containedInPlace: { "@type": l.hostType || "LocalBusiness", name: l.host, address: addr(l) }
  }))
];
const jsonld = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2).replace(/</g, "\\u003c");

/* ---------- HTML ---------- */
const pin = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

/* One continuous grid, sorted by city (most cities have a single machine, so
   per-city sections would leave rows of one card). The first card in each city
   carries that city's anchor for the jump links. */
const firstInCity = new Set();
const cards = `
      <h2 class="loc-list__title">All ${count} machines</h2>
      <div class="loc-grid">${locs.map((l) => {
        const anchor = firstInCity.has(l.city) ? "" : (firstInCity.add(l.city), `<span class="loc-anchor" id="${slug(l.city)}"></span>`);
        return `
        <article class="loc-card" id="${l.id}">${anchor}
          <div class="loc-card__top"><span class="loc-card__icon">${pin}</span><span class="loc-card__city">${esc(l.city)}, ${esc(l.state)}</span></div>
          <h3 class="loc-card__host">${esc(l.host)}</h3>
          <p class="loc-card__line">Pokemon card vending machine inside ${esc(l.host)}</p>
          <address class="loc-card__addr">${esc(l.street)}<br />${esc(l.city)}, ${esc(l.state)} ${esc(l.zip)}</address>
          <a class="loc-card__dir" href="${esc(l.maps)}" target="_blank" rel="noopener">Get directions <span aria-hidden="true">&rarr;</span></a>
        </article>`;
      }).join("")}
      </div>`;

const cityLinks = cities.map((c) => `<a href="#${slug(c)}">${esc(c)}</a>`).join("\n          ");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Find a Pokemon Card Vending Machine Near You | National Card Vending</title>
<meta name="description" content="Find a Pokemon card vending machine near you. National Card Vending has ${count} trading card vending machines across Northeast Ohio with sealed Pokemon packs, graded slabs and sports cards, in ${esc(cities.slice(0, 6).join(", "))} and more." />
<link rel="canonical" href="${PAGE_URL}" />
<meta name="theme-color" content="#07080C" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="National Card Vending" />
<meta property="og:title" content="Find a Pokemon Card Vending Machine Near You | National Card Vending" />
<meta property="og:description" content="${count} Pokemon and trading card vending machines across Northeast Ohio. Find the one nearest you." />
<meta property="og:url" content="${PAGE_URL}" />
<meta property="og:image" content="${SITE}/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Find a Pokemon Card Vending Machine Near You" />
<meta name="twitter:description" content="${count} Pokemon and trading card vending machines across Northeast Ohio." />
<meta name="twitter:image" content="${SITE}/og-image.jpg" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/styles.css" />

<script type="application/ld+json">
${jsonld}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<nav class="nav" id="nav" aria-label="Main">
  <div class="container nav__inner">
    <a href="/" class="brand">
      <span class="brand__mark">NCV</span>
      <span class="brand__word">National Card <span>Vending</span></span>
    </a>
    <ul class="nav__links">
      <li><a href="/#how-it-works">How it works</a></li>
      <li><a href="/#why-host">Why host</a>
          <a href="/#chains">Chains</a></li>
      <li><a href="/#machine">The machine</a></li>
      <li><a href="/locations" aria-current="page">Locations</a></li>
      <li><a href="/#faq">FAQ</a></li>
    </ul>
    <div class="nav__cta">
      <a href="/#contact" class="btn btn--primary btn--sm">Host a machine</a>
      <button type="button" class="nav__toggle" aria-label="Open menu" aria-expanded="false" aria-controls="navMobile" id="navToggle"><span aria-hidden="true"></span></button>
    </div>
  </div>
  <div class="nav__mobile" id="navMobile">
    <a href="/#how-it-works">How it works</a>
    <a href="/#why-host">Why host</a>
    <a href="/#machine">The machine</a>
    <a href="/locations" aria-current="page">Locations</a>
    <a href="/#faq">FAQ</a>
    <a href="/#contact" class="btn btn--primary" style="margin-top:20px;">Host a machine</a>
  </div>
</nav>

<main id="main">

  <header class="loc-hero" id="top">
    <div class="hero__aurora" aria-hidden="true"></div>
    <div class="container loc-hero__inner">
      <p class="hero__badge"><span class="dot dot--live" aria-hidden="true"></span> ${count} machines live &middot; Northeast Ohio</p>
      <h1>Find a Pok&eacute;mon card vending machine <em>near you.</em></h1>
      <p class="loc-hero__sub">National Card Vending machines are inside grocery stores, gas stations, arcades and dessert caf&eacute;s across Northeast Ohio. Every one is stocked with genuine, factory-sealed Pok&eacute;mon booster packs, mystery graded slabs and sports card packs. Tap to pay with a card, Apple Pay or Google Pay. Open whenever the host business is open.</p>
      <nav class="loc-jump" aria-label="Jump to a city">
          ${cityLinks}
      </nav>
    </div>
  </header>

  <section class="section loc-list" aria-label="All National Card Vending locations">
    <div class="container">${cards}
    </div>
  </section>

  <section class="section section--alt loc-faq" aria-label="About our machines">
    <div class="container loc-faq__grid">
      <div>
        <p class="eyebrow">What's inside</p>
        <h2>Real cards. Sealed packs. No cash needed.</h2>
        <p>Machines carry current Pok&eacute;mon sets in factory-sealed booster packs, mystery graded Pok&eacute;mon slabs, and sports card packs. Product rotates as new sets release. Machines take card and mobile pay only.</p>
      </div>
      <div>
        <p class="eyebrow">Machine trouble?</p>
        <h2>We fix it fast.</h2>
        <p>Didn&rsquo;t vend, or charged twice? Call or text <a href="tel:${PHONE}">${PHONE_DISPLAY}</a> with the store and time, or email <a href="mailto:jacob@nationalcardvending.com">jacob@nationalcardvending.com</a>. Refunds come straight from us, not the store.</p>
      </div>
      <div>
        <p class="eyebrow">Own a business?</p>
        <h2>Want a machine in yours?</h2>
        <p>We place, stock and service it at no cost to you, and you earn on every sale.</p>
        <a href="/#contact" class="btn btn--gold">Host a machine <span class="btn__arrow" aria-hidden="true">&rarr;</span></a>
      </div>
    </div>
  </section>

</main>

<footer class="footer">
  <div class="container">
    <div class="footer__top">
      <div class="footer__brand">
        <a href="/" class="brand">
          <span class="brand__mark">NCV</span>
          <span class="brand__word brand__word--light">National Card <span>Vending</span></span>
        </a>
        <p>Fully managed trading-card vending machines for single locations and multi-store chains. Headquartered in Cleveland, Ohio &middot; placements nationwide.</p>
      </div>
      <div class="footer__cols">
        <div class="footer__col">
          <h4>Site</h4>
          <a href="/#how-it-works">How it works</a>
          <a href="/#why-host">Why host</a>
          <a href="/#machine">The machine</a>
          <a href="/locations">Locations</a>
          <a href="/#faq">FAQ</a>
        </div>
        <div class="footer__col">
          <h4>Get in touch</h4>
          <a href="tel:${PHONE}">${PHONE_DISPLAY}</a>
          <a href="mailto:jacob@nationalcardvending.com">jacob@nationalcardvending.com</a>
          <a href="/#contact">Host inquiry</a>
        </div>
      </div>
    </div>
    <div class="footer__bottom">
      <p class="footer__disclaimer">&copy; <span data-year>${new Date().getFullYear()}</span> National Card Vending LLC. All rights reserved. Not affiliated with, endorsed by, or sponsored by Nintendo or The Pok&eacute;mon Company.</p>
    </div>
  </div>
</footer>

<div class="mobile-cta">
  <div class="mobile-cta__row">
    <a href="tel:${PHONE}" class="btn btn--outline mobile-cta__call" aria-label="Call National Card Vending at ${PHONE_DISPLAY}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:19px;height:19px;" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.234 14 14 0 0 0 6.392 6.383Z"/></svg>
    </a>
    <a href="/#contact" class="btn btn--primary" style="flex:1;">Host a machine</a>
  </div>
</div>

<button class="back-to-top" aria-label="Back to top">&uarr;</button>

<script src="/script.js" defer></script>
</body>
</html>
`;

writeFileSync(join(ROOT, "locations.html"), html);

/* ---------- sitemap: keep / and /locations ---------- */
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${PAGE_URL}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
`);

console.log(`locations.html: ${count} machines in ${cities.length} cities`);
