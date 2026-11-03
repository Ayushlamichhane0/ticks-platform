import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';

const devCspPlugin: Plugin = {
  name: 'dev-csp-relaxation',
  configureServer(server) {
    server.middlewares.use((_request, response, next) => {
      response.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://s3.tradingview.com http://localhost:* http://127.0.0.1:*; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; frame-src 'self' https://*.tradingview.com https://*.tradingview-widget.com; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://api.twelvedata.com https://api.binance.com wss://stream.binance.com https://*.tradingview.com wss://*.tradingview.com https://ep-lingering-bread-a1r5wnr5.neonauth.ap-southeast-1.aws.neon.tech"
      );
      next();
    });
  },
};

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(mode === 'development' ? [devCspPlugin] : []),
    ],
    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
