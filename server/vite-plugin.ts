import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, Plugin } from 'vite';
import { handlePicks, type PicksConfig } from './handler.js';

const MAX_BODY_BYTES = 8 * 1024;

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve(undefined);
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function picksMiddleware(config: PicksConfig): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (req.url !== '/api/picks') {
      next();
      return;
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'Use POST.' });
      return;
    }
    readJson(req)
      .then((body) => handlePicks(body, config))
      .then(({ status, body }) => {
        send(res, status, body);
      })
      .catch((error: unknown) => {
        console.error('[couch-picks] /api/picks failed', error);
        send(res, 500, { error: 'Something went wrong.' });
      });
  };
}

/** Serves POST /api/picks from both `vite` (dev) and `vite preview` (built app). */
export function picksApi(config: PicksConfig): Plugin {
  return {
    name: 'couch-picks-api',
    configureServer(server) {
      server.middlewares.use(picksMiddleware(config));
    },
    configurePreviewServer(server) {
      server.middlewares.use(picksMiddleware(config));
    },
  };
}
