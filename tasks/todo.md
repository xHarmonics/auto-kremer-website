# Task Breakdown: Auto Kremer Website Relaunch

Plan-Referenz: [`tasks/plan.md`](./plan.md) · Audit & Konzept: [`docs/ist-analyse-und-konzept.md`](../docs/ist-analyse-und-konzept.md)

---

## Phase 1: Foundation & Design System Shell

## Task 1: Astro 5 + Cloudflare Workers + Tailwind v4 Grundgerüst

**Description:** Initialisiert das Projekt mit Astro 5 im Hybrid/Server-Modus für Cloudflare Workers (`@astrojs/cloudflare`), Preact-Integration für interaktive Inseln, Tailwind CSS v4, striktem TypeScript sowie Vitest und Playwright für automatisierte Tests.

**Acceptance criteria:**
- [x] Astro 5 kompiliert fehlerfrei für die Cloudflare-Workers-Runtime inkl. konfigurierter D1- und R2-Bindings in `wrangler.jsonc`.
- [x] Skripte `npm run dev`, `npm run typecheck`, `npm test`, `npm run test:e2e` und `npm run build` sind eingerichtet und ein Health-Test unter `/api/health` besteht.
- [x] Keine unnötigen Abhängigkeiten oder Baukasten-Boilerplates sind enthalten.

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run typecheck && npm run build`
- [x] Manual check: `npx wrangler dev` startet lokal und liefert HTTP 200 auf `/` und `/api/health`.

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `astro.config.mjs`
- `wrangler.jsonc`
- `tsconfig.json`
- `src/pages/api/health.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 2: Design-Tokens, lokale Typografie & globales Seiten-Layout

**Description:** Implementiert das *Dark Editorial Luxury*-Farb- und Typografiesystem (`#0A0A0B` Obsidian, `#C9A84C` Oro Sant’Agata, lokal gehostete `.woff2`-Schriften `Space Grotesk`, `Inter`, `JetBrains Mono` ohne externe CDN-Requests) sowie `BaseLayout.astro`, `SiteHeader.astro` (inkl. Mobile-Drawer) und `SiteFooter.astro` mit konsolidierten Bonner Kontaktdaten.

**Acceptance criteria:**
- [x] Alle Farb-Tokens erfüllen mindestens WCAG AA (Fließtext > 16:1) und es finden keinerlei Aufrufe an `fonts.googleapis.com` oder `wixstatic.com` statt.
- [x] `SiteHeader` macht alle 5 Hauptsäulen (`Fahrzeuge`, `Referenzen`, `Werkstatt`, `Teile-Shop`, `Über uns`), den CTA `Fahrzeug anbieten` sowie `Kontakt` und das Warenkorb-Badge auf Mobile & Desktop direkt erreichbar.
- [x] `SiteFooter` zeigt die korrekte Adresse (`Buchenweg 3, 53227 Bonn`), konsistente Telefonnummern, `@auto-kremer.com` E-Mail, Öffnungszeiten und alle Rechtslinks (`/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/versand`).

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run typecheck && npm run build`
- [x] Manual check: Responsive Prüfung bei 375 px (iPhone) und 1440 px (Desktop) sowie Prüfung im Netzwerk-Tab auf 0 Drittanbieter-Requests.

**Dependencies:** Task 1

**Files likely touched:**
- `src/styles/global.css`
- `src/layouts/BaseLayout.astro`
- `src/components/layout/SiteHeader.astro`
- `src/components/layout/SiteFooter.astro`
- `src/pages/404.astro`

**Estimated scope:** Medium: 3-5 files

---

## Checkpoint: After Tasks 1-2 (Foundation & Shell)
- [x] All tests pass (`npm test`)
- [x] Application builds without errors (`npm run typecheck && npm run build`)
- [x] Core layout shell & navigation work on mobile and desktop without external font/tracker requests

---

## Phase 2: Vertical Slice — Fahrzeug-Showroom & Referenzen

## Task 3: D1-Schema, Migration & Seed-Daten für Fahrzeuge

**Description:** Erstellt das Drizzle-Schema und die erste D1-Migration für `vehicles` und `vehicle_images` sowie typsichere Repository-Abfragen und einen realistischen Seed-Datensatz mit den 5 aktuellen Bestandsfahrzeugen (Murciélago, Gallardo Handschalter, Porsche 993 RS Clubsport, Gallardo Spyder, Alfa Romeo 4C) und den 3 verkauften Ikonen (Murciélago, Diablo SE30, Jarama).

**Acceptance criteria:**
- [ ] `vehicles` und `vehicle_images` bilden sowohl verfügbare/reservierte Fahrzeuge als auch verkaufte Referenzen inkl. Differenzbesteuerung (§ 25a UStG) / „Preis auf Anfrage“ typsicher ab.
- [ ] D1-Migration und Seed laufen lokal über Wrangler fehlerfrei durch.
- [ ] Unit-Tests verifizieren die Filterung nach Status (`available` vs. `sold`), Marke und Sortierung.

**Verification:**
- [ ] Tests pass: `npx vitest run tests/unit/vehicles.test.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Lokale D1-Abfrage listet 5 aktive und 3 verkaufte Fahrzeuge.

