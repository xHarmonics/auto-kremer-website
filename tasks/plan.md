# Implementation Plan: Auto Kremer Website Relaunch (Cloudflare Edge + E-Commerce + Showroom)

## Overview
Vollständiger Neubau der Webseite von **Auto Kremer GbR (Bonn)** als pfeilschnelle, DSGVO- und DDG-konforme Luxus-Automobilplattform auf **Cloudflare Workers (mit Static Assets), Cloudflare D1 und Cloudflare R2**. Die Plattform vereint den **Fahrzeug-Showroom** (`/fahrzeuge` & `/referenzen`), den **Ricambi Originali Online-Shop** für 116+ originale Lamborghini-Ersatzteile inkl. **Stripe Checkout** (`/shop`), konversionsstarke **Lead-Formulare** für Fahrzeug-Kommission/Ankauf (`/fahrzeug-verkaufen`) und Werkstatt/Kontakt (`/werkstatt`, `/kontakt`), die zusammengeführte **Markenhistorie seit 1967** (`/ueber-uns`) sowie ein durch **Cloudflare Zero Trust Access** geschütztes **Backoffice** (`/admin`). Alle Aufgaben sind in kleine, vertikal geschnittene Inkremente in [`tasks/todo.md`](./todo.md) zerlegt.

## Architecture Decisions
- **Astro 5 (`@astrojs/cloudflare`) statt Next.js/Nuxt:** Liefert Marketing-, Showroom- und Produktseiten mit nahezu 0 KB Client-JS direkt von der Cloudflare Edge aus und nutzt leichtgewichtige **Preact Islands** ausschließlich für interaktive Inseln (Filter, OEM-Teilenummer-Suche, Slide-Over-Warenkorb, mehrstufiges Kommissionsformular).
- **Cloudflare D1 (SQLite) + Drizzle ORM als zentrale Datenquelle:** Verwaltet sowohl den Fahrzeugbestand (`available` / `reserved` / `sold`) als auch den 116+ Teile umfassenden Lamborghini-Ersatzteilkatalog inkl. `n:m`-Baureihenkompatibilität und atomarer Bestandsreservierung für Einzelstücke (*New Old Stock*, `stock = 1`) ohne monatliche SaaS-Shopgebühren.
- **Stripe Checkout + Stripe Webhooks + Resend (EU):** Übernimmt PCI-DSS-konform alle relevanten Zahlarten (Kreditkarte, Apple Pay, Google Pay, PayPal, Klarna, SEPA), berechnet Versandzonen (DE / EU / Weltweit versichert), bucht Bestände über signierte Webhooks idempotent ab und versendet Bestätigungen über `@auto-kremer.com` (ersetzt die fehlerhaften `mailto:info@mysite.com`- und Freemail-Links).
- **Cloudflare R2 + Cloudflare Images:** Speichert hochauflösende Fahrzeuggalerien und liefert sie automatisch als AVIF/WebP in passender Viewport-Größe aus; ein separater privater R2-Prefix nimmt Kundenfotos aus dem Kommissionsformular entgegen.
- **Cookiefreie DSGVO-Architektur ohne Cookie-Wall:** Selbstgehostete `.woff2`-Schriften (`Space Grotesk`, `Inter`, `JetBrains Mono`), **Cloudflare Turnstile** statt Google reCAPTCHA, **Cloudflare Web Analytics** ohne Tracking-Cookies, lokaler Warenkorb via `localStorage` (§ 25 Abs. 2 Nr. 2 TDDDG) und statische/2-Klick-Anfahrtskarte machen ein störendes Marketing-Cookie-Banner überflüssig.
- **Einheitliche deutsche URL-Struktur + 301-Migrationsnetz:** Konsolidiert doppelte und englische Wix-Pfade (`/contact-us` + `/kontakt` -> `/kontakt`; `/about-us` + `/news` -> `/ueber-uns`; `/verkaufsraum` -> `/fahrzeuge`; `/sold-cars` -> `/referenzen`; `/consign-your-car` -> `/fahrzeug-verkaufen`; `/category/all-products` -> `/shop`) verlustfrei per `301`-Weiterleitung.

## Dependency Graph

