/**
 * Rate limit en memoria: ventana deslizante por IP.
 *
 * LÍMITE IMPORTANTE: el estado vive en el proceso. En Vercel cada instancia
 * serverless tiene el suyo y se pierde en cada arranque en frío, así que el
 * tope real es "10 por minuto por instancia", no global. Sirve para frenar un
 * bucle accidental o un abuso casual y proteger la cuota de Groq; NO sirve
 * como control de abuso serio. Para eso hace falta un contador compartido
 * (Vercel KV, Upstash Redis) o el rate limit del borde.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
/** Tope de IPs vigiladas, para que el Map no crezca sin control. */
const MAX_TRACKED_IPS = 10_000;

/** IP -> marcas de tiempo de sus solicitudes dentro de la ventana. */
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Solicitudes que le quedan en la ventana actual. */
  remaining: number;
  /** Segundos hasta que se libere un cupo. 0 si todavía tiene. */
  retryAfterSeconds: number;
}

/**
 * Identifica al cliente. Detrás de Vercel la IP real viene en x-forwarded-for;
 * en local no hay ninguna cabecera y todo cae en el mismo cubo, que es
 * justamente lo que hace la prueba manual fácil de reproducir.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "desconocida";
}

export function checkRateLimit(ip: string, now = Date.now()): RateLimitResult {
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff);

  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent);
    const oldest = recent[0];
    return {
      allowed: false,
      remaining: 0,
      // Se libera un cupo cuando la más vieja salga de la ventana.
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(ip, recent);
  pruneExpired(cutoff);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - recent.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Barre las IPs cuya ventana ya venció. Solo se molesta cuando el Map creció,
 * para no recorrerlo en cada solicitud.
 */
function pruneExpired(cutoff: number): void {
  if (hits.size <= MAX_TRACKED_IPS) return;

  for (const [ip, timestamps] of hits) {
    const alive = timestamps.filter((t) => t > cutoff);
    if (alive.length === 0) hits.delete(ip);
    else hits.set(ip, alive);
  }

  // Si aun así sigue por encima del tope, se prefiere soltar el estado a
  // quedarse sin memoria: el peor caso es que unos pocos ganen cupo extra.
  if (hits.size > MAX_TRACKED_IPS) hits.clear();
}

/** Solo para pruebas: deja el contador en blanco. */
export function resetRateLimit(): void {
  hits.clear();
}

export const RATE_LIMIT = { WINDOW_MS, MAX_REQUESTS } as const;