**Dependencies:** Task 1

**Files likely touched:**
- `drizzle.config.ts`
- `src/db/schema.ts`
- `src/db/client.ts`
- `src/db/queries/vehicles.ts`
- `tests/unit/vehicles.test.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 4: Showroom-Übersicht (`/fahrzeuge`) & Referenzen (`/referenzen`)

**Description:** Baut die Fahrzeugkarten (`VehicleCard.astro`) mit Monospace-Kerndatenleiste (Baujahr, KM, Leistung, Getriebe, Preis/Status) sowie die Übersichtsseiten `/fahrzeuge` (mit interaktiver Marken-/Getriebefilter-Insel) und `/referenzen` (mit Verkauft-Badge und Überleitung zur Fahrzeug-Kommission).

**Acceptance criteria:**
- [ ] `/fahrzeuge` rendert alle verfügbaren/reservierten Fahrzeuge und lässt sich ohne Seiten-Reload nach Marke (Lamborghini, Porsche, Alfa Romeo) und Getriebe filtern.
- [ ] `/referenzen` präsentiert verkaufte Sammlerfahrzeuge mit sauberer `<h1>`-Hierarchie, Fahrzeugdaten und einem klaren CTA zu `/fahrzeug-verkaufen`.
- [ ] Alle Karten verlinken auf eigene interne Detailseiten `/fahrzeuge/[slug]` statt Besucher sofort zu `mobile.de` wegzuschicken.

**Verification:**
- [ ] Tests pass: `npx vitest run`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Filterwechsel auf `/fahrzeuge` und Navigation zu `/referenzen` prüfen.

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/components/showroom/VehicleCard.astro`
- `src/components/showroom/VehicleFilterBar.tsx`
- `src/pages/fahrzeuge/index.astro`
- `src/pages/referenzen.astro`
- `src/lib/format.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 5: Fahrzeug-Detailansicht (`/fahrzeuge/[slug]`) mit Lightbox & Schema.org

**Description:** Implementiert die dedizierte Fahrzeug-Detailseite mit hochauflösender Touch-/Tastatur-Lightbox-Galerie, strukturiertem technischem Datenblatt, Provenienz-/Historientext, Sticky-Anfragebox (Vorbelegung für `/kontakt?fahrzeug=...`, Telefon, WhatsApp, optionaler Zweitlink zum `mobile.de`-Inserat) sowie `Car` / `Offer` JSON-LD für Google.

**Acceptance criteria:**
- [ ] Jedes Bestands- und Referenzfahrzeug ist unter `/fahrzeuge/[slug]` aufrufbar; unbekannte Slugs liefern sauber HTTP 404.
- [ ] Die Bildergalerie unterstützt Tastatursteuerung (`ArrowLeft`, `ArrowRight`, `Escape`), korrekte Alt-Texte und responsive Bildgrößen ohne Layout-Shift (CLS < 0.02).
- [ ] Valides Schema.org `Car`-Markup und fahrzeugspezifische `<title>`/`<meta description>`-Tags werden im `<head>` ausgegeben.

**Verification:**
- [ ] Tests pass: `npx playwright test tests/e2e/showroom.spec.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Detailseite `/fahrzeuge/porsche-993-carrera-rs-clubsport-1995` inkl. Lightbox und Anfrage-Link testen.

**Dependencies:** Task 4

**Files likely touched:**
- `src/pages/fahrzeuge/[slug].astro`
- `src/components/showroom/VehicleGalleryLightbox.tsx`
- `src/components/showroom/VehicleSpecTable.astro`
- `src/components/showroom/VehicleInquiryBox.astro`
- `tests/e2e/showroom.spec.ts`

