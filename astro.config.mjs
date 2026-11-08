import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://astro.build/config
export default defineConfig({
  site: 'https://ch1mpleo.github.io',
  // Only prefix with /visual-portfolio in production; dev server serves public/ from root
  base: process.env.NODE_ENV === 'production' ? '/visual-portfolio' : '/',

  scopedStyleStrategy: 'class',
  // Preserve HTML whitespace behavior from Astro 5 (Astro 7 defaults to JSX rules).
  compressHTML: true,

  server: {
    host: '127.0.0.1',
  },

  vite: {
    resolve: {
      alias: {
        '@/': `${path.resolve(__dirname, 'src')}/`
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use 'sass:math'; @use 'sass:map'; @use "@/styles/import" as *;`
        }
      }
    },
    build: {
      assetsInlineLimit: 0
    }
  },

  devToolbar: {
    enabled: false
  }
});
