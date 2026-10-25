import { createClient } from '@supabase/supabase-js';
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';

export type ApiConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  allowedOrigins?: string[];
  fetcher?: typeof fetch;
};

type AsyncHandler = (request: Request, response: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncHandler): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}

export function createApp(config: ApiConfig) {
  const app = express();
  const fetcher = config.fetcher ?? fetch;
  const allowedOrigins = config.allowedOrigins?.length ? config.allowedOrigins : [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:8081',
  ];

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use((request, response, next) => {
    const origin = request.get('origin');
    const isAllowed = !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin);
    if (!isAllowed) {
      response.status(403).json({ error: 'Origin is not allowed.' });
      return;
    }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin);
      response.setHeader('Vary', 'Origin');
    }
    response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/api/health', asyncHandler(async (_request, response) => {
    const healthUrl = new URL('/auth/v1/health', config.supabaseUrl);
    let supabaseResponse: globalThis.Response;
    try {
      supabaseResponse = await fetcher(healthUrl, {
        headers: { apikey: config.supabaseAnonKey },
        signal: AbortSignal.timeout(4_000),
      });
    } catch (error) {
      console.error('[api] Supabase health check failed', error instanceof Error ? error.message : 'Unknown error');
      response.status(503).json({ status: 'unavailable', error: 'Supabase Auth is unavailable.' });
      return;
    }
    if (!supabaseResponse.ok) {
      response.status(503).json({ status: 'unavailable', error: 'Supabase Auth is unavailable.' });
      return;
    }
    response.json({ status: 'ok', service: 'panic-ring-api', supabase: 'ok' });
  }));

  app.get('/api/v1/me', asyncHandler(async (request, response) => {
    const authorization = request.get('authorization') ?? '';
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) {
      response.status(401).json({ error: 'A valid bearer token is required.' });
      return;
    }

    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: { fetch: fetcher },
    });
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user) {
      response.status(401).json({ error: 'The access token is invalid or expired.' });
      return;
    }

    response.json({ user: { id: data.user.id, email: data.user.email ?? null } });
  }));

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found.' });
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    console.error('[api] request failed', error instanceof Error ? error.message : 'Unknown error');
    if (!response.headersSent) {
      response.status(500).json({ error: 'Internal server error.' });
    }
  };
  app.use(errorHandler);

  return app;
}