**Estimated scope:** Medium: 3-5 files

---

## Checkpoint: After Tasks 3-5 (Showroom End-to-End)
- [ ] All unit and showroom E2E tests pass
- [ ] Application builds cleanly
- [ ] Complete user journey `/fahrzeuge` -> Filter -> `/fahrzeuge/[slug]` -> Lightbox -> Inquiry CTA works end-to-end

---

## Phase 3: Vertical Slice — Ricambi Originali Online-Shop & Stripe Checkout

## Task 6: D1-Shop-Schema & Bereinigungs-Importer für die 116 Lamborghini-Teile

**Description:** Erweitert das D1-Schema um `products`, `product_models` und `legacy_product_redirects` und implementiert das Migrationsskript `scripts/import-wix-catalog.ts`, das die 116 bestehenden Ersatzteile strukturiert übernimmt, OEM-Teilenummern extrahiert (`086927755E`, `400945095P` etc.), die 16 doppelten `-1`-Einträge dedupliziert, Tippfehler in Titeln korrigiert und Wix-Platzhaltertexte/Demo-Varianten entfernt.

**Acceptance criteria:**
- [ ] Jedes Produkt besitzt eine bereinigte `oem_number`, zugeordnete Lamborghini-Baureihen (`product_models`), Bruttopreis in Cent (`price_cents`), MwSt.-Satz und exakten Lagerbestand (`stock_quantity`, `reserved_quantity`).
- [ ] Alle 116 bisherigen `/product-page/...`-Slugs sind in `legacy_product_redirects` verlustfrei einem sauberen `/shop/[slug]` zugeordnet.
- [ ] Such-Query findet Ersatzteile in < 20 ms sowohl über exakte/teilweise OEM-Teilenummer als auch über Modellname und Bauteilbezeichnung.

**Verification:**
- [ ] Tests pass: `npx vitest run tests/unit/products.test.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Suche nach `086927755E` und Filter `Countach` / `Diablo` liefern exakte Treffer ohne Duplikate.

**Dependencies:** Task 3

**Files likely touched:**
- `src/db/schema.ts`
- `src/db/queries/products.ts`
- `scripts/import-wix-catalog.ts`
- `tests/unit/products.test.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 7: Shop-Katalogseite (`/shop`) mit OEM-Teilenummersuche & Modellfilter

**Description:** Baut die Shop-Hauptseite `/shop` mit prominenter OEM-Teilenummersuche (`OemSearchBar.tsx`), Filterung nach Lamborghini-Baureihe (350GT bis Urus) und Baugruppe sowie PAngV-konformen Produktkarten (`ProductCard.astro` inkl. OEM-Badge, Modell-Tags, Bruttopreis + *„inkl. 19 % MwSt., zzgl. Versand“* und Lagerstatus).

**Acceptance criteria:**
- [ ] Kunden können Teile sofort per OEM-Nummer, Suchbegriff, Baureihe (z. B. *Diablo*, *Murciélago*, *Countach*, *LM002*) und Verfügbarkeit filtern, wobei Filter-Parameter teilbar in der URL (`?modell=diablo&q=...`) abgebildet werden.
- [ ] Nicht verfügbare Teile (`availableStock === 0`) sind klar gekennzeichnet und erlauben keinen Klick auf „In den Warenkorb“, bieten aber einen „Verfügbarkeit anfragen“-Link.
- [ ] Jede Preisangabe auf `/shop` enthält den gesetzlichen Pflichthinweis auf MwSt. und verlinkte Versandkosten (`/versand`).

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Filterung auf `/shop?modell=countach` und Suche nach OEM-Nummer auf Mobile & Desktop prüfen.

**Dependencies:** Task 2, Task 6

