import app from '../server';

export default function handler(req: any, res: any) {
  // Ensure req.url retains /api prefix if stripped by any proxy
  if (
    req.url &&
    !req.url.startsWith('/api') &&
    !req.url.startsWith('/buy') &&
    !req.url.startsWith('/s') &&
    !req.url.startsWith('/ref')
  ) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return app(req, res);
}