```text
Task 1: Astro 5 + Cloudflare + Tailwind v4 + Test-Harness Setup
  │
  └── Task 2: Design-System, Self-Hosted Fonts & Globales Layout (Header/Footer)
        │
        ├── [Slice A: Showroom]
        │     Task 3: D1 Schema + Seed für Fahrzeuge (5 verfügbar + 3 verkauft)
        │       └── Task 4: Showroom (/fahrzeuge) & Referenzen (/referenzen) + Filter-Insel
        │             └── Task 5: Fahrzeug-Detailseite (/fahrzeuge/[slug]) + Lightbox + Schema.org
        │
        ├── [Slice B: Ricambi Originali Shop]
        │     Task 6: D1 Schema + Bereinigungs-/Migrationsskript für 116 Wix-Ersatzteile
        │       └── Task 7: Shop-Übersicht (/shop) + Echtzeit-OEM-Suche & Modellfilter
        │             └── Task 8: Produkt-Detailseite (/shop/[slug]) + Nano-Stores Slide-Over-Warenkorb
        │                   └── Task 9: Stripe Checkout API (/api/checkout) + Bestandsreservierung
        │                         └── Task 10: Stripe Webhook (/api/webhooks/stripe) + Bestell-Mails + Erfolgsseiten
        │
        ├── [Slice C: Lead-Generierung, Marke & Rechtliches]
        │     ├── Task 11: Fahrzeug-Kommission (/fahrzeug-verkaufen) + R2 Foto-Upload + Turnstile + Resend
        │     ├── Task 12: Konsolidierte Kontaktseite (/kontakt) + Kontakt-/Fahrzeuganfrage-API
        │     ├── Task 13: Startseite (/), Über uns & Chronik 1967–Heute (/ueber-uns), Werkstatt (/werkstatt)
        │     └── Task 14: Rechtstexte (/impressum § 5 DDG, /datenschutz, /agb, /widerruf, /versand)
        │
        └── [Slice D: Backoffice & Launch-Härtung]
              ├── Task 15: Geschütztes /admin-Cockpit hinter Cloudflare Zero Trust Access
              └── Task 16: 301-Redirect-Matrix, XML-Sitemap, JSON-LD & E2E/Lighthouse-Abnahme
```

## Incremental Implementation Discipline
Jede Aufgabe aus [`tasks/todo.md`](./todo.md) wird nach dem Zyklus **Implement -> Test -> Verify -> Commit** umgesetzt:
1. Keine Aufgabe umfasst mehr als ~5 produktive Dateien (`Small` oder `Medium`).
2. Nach jedem Inkrement müssen `npm run typecheck`, `npm test` und `npm run build` fehlerfrei durchlaufen.
3. Vorzeitige Abstraktionen werden vermieden (*Simplicity First*): klare, typsichere Komponenten und direkte Drizzle-Queries statt generischer Meta-Frameworks.

## Task List

Vollständige Details, Akzeptanzkriterien und Verifikationsschritte stehen in [`tasks/todo.md`](./todo.md).

### Phase 1: Foundation & Design System Shell
- [x] Task 1: Projekt-Setup mit Astro 5, Cloudflare Workers, Tailwind CSS v4 & Test-Runner
- [x] Task 2: Design-Tokens, lokale Typografie & globales Seiten-Layout (Header, Mobile-Menü, Footer)

### Checkpoint 1: Foundation & Shell
- [x] `npm run typecheck`, `npm test` und `npm run build` laufen grün; lokale Wrangler-Preview rendert das Grundlayout auf Mobile & Desktop fehlerfrei.

### Phase 2: Vertical Slice — Fahrzeug-Showroom & Referenzen
- [x] Task 3: D1-Datenmodell, Migration & Seed-Daten für Fahrzeuge (Showroom & Verkaufte Ikonen)
- [x] Task 4: Showroom-Übersicht (`/fahrzeuge`) & Referenzen (`/referenzen`) inkl. Filter-Insel
- [x] Task 5: Fahrzeug-Detailansicht (`/fahrzeuge/[slug]`) mit Lightbox-Galerie, Tech-Specs & Direkt-Anfrage

### Checkpoint 2: Showroom End-to-End
- [x] Alle 5 Bestandsfahrzeuge und 3 Referenzfahrzeuge sind mit echten Detailseiten, Galerie und strukturierten Daten navigierbar; Unit- und E2E-Tests grün.

### Phase 3: Vertical Slice — Ricambi Originali Online-Shop & Stripe Checkout
- [x] Task 6: D1-Shop-Schema & Bereinigungs-Importer für alle 116 Lamborghini-Ersatzteile
- [x] Task 7: Shop-Katalogseite (`/shop`) mit Echtzeit-OEM-Teilenummersuche & Baureihen-Filter
- [x] Task 8: Produkt-Detailseite (`/shop/[slug]`) & persistenter Slide-Over-Warenkorb (PAngV-konform)
- [x] Task 9: Stripe-Checkout-Endpunkt (`/api/checkout`) mit atomarer Bestandsprüfung & Versandzonen
- [x] Task 10: Stripe-Webhook (`/api/webhooks/stripe`), Bestandsabbuchung, Resend-Bestellmail & Statusseiten

### Checkpoint 3: E-Commerce End-to-End
- [x] Kompletter Kaufprozess vom OEM-Filter über den Warenkorb bis zum Stripe-Test-Checkout und Webhook-Bestandsabzug (inkl. Schutz vor Überverkauf bei `stock = 1`) funktioniert End-to-End.