**Files likely touched:**
- `src/pages/shop/index.astro`
- `src/components/shop/ProductCard.astro`
- `src/components/shop/ShopCatalogExplorer.tsx`
- `src/pages/api/products/search.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 8: Produkt-Detailseite (`/shop/[slug]`) & persistenter Slide-Over-Warenkorb

**Description:** Implementiert die Produkt-Detailansicht `/shop/[slug]` (inkl. Schema.org `Product`, OEM-Datenblatt, kompatiblen Modellen, echten Versand-/Widerrufshinweisen statt des bisherigen „Privatverkauf“-Fehlers) sowie den globalen Warenkorb via `Nano Stores` (`localStorage`) und `CartDrawer.tsx` mit Mengenbegrenzung auf den realen Lagerbestand.

**Acceptance criteria:**
- [ ] Artikel lassen sich von `/shop` und `/shop/[slug]` in den Warenkorb legen; die maximale Menge im Warenkorb ist strikt durch den verfügbaren Lagerbestand begrenzt.
- [ ] Der `CartDrawer` bleibt über Seitenwechsel und Browser-Reloads erhalten, zeigt Zwischensumme, MwSt.-Anteil und geschätzte Versandkosten und ist vollständig per Tastatur (`Escape`, Focus-Trap) bedienbar.
- [ ] Das Warenkorb-Badge im `SiteHeader` aktualisiert sich reaktiv in Echtzeit.

**Verification:**
- [ ] Tests pass: `npx vitest run tests/unit/cart.test.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Artikel hinzufügen, Menge ändern, Seite neu laden und `CartDrawer` prüfen.

**Dependencies:** Task 7

**Files likely touched:**
- `src/pages/shop/[slug].astro`
- `src/lib/cart.store.ts`
- `src/components/shop/AddToCartButton.tsx`
- `src/components/shop/CartDrawer.tsx`
- `tests/unit/cart.test.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 9: Stripe Checkout API (`/api/checkout`) mit atomarer Bestandsreservierung

**Description:** Erstellt den Server-Endpunkt `POST /api/checkout`, der Preise und Lagerbestände ausschließlich serverseitig aus D1 liest (niemals Client-Preisen vertraut!), den Bestand für 30 Minuten atomar reserviert, eine `orders`-Vorabzeile anlegt und eine Stripe Checkout Session inkl. Versandtarifen (DE / EU / International versichert) und AGB/Widerrufs-Links erzeugt.

**Acceptance criteria:**
- [ ] Manipulation von Preisen im Client wird ignoriert; `/api/checkout` berechnet alle Beträge ausschließlich anhand der D1-Datenbank.
- [ ] Bei `availableStock < requestedQuantity` bricht der Checkout mit einer klaren deutschen Fehlermeldung (HTTP 409 inkl. betroffener Artikel) ab, bevor eine Stripe-Session entsteht.
- [ ] Für gültige Warenkörbe wird der Bestand atomar reserviert und die Stripe-Checkout-URL zurückgegeben.

**Verification:**
- [ ] Tests pass: `npx vitest run tests/unit/checkout.test.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Parallele Checkout-Anfrage auf ein Einzelstück (`stock = 1`) lässt exakt 1 Session zu und lehnt die zweite sauber ab.

**Dependencies:** Task 8

**Files likely touched:**
- `src/db/schema.ts`
- `src/lib/stripe.ts`
- `src/pages/api/checkout.ts`
- `tests/unit/checkout.test.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 10: Stripe-Webhook, Bestandsabbuchung, Bestell-Mails & Checkout-Statusseiten

**Description:** Implementiert `POST /api/webhooks/stripe` mit kryptografischer Signaturprüfung für `checkout.session.completed` (markiert Bestellung als `paid`, bucht `stock_quantity` final ab, sendet Bestellbestätigung via Resend an Kunde & Auto Kremer) und `checkout.session.expired` (gibt reservierten Bestand wieder frei) sowie die Seiten `/shop/erfolg` (leert lokalen Warenkorb) und `/shop/abgebrochen`.

**Acceptance criteria:**
- [ ] Ungültig signierte Webhook-Aufrufe werden mit HTTP 400 abgewiesen; doppelte Zustellung desselben Stripe-Events wird idempotent verarbeitet (kein doppelter Bestandsabzug).
- [ ] Nach `checkout.session.completed` sinkt `stock_quantity` korrekt, der Bestellstatus wechselt auf `paid` und das E-Mail-Modul wird mit Bestellnummer `AK-...` ausgelöst.
- [ ] `/shop/erfolg` bestätigt den Kauf und leert den Client-Warenkorb; `/shop/abgebrochen` erhält den Warenkorb für einen erneuten Versuch.

**Verification:**
- [ ] Tests pass: `npx vitest run tests/unit/webhook-stripe.test.ts && npx playwright test tests/e2e/shop.spec.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Simulierter Stripe-Webhook-Durchlauf verifiziert Bestandsabzug und Statuswechsel in D1.

