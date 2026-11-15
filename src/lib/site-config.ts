export const SITE_CONFIG = {
  name: 'Auto Kremer',
  legalName: 'Auto Kremer GbR',
  tagline: 'Spezialist für Lamborghini & klassische Sportwagen seit 1967',
  foundedYear: 1967,
  founders: 'Dieter & Marlene Kremer',
  owners: ['Jason Kremer', 'Marvin Kremer'],
  url: 'https://www.auto-kremer.com',
  locale: 'de-DE',
  address: {
    street: 'Buchenweg 3',
    postalCode: '53227',
    city: 'Bonn',
    district: 'Oberkassel',
    region: 'Nordrhein-Westfalen',
    countryCode: 'DE',
    countryName: 'Deutschland',
  },
  geo: {
    latitude: 50.7148,
    longitude: 7.1638,
  },
  contact: {
    phonePrimary: '+49228463322',
    phonePrimaryDisplay: '+49 (0) 228 46 33 22',
    phoneSecondary: '+4922894694567',
    phoneSecondaryDisplay: '+49 (0) 228 94 69 45 67',
    whatsappHref: 'https://wa.me/49228463322',
    email: 'info@auto-kremer.com',
  },
  openingHours: {
    weekdays: 'Mo – Fr: 08:30 – 18:00 Uhr',
    saturday: 'Sa: nach Vereinbarung',
    schemaSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:30',
        closes: '18:00',
      },
    ],
  },
  social: {
    instagram: 'https://www.instagram.com/lamborghini_kremer/',
    instagramHandle: '@lamborghini_kremer',
    mobileDe: 'https://home.mobile.de/AUTOKREMERBONN',
  },
  maps: {
    googleMapsDirectionsUrl:
      'https://www.google.com/maps/search/?api=1&query=Auto+Kremer+Buchenweg+3+53227+Bonn',
    appleMapsDirectionsUrl:
      'https://maps.apple.com/?q=Auto+Kremer&address=Buchenweg+3,53227+Bonn,Germany',
  },
  navItems: [
    { label: 'Fahrzeuge', href: '/fahrzeuge' },
    { label: 'Referenzen', href: '/referenzen' },
    { label: 'Werkstatt', href: '/werkstatt' },
    { label: 'Teile-Shop', href: '/shop' },
    { label: 'Über uns', href: '/ueber-uns' },
  ],
  legalLinks: [
    { label: 'Impressum', href: '/impressum' },
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'AGB', href: '/agb' },
    { label: 'Widerrufsbelehrung', href: '/widerruf' },
    { label: 'Versand & Zahlung', href: '/versand' },
  ],
} as const;

export function buildAutoDealerJsonLd(siteOrigin = SITE_CONFIG.url) {
  return {
    '@context': 'https://schema.org',
    '@type': ['AutoDealer', 'AutoRepair'],
    '@id': `${siteOrigin}/#organization`,
    name: SITE_CONFIG.legalName,
    alternateName: 'Auto Kremer Bonn',
    description:
      'Unabhängiger Spezialist für Automobili Lamborghini, italienische Klassiker und Sportwagen in Bonn seit 1967. Fahrzeugverkauf, Kommission, Meisterwerkstatt, Vollrestauration und Ricambi Originali Ersatzteil-Shop.',
    url: siteOrigin,
    foundingDate: '1967',
    telephone: SITE_CONFIG.contact.phonePrimary,
    email: SITE_CONFIG.contact.email,
    priceRange: '€€€€',
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.address.street,
      postalCode: SITE_CONFIG.address.postalCode,
      addressLocality: SITE_CONFIG.address.city,
      addressRegion: SITE_CONFIG.address.region,
      addressCountry: SITE_CONFIG.address.countryCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE_CONFIG.geo.latitude,
      longitude: SITE_CONFIG.geo.longitude,
    },
    openingHoursSpecification: SITE_CONFIG.openingHours.schemaSpecification,
    sameAs: [SITE_CONFIG.social.instagram, SITE_CONFIG.social.mobileDe],
  };
}
