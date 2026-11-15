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
  integrations: [preact({ devtools: false })],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['preact', 'preact/hooks', 'preact/jsx-runtime', 'preact-render-to-string'],
    },
  },
});
