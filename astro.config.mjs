import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.auto-kremer.com',
  output: 'server',
  session: {
    driver: sessionDrivers.memory(),
  },
  adapter: cloudflare({
    imageService: 'passthrough',
    experimental: {
      headersAndRedirectsDevModeSupport: true,
    },
  }),
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
