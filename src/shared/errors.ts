/**
 * AppError — classe padronizada para tratamento de erros.
 *
 * Uso:
 *   throw new AppError('Contato não encontrado', 404);
 *   throw AppError.badRequest('Campo obrigatório: email');
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // ── Factory methods ─────────────────────────────────────────
  static badRequest(message: string, code?: string) {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = 'Não autorizado') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Acesso negado') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Recurso não encontrado') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new AppError(message, 409, 'CONFLICT');
  }

  static internal(message = 'Erro interno do servidor') {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }
}

/**
 * Helper para tratar erros em handlers Lambda.
 * Converte erros desconhecidos em AppError e retorna resposta formatada.
 */
export function handleError(error: unknown): {
  statusCode: number;
  body: string;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({
        error: error.message,
        code: error.code,
      }),
    };
  }

  const message = error instanceof Error ? error.message : 'Erro desconhecido';
  return {
    statusCode: 500,
    body: JSON.stringify({
      error: message,
      code: 'INTERNAL_ERROR',
    }),
  };
}