### Phase 4: Vertical Slice — Lead-Generierung, Markenwelt & Rechtliches
- [x] Task 11: Fahrzeug-Kommission (`/fahrzeug-verkaufen`) mit Multi-Step-Formular, R2-Foto-Upload & Turnstile
- [x] Task 12: Zusammengeführte Kontaktseite (`/kontakt`) & Anfrage-API für Fahrzeug-/Werkstatt-/Teileanfragen
- [x] Task 13: Startseite (`/`), Über uns inkl. Chronik seit 1967 (`/ueber-uns`) & Werkstatt-Seite (`/werkstatt`)
- [x] Task 14: Rechtssichere Seiten (`/impressum` nach § 5 DDG, `/datenschutz`, `/agb`, `/widerruf`, `/versand`)

### Checkpoint 4: Content, Leads & Legal Complete
- [x] Alle Inhalts-, Lead- und Rechtsseiten sind vollständig verlinkt, Formulare validieren server- und clientseitig, keine toten Links oder Platzhalter vorhanden.

### Phase 5: Admin Backoffice, SEO, 301-Migration & Launch-Gate
- [x] Task 15: Geschütztes `/admin`-Cockpit (Cloudflare Access JWT + CRUD für Fahrzeuge & Ersatzteile)
- [ ] Task 16: Vollständige Wix-301-Redirects, XML-Sitemap, Schema.org-Markup & Lighthouse/A11y-Audit

### Checkpoint 5: Production Release Gate
- [ ] Alle Akzeptanzkriterien erfüllt, 100 % der alten Wix-URLs leiten sauber um, Lighthouse Performance/SEO/Accessibility/Best Practices ≥ 95, bereit für Cloudflare-Produktiv-Deployment.

## Risks and Mitigations
| Risk | Impact | Mitigation |
| :--- | :---: | :--- |
| **Überverkauf von Einzelstück-Ersatzteilen (`stock = 1` NOS)** bei parallelen Checkouts | High | Atomares SQL-Update in D1 (`UPDATE products SET reserved_quantity = reserved_quantity + ? WHERE id = ? AND (stock_quantity - reserved_quantity) >= ?`) beim Erstellen der Stripe Checkout Session + automatische Freigabe über `checkout.session.expired` Webhook. |
| **SEO-Ranking- oder Bookmark-Verlust** durch Bereinigung fehlerhafter Wix-Produktnamen & `-1`-Duplikate | High | Statische + datenbankgestützte `old_wix_slug -> clean_slug` 301-Weiterleitungstabelle für alle 116 Produkt-URLs und alle 16 alten Seitenpfade. |
| **Rechtliche Abmahnung im deutschen E-Commerce** (wie beim bisherigen „Privatverkauf“-Text auf Wix) | High | Konsequente Ausweisung von *„inkl. 19 % MwSt., zzgl. Versandkosten“* (PAngV) an jeder Preisangabe, dedizierte Seiten `/agb`, `/widerruf` (14 Tage Widerrufsrecht), `/versand`, aktualisiertes `/impressum` (§ 5 DDG) und `/datenschutz` (§ 25 TDDDG). |
| **Große Bilduploads im Kommissionsformular** überschreiten Worker-Request-Limits | Medium | Clientseitige Bildkompprimierung/Validierung (max. 8 Fotos, Dateityp- & Größenprüfung) sowie direkter Stream-/Presigned-Upload nach Cloudflare R2. |
| **Fehlende E-Mail-Zustellbarkeit** bei Kontakt- & Bestellmails | Medium | Versand ausschließlich über verifizierte Domain `@auto-kremer.com` via Resend (EU-Region `eu-west-1` mit SPF/DKIM/DMARC) plus persistente Speicherung jeder Anfrage in D1 (`inquiries`-Tabelle), sodass kein Lead je verloren geht. |

## Best-Practice Decisions Applied (Keine offenen Blocker)
- **Sprachstrategie:** Primär durchgängiges, stilvolles Deutsch (`de-DE`) auf allen Seiten und URLs (beendet den aktuellen DE/EN-Mischmasch); Architektur ist für eine spätere saubere `/en/`-Erweiterung vorbereitet.
- **Fahrzeugpreise im Showroom:** Unterstützt sowohl konkrete Euro-Preise (mit Differenzbesteuerungs-Hinweis nach § 25a UStG oder ausweisbarer MwSt.) als auch *„Preis auf Anfrage“* für hochpreisige Sammlerfahrzeuge wie Murciélago oder 993 Carrera RS Clubsport.
- **Einheitliche Markenkommunikation:** Alle Kontaktpunkte laufen künftig über `@auto-kremer.com` und `+49 228 463322` / `+49 228 94694567` (keine `@gmail.com`- oder `@web.de`-Adressen mehr im Frontend).

