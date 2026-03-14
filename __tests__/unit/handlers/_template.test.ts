/**
 * Testes unitários para o handler template.
 */

import { handler } from '../../../src/handlers/_template';

describe('_template handler', () => {
  it('deve retornar 200 com mensagem de sucesso', async () => {
    const event = { test: true };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toHaveProperty('Content-Type', 'application/json');

    const body = JSON.parse(result.body);
    expect(body.message).toBe('Operação concluída com sucesso');
    expect(body.stage).toBe('test');
  });

  it('deve retornar JSON válido no body', async () => {
    const result = await handler({});

    expect(() => JSON.parse(result.body)).not.toThrow();
  });
});
