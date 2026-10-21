import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? '3000');
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT must be a valid TCP port between 1 and 65535.');
}
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY before starting the API.');
}
try {
  const url = new URL(supabaseUrl);
  const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new Error('SUPABASE_URL must use HTTPS except for local development.');
  }
} catch (error) {
  if (error instanceof Error && error.message.includes('HTTPS')) throw error;
  throw new Error('SUPABASE_URL must be a valid URL.');
}

const app = createApp({ supabaseUrl, supabaseAnonKey, allowedOrigins });
app.listen(port, '0.0.0.0', () => {
  console.log(`Panic Ring API listening on port ${port}`);
});
