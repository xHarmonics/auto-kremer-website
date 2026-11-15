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
  integrations: [
    preact({ devtools: false }),
    {
      name: 'local-dev-admin-env-bridge',
      hooks: {
        'astro:config:setup': ({ command, updateConfig }) => {
          if (command === 'dev' && process.env.DEV_ADMIN_TOKEN) {
            updateConfig({
              vite: {
                environments: {
                  ssr: {
                    define: {
                      __ASTRO_DEV_ADMIN_TOKEN__: JSON.stringify(process.env.DEV_ADMIN_TOKEN),
                    },
                  },
                },
              },
            });
          }
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'preact',
        'preact/hooks',
        'preact/debug',
        'preact/devtools',
        'preact/jsx-runtime',
        'preact/jsx-dev-runtime',
        '@astrojs/preact/client.js',
        '@astrojs/preact/client-dev.js',
        '@astrojs/preact/server.js',
        '@nanostores/preact',
        'nanostores',
        'drizzle-orm',
        'drizzle-orm/d1',
        'drizzle-orm/sqlite-core',
        'zod',
      ],
    },
    resolve: {
      dedupe: [
        'preact',
        'preact/hooks',
        'preact/debug',
        'preact/devtools',
        'preact/jsx-runtime',
        'preact/jsx-dev-runtime',
        'preact-render-to-string',
        '@nanostores/preact',
        'nanostores',
      ],
    },
  },
});
