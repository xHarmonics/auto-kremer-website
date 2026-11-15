import { describe, expect, it } from 'vitest';
import { SITE_CONFIG, buildAutoDealerJsonLd } from '@/lib/site-config';

describe('SITE_CONFIG & AutoDealer Schema.org', () => {
  it('contains unified Bonn contact data without legacy Wix typos or freemail addresses', () => {
    expect(SITE_CONFIG.address.street).toBe('Buchenweg 3');
    expect(SITE_CONFIG.address.postalCode).toBe('53227');
    expect(SITE_CONFIG.address.city).toBe('Bonn');

    expect(SITE_CONFIG.contact.phonePrimary).toBe('+49228463322');
    expect(SITE_CONFIG.contact.phonePrimary).not.toContain('462233');
    expect(SITE_CONFIG.contact.email).toBe('info@auto-kremer.com');
    expect(SITE_CONFIG.contact.email).not.toContain('mysite.com');
    expect(SITE_CONFIG.contact.email).not.toContain('gmail.com');
    expect(SITE_CONFIG.contact.email).not.toContain('web.de');
  });

  it('exposes all 5 primary navigation pillars and 5 required German legal pages', () => {
    expect(SITE_CONFIG.navItems.map((i) => i.href)).toEqual([
      '/fahrzeuge',
      '/referenzen',
      '/werkstatt',
      '/shop',
      '/ueber-uns',
    ]);
    expect(SITE_CONFIG.legalLinks.map((l) => l.href)).toEqual([
      '/impressum',
      '/datenschutz',
      '/agb',
      '/widerruf',
      '/versand',
    ]);
  });

  it('generates valid Schema.org AutoDealer & AutoRepair JSON-LD', () => {
    const schema = buildAutoDealerJsonLd('https://www.auto-kremer.com');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toEqual(['AutoDealer', 'AutoRepair']);
    expect(schema.foundingDate).toBe('1967');
    expect(schema.address.postalCode).toBe('53227');
  });
});
