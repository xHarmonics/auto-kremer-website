export interface SeedVehicle {
  slug: string;
  title: string;
  brand: 'Lamborghini' | 'Porsche' | 'Alfa Romeo';
  model: string;
  year: number;
  mileageKm: number | null;
  powerPs: number;
  powerKw: number;
  displacementCc: number;
  engineType: string;
  transmission: 'Handschaltung' | 'Automatik / E-Gear';
  drivetrain: string;
  fuelType: string;
  exteriorColor: string;
  interiorColor: string;
  priceCents: number | null;
  priceOnRequest: boolean;
  vatDeductible: boolean;
  status: 'available' | 'reserved' | 'sold';
  featured: boolean;
  summary: string;
  description: string;
  highlights: string[];
  mobileDeUrl: string | null;
  sortOrder: number;
  images: Array<{
    url: string;
    alt: string;
  }>;
}

export const SEED_VEHICLES: SeedVehicle[] = [
  {
    slug: 'lamborghini-murcielago-6-2-v12',
    title: 'Lamborghini Murciélago 6.2 V12 Coupé',
    brand: 'Lamborghini',
    model: 'Murciélago',
    year: 2003,
    mileageKm: 34800,
    powerPs: 580,
    powerKw: 426,
    displacementCc: 6192,
    engineType: '6,2 l V12-Saugmotor (60° Bankwinkel)',
    transmission: 'Automatik / E-Gear',
    drivetrain: 'Permanenter Allradantrieb (VT)',
    fuelType: 'Benzin',
    exteriorColor: 'Nero Aldebaran Metallic',
    interiorColor: 'Vollleder Nero Perseus / Kontrastnaht',
    priceCents: null,
    priceOnRequest: true,
    vatDeductible: false,
    status: 'available',
    featured: true,
    summary:
      'Der Lamborghini Murciélago der frühen 2000er – ein zeitloser V12-Supersportwagen mit dem letzten klassischen Bizzarrini-Zwölfzylinderblock.',
    description:
      'Der Lamborghini Murciélago markiert den Beginn einer neuen Ära in Sant’Agata Bolognese unter der Designsprache von Luc Donckerwolke – und bewahrt zugleich die ungefilterte Seele des klassischen 6,2-Liter-V12-Saugmotors. Dieses gepflegte Exemplar aus der begehrten ersten Serie wurde in unserer Bonner Fachwerkstatt umfassend geprüft und dokumentiert. Scherentüren, variable Lufteinlässe (VACS) und eine kompromisslose Präsenz machen ihn zu einem wertstabilen Sammlerstück erster Güte.',
    highlights: [
      'Begehrte Erstserie (6,2-Liter-V12 mit 580 PS / 426 kW)',
      'Umfassende technische Durchsicht & Diagnose durch Auto Kremer Bonn',
      'Originales Bordbuch, Servicehistorie & Zweitschlüssel vorhanden',
      'Variable Lufteinlässe (VACS) & klassische Lamborghini-Scherentüren',
      'Differenzbesteuert gemäß § 25a UStG',
    ],
    mobileDeUrl: 'https://suchen.mobile.de/fahrzeuge/details.html?id=432623451',
    sortOrder: 1,
    images: [
      {
        url: '/media/vehicles/murcielago-v12-1.avif',
        alt: 'Lamborghini Murciélago 6.2 V12 Coupé Front-Seitenansicht im Showroom von Auto Kremer',
      },
      {
        url: '/media/vehicles/murcielago-v12-2.avif',
        alt: 'Lamborghini Murciélago 6.2 V12 Detail- und Heckansicht',
      },
      {
        url: '/media/vehicles/murcielago-v12-3.avif',
        alt: 'Lamborghini Murciélago 6.2 V12 Interieur und Cockpit',
      },
    ],
  },
  {
    slug: 'lamborghini-gallardo-5-0-handschalter',
    title: 'Lamborghini Gallardo 5.0 V10 Handschalter',
    brand: 'Lamborghini',
    model: 'Gallardo Coupé',
    year: 2004,
    mileageKm: 41200,
    powerPs: 500,
    powerKw: 368,
    displacementCc: 4961,
    engineType: '5,0 l V10-Saugmotor (Even-Firing)',
    transmission: 'Handschaltung',
    drivetrain: 'Permanenter Allradantrieb',
    fuelType: 'Benzin',
    exteriorColor: 'Giallo Midas Perleffekt',
    interiorColor: 'Leder Nero / Gelbe Ziernähte',
    priceCents: 13890000,
    priceOnRequest: false,
    vatDeductible: false,
    status: 'available',
    featured: true,
    summary:
      'Lamborghini Gallardo 5.0 mit extrem seltener offener 6-Gang-Handschaltung – purer V10-Klang und unverfälschte Mechanik.',
    description:
      'Der manuell geschaltete Lamborghini Gallardo 5.0 zählt weltweit zu den begehrtesten Varianten seiner Baureihe und steht sinnbildlich für die letzte Ära analoger Mittelmotor-Sportwagen aus Sant’Agata. Jedes Einrasten in der offenen Metall-Schaltkulisse verbindet den Fahrer unmittelbar mit dem hochdrehenden Fünfliter-Zehnzylinder. Ein authentisches Sammlerfahrzeug mit hohem Wertsteigerungspotenzial, geprüft durch unsere Lamborghini-Spezialisten.',
    highlights: [
      'Werkseitiges 6-Gang-Schaltgetriebe mit offener Aluminium-Schaltkulisse',
      'Klassischer 5,0-Liter-V10-Saugmotor ohne Partikelfilter mit unvergleichlichem Klangbild',
      'Scheckheftgepflegter Zustand inklusive Kupplungs- und Verschleißprotokoll',
      'Aluminium-Spaceframe-Karosserie in ikonischem Giallo Midas',
      'Verkauf im Kundenauftrag / Differenzbesteuert gemäß § 25a UStG',
    ],
    mobileDeUrl: 'https://suchen.mobile.de/fahrzeuge/details.html?id=438968054',
    sortOrder: 2,
    images: [
      {
        url: '/media/vehicles/gallardo-manual-1.avif',
        alt: 'Lamborghini Gallardo 5.0 V10 Handschalter Außenansicht',
      },
      {
        url: '/media/vehicles/gallardo-manual-2.avif',
        alt: 'Lamborghini Gallardo 5.0 V10 Seitenlinie und Leichtmetallfelgen',
      },
      {
        url: '/media/vehicles/gallardo-manual-3.avif',
        alt: 'Lamborghini Gallardo 5.0 V10 offene 6-Gang-Schaltkulisse im Innenraum',
      },
    ],
  },
  {
    slug: 'porsche-993-carrera-rs-clubsport-1995',
    title: 'Porsche 911 (993) Carrera RS Clubsport',
    brand: 'Porsche',
    model: '993 Carrera RS Clubsport',
    year: 1995,
    mileageKm: 58400,
    powerPs: 300,
    powerKw: 221,
    displacementCc: 3746,
    engineType: '3,8 l 6-Zylinder-Boxermotor luftgekühlt (M64/20, VarioRam)',
    transmission: 'Handschaltung',
    drivetrain: 'Hinterradantrieb mit Sperrdifferenzial',
    fuelType: 'Benzin',
    exteriorColor: 'Indischrot / Speedgelb Akzent',
    interiorColor: 'Clubsport-Schalensitze Nomex Schwarz',
    priceCents: null,
    priceOnRequest: true,
    vatDeductible: false,
    status: 'available',
    featured: true,
    summary:
      'Originaler Porsche 993 RS Clubsport aus 1995 – deutsche Erstauslieferung, lückenlose Historie mit Büchern, Scheckheft und japanischer Dokumentation.',
    description:
      'Als kompromisslose Homologationsversion für den internationalen GT-Sport stellt der Porsche 993 Carrera RS Clubsport (Werkscode M003) die Krönung der luftgekühlten 911-Historie dar. Dieses originale Exemplar aus dem Baujahr 1995 wurde erstmals in Deutschland ausgeliefert, später in eine renommierte japanische Sammlung exportiert und nun nach Deutschland re-importiert. Vollständige Bordmappe, Original-Scheckheft sowie sämtliche japanischen Wartungs- und Prüfberichte belegen die außergewöhnliche Authentizität.',
    highlights: [
      'Echter Werkscode M003 Clubsport mit eingeschweißtem Matter-Überrollkäfig',
      'Deutsche Erstauslieferung (C00) aus 1995 mit vollständigem Scheckheft',
      'Lückenlose Historie inkl. Bordbüchern und japanischen Inspektionsberichten',
      '3,8-Liter-VarioRam-Saugmotor (M64/20) mit 6-Gang-Schaltgetriebe G50/31',
      'Dreiteilige 18-Zoll-Speedline-for-Porsche-Leichtmetallräder & Aerokit-Heckflügel',
    ],
    mobileDeUrl: 'https://suchen.mobile.de/fahrzeuge/details.html?id=431199459',
    sortOrder: 3,
    images: [
      {
        url: '/media/vehicles/porsche-993-rs-1.avif',
        alt: 'Porsche 993 Carrera RS Clubsport (1995) Front- und Seitenansicht',
      },
      {
        url: '/media/vehicles/porsche-993-rs-2.avif',
        alt: 'Porsche 993 Carrera RS Clubsport Heckflügel und Speedline-Felgen',
      },
      {
        url: '/media/vehicles/porsche-993-rs-3.avif',
        alt: 'Porsche 993 Carrera RS Clubsport Innenraum mit Schalensitzen und Überrollkäfig',
      },
    ],
  },
  {
    slug: 'lamborghini-gallardo-spyder-5-0',
    title: 'Lamborghini Gallardo Spyder 5.0 V10',
    brand: 'Lamborghini',
    model: 'Gallardo Spyder',
    year: 2007,
    mileageKm: 46900,
    powerPs: 520,
    powerKw: 382,
    displacementCc: 4961,
    engineType: '5,0 l V10-Saugmotor',
    transmission: 'Automatik / E-Gear',
    drivetrain: 'Permanenter Allradantrieb',
    fuelType: 'Benzin',
    exteriorColor: 'Nero Noctis',
    interiorColor: 'Bicolor Leder Nero / Giallo Taurus',
    priceCents: 11490000,
    priceOnRequest: false,
    vatDeductible: false,
    status: 'available',
    featured: false,
    summary:
      'Offenes V10-Supercar mit 520 PS, elektrohydraulischem Stoffverdeck, Allradantrieb und über 310 km/h Höchstgeschwindigkeit.',
    description:
      'Zwischen 2006 und 2008 gefertigt, vereint der Lamborghini Gallardo Spyder 5.0 die keilförmige Linienführung des Centro Stile Lamborghini mit einem unmittelbaren Open-Air-Klangerlebnis. Mit gesteigerter Leistung von 520 PS, kürzer übersetztem Getriebe und versenkbarer Heckscheibe lässt sich die Symphonie des Zehnzylinders sowohl offen als auch geschlossen intensiv erleben. In unserer Bonner Werkstatt technisch aufbereitet und sofort einsatzbereit.',
    highlights: [
      'Leistungsgesteigerte 520-PS-Ausbaustufe mit kürzerer Getriebeübersetzung',
      'Vollautomatisches Verdeck mit separat absenkbarer Glas-Heckscheibe',
      'Vorderachs-Liftsystem & Rückfahrkamera',
      'Frische Inspektion inkl. Flüssigkeits- und Diagnoseprotokoll bei Auto Kremer',
      'Differenzbesteuert gemäß § 25a UStG',
    ],
    mobileDeUrl: 'https://suchen.mobile.de/fahrzeuge/details.html?id=430841489',
    sortOrder: 4,
    images: [
      {
        url: '/media/vehicles/gallardo-spyder-1.avif',
        alt: 'Lamborghini Gallardo Spyder 5.0 offen in der Seitenansicht',
      },
      {
        url: '/media/vehicles/gallardo-spyder-2.avif',
        alt: 'Lamborghini Gallardo Spyder 5.0 Heckansicht und Vierrohr-Abgasanlage',
      },
      {
        url: '/media/vehicles/gallardo-spyder-3.avif',
        alt: 'Lamborghini Gallardo Spyder 5.0 Cockpit und Lederausstattung',
      },
    ],
  },
  {
    slug: 'alfa-romeo-4c-2016',
    title: 'Alfa Romeo 4C Coupé Carbon-Monocoque',
    brand: 'Alfa Romeo',
    model: '4C',
    year: 2016,
    mileageKm: 28500,
    powerPs: 241,
    powerKw: 177,
    displacementCc: 1742,
    engineType: '1,75 l 4-Zylinder-Turbomotor Vollaluminium',
    transmission: 'Automatik / E-Gear',
    drivetrain: 'Hinterradantrieb (Mittelmotor)',
    fuelType: 'Benzin',
    exteriorColor: 'Rosso Alfa / Sichtcarbon',
    interiorColor: 'Sportsitze Leder / Mikrofaser mit roter Naht',
    priceCents: 6490000,
    priceOnRequest: false,
    vatDeductible: false,
    status: 'available',
    featured: false,
    summary:
      'Italienische Leichtbaukunst in reinster Form: unter 900 kg Trockengewicht, Carbon-Monocoque aus Modena, nur zwei Vorbesitzer und lückenlos scheckheftgepflegt.',
    description:
      'Als Hommage an den legendären Tipo 33 Stradale wird der Alfa Romeo 4C rund um ein nur 65 Kilogramm leichtes Kohlefaser-Monocoque aufgebaut – gefertigt in Modena. Ohne Servolenkung, mit einem Leistungsgewicht von unter 4 kg/PS und unmittelbarer Rückmeldung ist dieses Exemplar aus dem Modelljahr 2016 ein kompromissloses Fahrerauto für Puristen. Mit lediglich zwei Vorbesitzern und lückenloser Wartungshistorie.',
    highlights: [
      'Ultraleichtes Prepreg-Carbon-Monocoque (895 kg Trockengewicht)',
      'Nur 2 Vorbesitzer & lückenlos scheckheftgepflegt',
      'Alfa TCT 6-Gang-Doppelkupplungsgetriebe mit Schaltwippen & DNA-Fahrmodi inkl. Race',
      'Puristische Direktlenkung ohne Servounterstützung für ungefiltertes Feedback',
      'Traditionsmarke unseres Hauses seit unserer Gründung 1967',
    ],
    mobileDeUrl: 'https://suchen.mobile.de/fahrzeuge/details.html?id=438772501',
    sortOrder: 5,
    images: [
      {
        url: '/media/vehicles/alfa-4c-1.avif',
        alt: 'Alfa Romeo 4C Coupé (2016) Front-Seitenansicht',
      },
      {
        url: '/media/vehicles/alfa-4c-2.avif',
        alt: 'Alfa Romeo 4C Coupé Seitenprofil und Lufteinlässe',
      },
      {
        url: '/media/vehicles/alfa-4c-3.avif',
        alt: 'Alfa Romeo 4C Coupé Sichtcarbon-Monocoque und Innenraum',
      },
    ],
  },
  // --- SOLD REFERENCE ICONS (/referenzen) ---
  {
    slug: 'referenz-lamborghini-murcielago-giallo',
    title: 'Lamborghini Murciélago 6.2 V12 Erstserie',
    brand: 'Lamborghini',
    model: 'Murciélago',
    year: 2002,
    mileageKm: 29400,
    powerPs: 580,
    powerKw: 426,
    displacementCc: 6192,
    engineType: '6,2 l V12-Saugmotor',
    transmission: 'Handschaltung',
    drivetrain: 'Permanenter Allradantrieb (VT)',
    fuelType: 'Benzin',
    exteriorColor: 'Giallo Orion Metallic',
    interiorColor: 'Leder Nero',
    priceCents: null,
    priceOnRequest: true,
    vatDeductible: false,
    status: 'sold',
    featured: false,
    summary:
      'Verkaufte Sammler-Referenz: Früher Murciélago 6.2 V12 in ikonischer Werkskonfiguration – vermittelt in eine europäische Privatsammlung.',
    description:
      'Dieses herausragende Exemplar des frühen Lamborghini Murciélago wurde durch Auto Kremer technisch betreut, aufbereitet und erfolgreich an einen langjährigen Sammler übergeben. Als Referenz steht dieses Fahrzeug exemplarisch für unseren Anspruch bei Ankauf, technischer Revision und diskreter Vermittlung seltener Zwölfzylinder aus Sant’Agata.',
    highlights: [
      'Erfolgreich durch Auto Kremer Bonn in Sammlerhand vermittelt',
      'Komplette große V12-Inspektion in unserer Fachwerkstatt vor Übergabe',
      'Originale Erstserien-Spezifikation mit dokumentierter Historie',
    ],
    mobileDeUrl: null,
    sortOrder: 10,
    images: [
      {
        url: '/media/vehicles/sold-murcielago-1.avif',
        alt: 'Verkaufter Lamborghini Murciélago 6.2 V12 Referenzfahrzeug bei Auto Kremer',
      },
      {
        url: '/media/vehicles/sold-murcielago-2.avif',
        alt: 'Lamborghini Murciélago Referenz Heck- und Seitenansicht',
      },
      {
        url: '/media/vehicles/sold-murcielago-3.avif',
        alt: 'Lamborghini Murciélago Referenz Detailansicht',
      },
    ],
  },
  {
    slug: 'referenz-lamborghini-diablo-se30',
    title: 'Lamborghini Diablo SE30 (30th Anniversary Limited Edition)',
    brand: 'Lamborghini',
    model: 'Diablo SE30',
    year: 1994,
    mileageKm: 21800,
    powerPs: 525,
    powerKw: 386,
    displacementCc: 5707,
    engineType: '5,7 l V12-Saugmotor mit Magnesium-Ansaugtrakt',
    transmission: 'Handschaltung',
    drivetrain: 'Hinterradantrieb',
    fuelType: 'Benzin',
    exteriorColor: 'Viola SE30 Metallic',
    interiorColor: 'Alcantara Blu / Carbon',
    priceCents: null,
    priceOnRequest: true,
    vatDeductible: false,
    status: 'sold',
    featured: false,
    summary:
      'Verkaufte Ikone: Eines von weltweit nur 150 gebauten Jubiläumsmodellen zum 30-jährigen Bestehen von Automobili Lamborghini.',
    description:
      'Zum 30-jährigen Markenjubiläum präsentierte Lamborghini 1994 den kompromisslos erleichterten Diablo SE30 mit Hinterradantrieb, Magnesium-Komponenten, Carbon-Karosserieteilen und 525 PS. Als ehemaliger offizieller Vertragshändler („European Dealer of the Year 1995“) verbindet unser Haus eine tiefe Historie mit der Diablo-Baureihe. Dieses seltene Jubiläumsfahrzeug wurde durch Auto Kremer erfolgreich vermittelt.',
    highlights: [
      'Streng limitierte Sonderserie (1 von weltweit 150 Exemplaren)',
      'Gewichtsreduzierte Leichtbau-Spezifikation mit reinem Hinterradantrieb',
      '5,7-Liter-V12 mit 525 PS und offener 5-Gang-Schaltkulisse',
    ],
    mobileDeUrl: null,
    sortOrder: 11,
    images: [
      {
        url: '/media/vehicles/sold-diablo-se30-1.avif',
        alt: 'Verkaufter Lamborghini Diablo SE30 Jubiläumsmodell bei Auto Kremer Bonn',
      },
      {
        url: '/media/vehicles/sold-diablo-se30-2.avif',
        alt: 'Lamborghini Diablo SE30 Seitenlinie und OZ-Magnesiumfelgen',
      },
      {
        url: '/media/vehicles/sold-diablo-se30-3.avif',
        alt: 'Lamborghini Diablo SE30 Heckansicht und V12-Motorraum',
      },
    ],
  },
  {
    slug: 'referenz-lamborghini-jarama-400-gt',
    title: 'Lamborghini Jarama 400 GT (Bertone V12 Gran Turismo)',
    brand: 'Lamborghini',
    model: 'Jarama 400 GT',
    year: 1972,
    mileageKm: 63500,
    powerPs: 350,
    powerKw: 257,
    displacementCc: 3929,
    engineType: '3,9 l V12-Saugmotor mit 6 Weber-Doppelvergasern (40 DCOE)',
    transmission: 'Handschaltung',
    drivetrain: 'Hinterradantrieb',
    fuelType: 'Benzin',
    exteriorColor: 'Argento / Klassisch Metallic',
    interiorColor: 'Vollleder Senape / Schwarz',
    priceCents: null,
    priceOnRequest: true,
    vatDeductible: false,
    status: 'sold',
    featured: false,
    summary:
      'Verkaufter Klassiker: Seltener Marcello-Gandini-Entwurf für Carrozzeria Bertone mit sechs Weber-Doppelvergasern – eines von nur 177 gebauten 400 GT Exemplaren.',
    description:
      'Der von Marcello Gandini bei Bertone gezeichnete Lamborghini Jarama 400 GT gehörte zu Ferruccio Lamborghinis persönlichen Lieblingsfahrzeugen: ein souveräner 2+2-Gran-Turismo mit verkürztem Espada-Chassis und dem legendären 3,9-Liter-Vier-Nockenwellen-V12. Mit nur 177 produzierten Exemplaren der ersten Serie ist der Jarama heute eine hochgeschätzte Rarität auf internationalen Concours-Veranstaltungen.',
    highlights: [
      'Nur 177 gefertigte Exemplare der Serie I (Jarama 400 GT)',
      'Klassischer 3,9-Liter-DOHC-V12 mit sechs Weber-40-DCOE-Vergasern',
      'Ikonisches Design von Marcello Gandini (Carrozzeria Bertone) mit halbverdeckten Klappscheinwerfern',
    ],
    mobileDeUrl: null,
    sortOrder: 12,
    images: [
      {
        url: '/media/vehicles/sold-jarama-1.avif',
        alt: 'Verkaufter Lamborghini Jarama 400 GT Klassiker bei Auto Kremer Bonn',
      },
      {
        url: '/media/vehicles/sold-jarama-2.avif',
        alt: 'Lamborghini Jarama 400 GT Bertone-Linienführung und Campagnolo-Felgen',
      },
      {
        url: '/media/vehicles/sold-jarama-3.avif',
        alt: 'Lamborghini Jarama 400 GT klassisches Interieur und V12-Vergaseranlage',
      },
    ],
  },
];