**Dependencies:** Task 9

**Files likely touched:**
- `src/pages/api/webhooks/stripe.ts`
- `src/lib/email.ts`
- `src/pages/shop/erfolg.astro`
- `src/pages/shop/abgebrochen.astro`
- `tests/unit/webhook-stripe.test.ts`

**Estimated scope:** Medium: 3-5 files

---

## Checkpoint: After Tasks 6-10 (E-Commerce End-to-End)
- [ ] All unit and shop E2E tests pass
- [ ] Build & typecheck succeed with zero warnings
- [ ] Complete shop flow (OEM search -> filter -> product detail -> cart drawer -> stock reservation -> webhook stock decrement) verified end-to-end

---

## Phase 4: Vertical Slice — Lead-Generierung, Markenwelt & Rechtliches

## Task 11: Fahrzeug-Kommission (`/fahrzeug-verkaufen`) mit Multi-Step-Formular & R2-Foto-Upload

**Description:** Ersetzt die bisher formularlose Seite `/consign-your-car` durch eine überzeugende Landingpage `/fahrzeug-verkaufen` (4-Schritte-Ablauf, Vorteile der Vermarktung über Auto Kremer seit 1967) inklusive 3-stufigem Kommissions-/Ankaufsformular (`ConsignmentWizard.tsx`), Validierung mit Zod, sicherem Bildupload (bis zu 8 Fahrzeugfotos in privaten R2-Pfad), Cloudflare-Turnstile-Schutz, Speicherung in D1 (`inquiries`) und Sofort-Benachrichtigung per Resend.

**Acceptance criteria:**
- [ ] Kunden können Fahrzeugdaten (Marke, Modell, Baujahr, KM, Getriebe, Preisvorstellung, Wunsch *Kommission vs. Direktankauf*), Zustandstext, bis zu 8 Fotos (JPG/PNG/WebP/AVIF, max. 10 MB pro Bild) und Kontaktdaten absenden.
- [ ] Ungültige Dateitypen, fehlende Pflichtfelder oder ungültige Turnstile-Tokens werden serverseitig zuverlässig abgewiesen.
- [ ] Jede valide Anfrage wird in D1 (`inquiries`) gespeichert und löst eine strukturierte Benachrichtigungs-E-Mail an `info@auto-kremer.com` aus.

**Verification:**
- [ ] Tests pass: `npx vitest run tests/unit/consignment.test.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Durchlauf aller 3 Formularschritte inkl. Testbild-Upload auf `/fahrzeug-verkaufen`.

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/pages/fahrzeug-verkaufen.astro`
- `src/components/forms/ConsignmentWizard.tsx`
- `src/pages/api/inquiries/consign.ts`
- `src/lib/r2.ts`
- `tests/unit/consignment.test.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 12: Konsolidierte Kontaktseite (`/kontakt`) & allgemeine Anfrage-API

**Description:** Führt die bisherigen Seiten `/contact-us` und `/kontakt` zu einer klaren, fehlerfreien Kontaktseite `/kontakt` zusammen – mit Themenauswahl (*Fahrzeug-Anfrage*, *Werkstatt-Termin*, *Ersatzteil-Anfrage*, *Allgemein*), automatischer Vorbelegung über Query-Parameter (`?fahrzeug=...` oder `?teil=...`), validiertem Formular (`POST /api/inquiries/contact`), korrekten `mailto:info@auto-kremer.com`- und `tel:`-Links, Öffnungszeiten und DSGVO-konformer Anfahrtskarte ohne ungefragten Drittanbieter-Iframe.

**Acceptance criteria:**
- [ ] Kein einziger Link zeigt mehr auf `mailto:info@mysite.com`, `@gmail.com` oder `@web.de`; alle Kontaktwege sind konsistent.
- [ ] Klick auf „Anfragen“ auf einer Fahrzeug- oder Produktseite öffnet `/kontakt` mit vorausgefülltem Betreff und Referenzobjekt.
- [ ] Die Anfahrtskarte überträgt beim Seitenaufruf keinerlei Daten an Google Server (statische Standortkarte mit explizitem externem Routenlink).

**Verification:**
- [ ] Tests pass: `npx vitest run tests/unit/contact.test.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: `/kontakt?fahrzeug=Lamborghini+Gallardo` aufrufen, Formular absenden und D1-Eintrag prüfen.

**Dependencies:** Task 2, Task 11

