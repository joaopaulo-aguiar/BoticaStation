/**
 * Template para novos handlers Lambda.
 *
 * Copie este arquivo e renomeie para o nome do handler.
 * Siga o padrão: logger estruturado, AppError, env.ts.
 */

import { logger } from '../shared/logger';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AppError, handleError } from '../shared/errors';
import { env } from '../config/env';

const log = logger.child({ service: 'template-handler' });

interface LambdaEvent {
  // Defina o tipo do evento esperado
  [key: string]: unknown;
}

interface LambdaResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  log.info('Handler invocado', { event });

  try {
    // ── Validação ─────────────────────────────────────────────
    // Valide campos obrigatórios do evento aqui
    if (!event) throw AppError.badRequest('Evento é obrigatório');

    // ── Lógica de negócio ─────────────────────────────────────
    const result = {
      message: 'Operação concluída com sucesso',
      stage: env.stage,
    };

    log.info('Operação concluída', { result });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    log.error('Erro no handler', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return handleError(error);
  }
}
