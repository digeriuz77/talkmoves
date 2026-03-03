import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

const saveImagePlugin = () => ({
  name: 'save-image-plugin',
  configureServer(server: any) {
    server.middlewares.use('/api/check-image', (req: any, res: any) => {
      if (req.method === 'GET') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const filename = url.searchParams.get('filename');
        if (!filename) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing filename' }));
          return;
        }
        const filepath = path.resolve(__dirname, 'public', filename);
        const exists = fs.existsSync(filepath);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ exists }));
      }
    });

    server.middlewares.use('/api/save-image', (req: any, res: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { filename, base64 } = JSON.parse(body);
            const filepath = path.resolve(__dirname, 'public', filename);
            if (!fs.existsSync(path.dirname(filepath))) {
              fs.mkdirSync(path.dirname(filepath), { recursive: true });
            }
            fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      }
    });
  }
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), saveImagePlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
