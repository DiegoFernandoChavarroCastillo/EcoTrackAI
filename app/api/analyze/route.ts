import { NextResponse } from "next/server";
import { buildSummary, calculateEmissions } from "@/lib/emissions";
import { AnalyzeError } from "@/lib/errors";
import { extractActivities } from "@/lib/groq";
import { RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rateLimit";
import type { AnalyzeRequest, AnalyzeResponse, ApiError } from "@/lib/types";

/** Necesita Node (no Edge) para la llamada saliente con timeout. */
export const runtime = "nodejs";
/** Tope de Vercel: por encima del timeout de 20 s del cliente de Groq. */
export const maxDuration = 30;

const MIN_LENGTH = 12;
const MAX_LENGTH = 2000;
/** Margen generoso sobre MAX_LENGTH: 2000 caracteres nunca pesan 8 KB. */
const MAX_BODY_BYTES = 8 * 1024;

/**
 * POST /api/analyze
 * Recibe texto libre, lo estructura con Groq, lo cruza con la tabla de
 * factores y devuelve el desglose con el total.
 */
export async function POST(
  request: Request
): Promise<NextResponse<AnalyzeResponse | ApiError>> {
  // El rate limit va primero: es lo más barato y es lo que protege la cuota.
  const limit = checkRateLimit(getClientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Estás enviando demasiadas solicitudes. Espera ${limit.retryAfterSeconds} segundos e inténtalo otra vez.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  try {
    const text = await readText(request);

    const extracted = await extractActivities(text);
    if (extracted.length === 0) {
      throw new AnalyzeError(
        422,
        "No reconocimos ninguna actividad. Menciona qué usaste y cuánto, por ejemplo: 5 camionetas y 200 kWh."
      );
    }

    const breakdown = calculateEmissions(extracted);
    if (breakdown.results.length === 0) {
      throw new AnalyzeError(
        422,
        "Reconocimos las actividades pero no tenemos un factor para esas unidades. Prueba con kWh, km, litros, m³ o kg."
      );
    }

    return NextResponse.json(
      {
        results: breakdown.results,
        totalKgCO2e: breakdown.totalKgCO2e,
        summary: buildSummary(breakdown),
        ignored: breakdown.ignored,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT.MAX_REQUESTS),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      }
    );
  } catch (error) {
    if (error instanceof AnalyzeError) {
      // El mensaje técnico queda en el log; al cliente solo va publicMessage.
      if (error.status >= 500) console.error(`[analyze] ${error.message}`);
      return NextResponse.json(
        { error: error.publicMessage },
        { status: error.status }
      );
    }

    // Solo nombre y mensaje: volcar el objeto entero podría arrastrar
    // propiedades de una librería (config, cabeceras) hasta el log.
    const detail =
      error instanceof Error ? `${error.name}: ${error.message}` : "desconocido";
    console.error(`[analyze] error inesperado: ${detail}`);
    return NextResponse.json(
      { error: "Algo falló de nuestro lado. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}

/** Valida el body y devuelve el texto ya recortado. */
async function readText(request: Request): Promise<string> {
  // Se corta por tamaño antes de bufferear. Una solicitud sin Content-Length
  // (chunked) se escapa de aquí, pero la cota de MAX_LENGTH la atrapa después.
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    throw new AnalyzeError(
      413,
      "La solicitud es demasiado grande. Describe tu día en menos texto."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AnalyzeError(400, "El cuerpo de la solicitud no es JSON válido.");
  }

  const candidate = (body as Partial<AnalyzeRequest> | null)?.text;
  if (typeof candidate !== "string") {
    throw new AnalyzeError(400, 'Falta el campo "text" y debe ser una cadena.');
  }

  const text = candidate.trim();
  if (text.length < MIN_LENGTH) {
    throw new AnalyzeError(
      400,
      `Describe tus actividades con al menos ${MIN_LENGTH} caracteres.`
    );
  }
  if (text.length > MAX_LENGTH) {
    throw new AnalyzeError(
      400,
      `El texto supera los ${MAX_LENGTH} caracteres. Resume el día en menos.`
    );
  }

  return text;
}
