import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVER_CONFIG } from './server/config.ts';
import { apiRouter } from './server/routes/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);

  // Baseline security headers compatible with iframe preview
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // Strict JSON body limit (25MB for multimodal chat payloads with base64 attachments)
  app.use(express.json({ limit: '25mb' }));

  // Mount API routes
  app.use('/api', apiRouter);

  // JSON parse / payload error handler
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      const status =
        typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : 400;
      const message =
        err instanceof Error ? err.message : 'Request could not be processed.';
      res.status(status).json({ error: message, code: 'REQUEST_ERROR' });
      return;
    }
    next(err);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  app.listen(SERVER_CONFIG.PORT, '0.0.0.0', () => {
    console.log(`NEXORA AI server running on http://0.0.0.0:${SERVER_CONFIG.PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NEXORA AI server:', err);
  process.exit(1);
});
