import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { picksApi } from './server/vite-plugin.js';

export default defineConfig(({ mode }) => {
  // An empty prefix loads every variable, but only the server plugin sees them.
  // Nothing here is exposed to client code (that would need a VITE_ prefix).
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), picksApi({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL })],
    // Render serves the preview build on its own domain, which Vite blocks unless listed.
    preview: { allowedHosts: ['.onrender.com'] },
    test: {
      include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts', 'shared/**/*.test.ts'],
      environment: 'node',
    },
  };
});
