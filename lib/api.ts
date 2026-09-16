/**
 * Cliente del endpoint, visto desde el navegador.
 *
 * Su trabajo es que la UI nunca vea un error crudo: toda falla sale de aquí
 * como un Error con un mensaje que se puede mostrar tal cual en pantalla.
 * Ni stack traces, ni códigos HTTP, ni "Failed to fetch".
 */
import type { AnalyzeResponse } from "./types";

const FALLBACK_MESSAGE =
  "No pudimos calcular tu huella. Inténtalo de nuevo en un momento.";

export async function analyze(text: string): Promise<AnalyzeResponse> {
  let response: Response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // fetch solo rechaza por red: sin conexión, CORS o solicitud cancelada.
    throw new Error(
      "No pudimos conectarnos. Revisa tu conexión e inténtalo otra vez."
    );
  }

  // Un 500 de la plataforma puede devolver HTML; por eso el parse va protegido.
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readableError(payload));
  }
  if (!isAnalyzeResponse(payload)) {
    throw new Error(FALLBACK_MESSAGE);
  }
  return payload;
}

/** Usa el mensaje del servidor solo si viene y es texto; si no, el genérico. */
function readableError(payload: unknown): string {
  const message =
    typeof payload === "object" && payload !== null
      ? (payload as { error?: unknown }).error
      : undefined;

  return typeof message === "string" && message.trim().length > 0
    ? message
    : FALLBACK_MESSAGE;
}

/** Comprueba la forma antes de dársela a la UI, no solo que sea 200. */
function isAnalyzeResponse(payload: unknown): payload is AnalyzeResponse {
  if (typeof payload !== "object" || payload === null) return false;
  const value = payload as Record<string, unknown>;
  return (
    Array.isArray(value.results) &&
    typeof value.totalKgCO2e === "number" &&
    typeof value.summary === "string"
  );
}
