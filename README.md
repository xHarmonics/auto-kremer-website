# Auto Kremer Bonn — Website, Showroom & Ricambi Originali Shop

Kompletter Redesign- und Edge-Rebuild von **https://www.auto-kremer.com** (Auto Kremer GbR, Bonn · gegründet 1967) auf **Cloudflare Workers (mit Static Assets), Cloudflare D1 und Cloudflare R2**.

## Architektur-Überblick

- **Frontend & Edge-SSR:** Astro 7 (`@astrojs/cloudflare`), Preact Islands (nur für interaktive Inseln), Tailwind CSS v4 (*Dark Editorial Luxury*), lokal gehostete Variable Fonts (`Space Grotesk`, `Inter`, `JetBrains Mono`) und lokale AVIF-Medien (**0 externe CDN-/Drittanbieter-Requests**).
- **Datenbank & Medien:** Cloudflare D1 (SQLite) + Drizzle ORM (`vehicles`, `vehicle_images`, `products`, `product_models`, `legacy_product_redirects`, `orders`, `order_items`, `stripe_webhook_events`, `inquiries`) sowie Cloudflare R2 (`MEDIA_BUCKET`) für geschützte Kunden-Bilduploads im Kommissionsformular.
- **E-Commerce (`Ricambi Originali`):** 96 bereinigte, deduplizierte Original-Lamborghini-Ersatzteile (aus allen 116 bisherigen Wix-Artikeln inkl. verlustfreier `301`-Weiterleitung aller `/product-page/*`-URLs), Echtzeit-OEM-Teilenummersuche, atomare 30-Minuten-Bestandsreservierung gegen Überverkauf und **Stripe Sandbox Checkout** (`assertSandboxOnly()` verhindert zuverlässig jede Verwendung von `sk_live_`/`pk_live_`/`rk_live_`-Schlüsseln).
- **Recht & Datenschutz:** Aktualisiertes Impressum nach **§ 5 DDG**, Datenschutzerklärung nach **DSGVO & § 25 TDDDG** (cookiefrei ohne Tracking-Wall), gewerbliche **AGB**, gesetzliche **14-Tage-Widerrufsbelehrung** und **Versandübersicht**.
- **Backoffice (`/admin`):** Geschützt hinter **Cloudflare Zero Trust Access** (kryptografische RS256-JWT-Prüfung gegen `Cf-Access-Jwt-Assertion`) mit 1-Klick-Statuswechsel (*„Als verkauft markieren“*), Fahrzeuganlage sowie Schnellpflege von Teilepreisen und Lagerbeständen.

## Lokale Entwicklung & Verifikation

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Lokale D1-Datenbank migrieren & mit Fahrzeugen + 96 OEM-Teilen befüllen
npm run db:migrate:local
npm run db:seed:local

# 3. Entwicklungsserver starten
npm run dev

# 4. Typecheck, Unit-Tests (Vitest) & Produktions-Build prüfen
npm run typecheck
npm test
npm run build

# 5. Vollständige Playwright E2E- & Axe WCAG-AA-Suite gegen Wrangler / workerd ausführen
npm run test:e2e
```

## Umgebungsvariablen (nur Sandbox für Stripe!)

Kopieren Sie `.env.example` bei Bedarf nach `.dev.vars` (wird von Git ignoriert). Hinterlegen Sie für Stripe **ausschließlich Test-/Sandbox-Schlüssel (`sk_test_...`)** – Live-Schlüssel werden von `src/lib/stripe.ts` und `POST /api/webhooks/stripe` strikt abgewiesen.
