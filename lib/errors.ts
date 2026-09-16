/**
 * Error con un mensaje apto para el usuario y el código HTTP que le toca.
 * Cualquier otra excepción se trata como 500 y nunca se reenvía al cliente:
 * los detalles de Groq van al log del servidor, no a la respuesta.
 */
export class AnalyzeError extends Error {
  readonly status: number;
  /** Texto que sí se puede mostrar en pantalla. */
  readonly publicMessage: string;

  constructor(status: number, publicMessage: string, cause?: string) {
    super(cause ?? publicMessage);
    this.name = "AnalyzeError";
    this.status = status;
    this.publicMessage = publicMessage;
  }
}
