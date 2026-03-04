/**
 * Simple in-memory rate limiter for API routes
 * Di production Vercel, setiap serverless function instance punya memori sendiri,
 * jadi ini per-instance. Untuk full protection, gunakan Redis/Upstash.
 */

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Bersihkan entries lama setiap 5 menit
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((value, key) => {
    if (now - value.lastReset > 300000) {
      rateLimitMap.delete(key);
    }
  });
}, 300000);

/**
 * Rate limit berdasarkan IP
 * @param ip - IP address client
 * @param limit - Max request dalam window
 * @param windowMs - Window duration dalam ms
 * @returns true jika allowed, false jika rate limited
 */
export function rateLimit(
  ip: string,
  limit: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const key = ip;
  const record = rateLimitMap.get(key);

  if (!record || now - record.lastReset > windowMs) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Get client IP from request headers (works behind Vercel/nginx proxy)
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