**Files likely touched:**
- `src/pages/kontakt.astro`
- `src/components/forms/ContactForm.tsx`
- `src/pages/api/inquiries/contact.ts`
- `tests/unit/contact.test.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 13: Startseite (`/`), Über uns inkl. Chronik (`/ueber-uns`) & Werkstatt (`/werkstatt`)

**Description:** Gestaltet und implementiert die repräsentative Startseite `/` (Hero-Inszenierung, Marken-Kennzahlen seit 1967, Featured Showroom-Fahrzeuge aus D1, 4 Werkstattsäulen, Ricambi-Originali-Shop-Teaser, Kommissions-CTA), die konsolidierte Markenseite `/ueber-uns` (vereint die bisher getrennten Seiten `/about-us`, `/news` und die Chronik aus `/kontakt` inkl. 1967 / 1974 / 1981 / 1995 *European Dealer of the Year* + Team-Sektion) sowie die dedizierte Leistungsseite `/werkstatt` (vereint die 4 Supercar-Kernbereiche mit dem Leistungsangebot von `/service`).

**Acceptance criteria:**
- [ ] Jede der drei Seiten besitzt exakt **ein** semantisches `<h1>`, durchgängig fehlerfreies Deutsch und individuelle SEO-Metadaten.
- [ ] Die Startseite lädt Featured-Fahrzeuge und ausgewählte Originalteile dynamisch aus D1 und führt Besucher mit klaren CTAs in Showroom, Werkstatt, Shop und Kommission.
- [ ] `/ueber-uns` präsentiert lückenlos die Chronik 1967–Heute und das vierköpfige Team (Jason Kremer, Marvin Kremer, Barbara Kremer, Gena Kamin).

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Visuelle und semantische Prüfung (`<h1>`->`<h2>`->`<h3>`) auf `/`, `/ueber-uns` und `/werkstatt`.

**Dependencies:** Task 4, Task 7, Task 12

**Files likely touched:**
- `src/pages/index.astro`
- `src/pages/ueber-uns.astro`
- `src/pages/werkstatt.astro`
- `src/components/ui/TimelineSection.astro`

**Estimated scope:** Medium: 3-5 files

---

## Task 14: Rechtssichere Seiten (`/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/versand`)

**Description:** Überarbeitet und vervollständigt sämtliche Pflichtseiten für den deutschen Markt: `/impressum` nach aktuellem **§ 5 DDG** (ohne veraltetes TMG und ohne abgeschalteten EU-OS-Link, mit Platzhalter/Feld für USt-IdNr.), `/datenschutz` (korrigierte Telefonnummer `+49 228 463322`, aktuelles **§ 25 TDDDG**, transparente Darstellung von Cloudflare Hosting/Turnstile/Analytics, Stripe Checkout & Resend) sowie gewerbliche `/agb`, 14-Tage-`/widerruf` inkl. Muster-Widerrufsformular und `/versand`.

**Acceptance criteria:**
- [ ] Kein Vorkommen mehr von `§ 5 TMG`, `TTDSG`, `ec.europa.eu/consumers/odr`, Zahlendreher `462233` oder „Privatverkauf – Rückgabe ausgeschlossen“.
- [ ] Alle 5 Rechtsseiten nutzen saubere Typografie und semantische Überschriften (`<h1>`, `<h2>`, `<p>`) statt der bisherigen `<h6>`-Blöcke.
- [ ] Alle Rechtsseiten sind aus Footer, Produktdetailseite und Warenkorb erreichbar.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Volltextsuche über `src/` bestätigt Abwesenheit veralteter Gesetzeskürzel und fehlerhafter Kontaktdaten.

**Dependencies:** Task 2

**Files likely touched:**
- `src/pages/impressum.astro`
- `src/pages/datenschutz.astro`
- `src/pages/agb.astro`
- `src/pages/widerruf.astro`
- `src/pages/versand.astro`

**Estimated scope:** Medium: 3-5 files

---

## Checkpoint: After Tasks 11-14 (Content, Leads & Legal Complete)
- [ ] All unit tests pass and build succeeds
- [ ] Consignment wizard (with R2 image upload) and contact forms work end-to-end
- [ ] All brand, service, and legal pages are complete, unified in German, and linked cleanly

---

## Phase 5: Admin Backoffice, SEO, 301-Migration & Launch-Gate

## Task 15: Geschütztes `/admin`-Cockpit hinter Cloudflare Zero Trust Access

**Description:** Implementiert die Middleware-Absicherung für `/admin/*` und `/api/admin/*` mittels kryptografischer Prüfung des `Cf-Access-Jwt-Assertion`-Headers (Cloudflare Zero Trust Access) sowie ein übersichtliches Admin-Cockpit zum Anlegen/Bearbeiten von Fahrzeugen, **1-Klick-Statuswechsel „Als verkauft markieren“**, Anpassen von Ersatzteil-Preisen/Lagerbeständen und Einsehen eingegangener Anfragen & Bestellungen.

**Acceptance criteria:**
- [ ] Jeder Aufruf von `/admin/*` oder `/api/admin/*` ohne gültiges Cloudflare-Access-JWT wird im Produktionsmodus strikt mit HTTP 401/403 abgewiesen.
- [ ] Ein Fahrzeug lässt sich im Admin mit einem Klick von `available` auf `sold` setzen und wechselt sofort von `/fahrzeuge` nach `/referenzen`.
- [ ] Lagerbestand und Preis eines Ersatzteils lassen sich im Admin aktualisieren und wirken sofort im Shop & Checkout.

**Verification:**
- [ ] Tests pass: `npx vitest run tests/unit/admin-auth.test.ts`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Unautorisierter Zugriff liefert 401; autorisierter Dev-Zugriff aktualisiert Fahrzeugstatus und Teilebestand.

**Dependencies:** Task 5, Task 10, Task 11

**Files likely touched:**
- `src/middleware.ts`
- `src/layouts/AdminLayout.astro`
- `src/pages/admin/index.astro`
- `src/pages/api/admin/inventory.ts`
- `tests/unit/admin-auth.test.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 16: Wix-301-Redirect-Matrix, XML-Sitemap, Schema.org & E2E-Abnahme

**Description:** Hinterlegt alle statischen und dynamischen `301`-Weiterleitungen der alten Wix-URLs (`public/_redirects` + Middleware-Lookup für `/product-page/:oldSlug` -> `/shop/:cleanSlug` sowie `410 Gone` für leere Altseiten `/blog`, `/event-list`, `/payment-request-page`), generiert eine dynamische `/sitemap.xml` inkl. aller Fahrzeuge und Shop-Produkte, ergänzt globales `AutoDealer` & `AutoRepair` Schema.org JSON-LD und sichert alle Kernpfade plus Accessibility (`@axe-core/playwright`) per E2E-Suite ab.

**Acceptance criteria:**
- [ ] Alle 10 bisherigen Haupt-URLs (inkl. `/verkaufsraum`, `/sold-cars`, `/consign-your-car`, `/about-us`, `/contact-us`, `/category/all-products`, `/datenschutzerkl%C3%A4rung`) sowie `/product-page/*` antworten mit korrektem `301`-Redirect auf die neue Ziel-URL.
- [ ] `/sitemap.xml` und `/robots.txt` listen ausschließlich kanonische `200`-URLs (keine `404`/`301`/`/admin`-Pfade).
- [ ] Die Playwright-E2E- und Axe-Accessibility-Suite läuft ohne Fehler durch (0 kritische A11y-Verstöße, 0 kaputte interne Links).

**Verification:**
- [ ] Tests pass: `npm test && npm run test:e2e`
- [ ] Build succeeds: `npm run typecheck && npm run build`
- [ ] Manual check: Stichprobe aller 10 Alt-URLs per `curl -I` gegen die lokale Wrangler-Preview bestätigt exakte `301`-Header.

**Dependencies:** Task 13, Task 14, Task 15

**Files likely touched:**
- `public/_redirects`
- `public/robots.txt`
- `src/pages/sitemap.xml.ts`
- `src/middleware.ts`
- `tests/e2e/redirects-and-seo.spec.ts`

**Estimated scope:** Medium: 3-5 files

---

## Checkpoint: Complete (Production Release Gate)
- [ ] Alle 16 Aufgaben abgeschlossen und einzeln verifiziert
- [ ] Komplette Unit- und Playwright-E2E-Testsuite grün (`npm test && npm run test:e2e`)
- [ ] Produktions-Build für Cloudflare Workers fehlerfrei (`npm run build`)
- [ ] 100 % der alten Wix-Seiten und Produkt-URLs leiten verlustfrei weiter
- [ ] Bereit für Live-Deployment auf Cloudflare

