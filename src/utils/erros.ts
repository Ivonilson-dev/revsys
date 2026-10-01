import { Request, Response, NextFunction } from 'express';
import { ConnectionError } from 'sequelize';

/**
 * Utilitário central de tratamento de erros e resiliência de conexão do RevSys
 */

/**
 * Identifica se um determinado erro é oriundo de falha de conexão, indisponibilidade ou timeout com o banco de dados.
 */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error) return false;

  // Erros de conexão nativos do Sequelize
  if (error instanceof ConnectionError) {
    return true;
  }

  const err = error as { 
    name?: string; 
    message?: string; 
    code?: string; 
    original?: { code?: string; message?: string };
    parent?: { code?: string; message?: string };
  };

  // Nomes de classes de erro de conexão do Sequelize
  const nomesErrosSequelize = [
    'SequelizeConnectionError',
    'SequelizeConnectionRefusedError',
    'SequelizeHostNotFoundError',
    'SequelizeHostNotReachableError',
    'SequelizeAccessDeniedError',
    'SequelizeConnectionTimedOutError',
    'SequelizeTimeoutError'
  ];

  if (err.name && nomesErrosSequelize.includes(err.name)) {
    return true;
  }

  // Códigos de erro de socket e rede (NodeJS / MySQL)
  const codigosRede = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'EAI_AGAIN',
    'PROTOCOL_CONNECTION_LOST',
    'ER_ACCESS_DENIED_ERROR',
    'ECONNRESET',
    'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'
  ];

  if (err.code && codigosRede.includes(err.code)) {
    return true;
  }

  if (err.original?.code && codigosRede.includes(err.original.code)) {
    return true;
  }

  if (err.parent?.code && codigosRede.includes(err.parent.code)) {
    return true;
  }

  // Verificação textual na mensagem do erro
  const mensagem = String(err.message || '').toLowerCase();
  const termosChave = [
    'econnrefused',
    'connection refused',
    'cannot connect',
    'access denied',
    'etimedout',
    'failed to connect',
    'sequelizeconnection',
    'handshake inactivity timeout'
  ];

  for (const termo of termosChave) {
    if (mensagem.includes(termo)) {
      return true;
    }
  }

  return false;
}

/**
 * Mensagem amigável padrão para indisponibilidade de banco de dados
 */
export const MENSAGEM_BANCO_INDISPONIVEL = 
  'O sistema está momentaneamente sem acesso aos dados. Por favor, verifique se o seu computador ou dispositivo está conectado à Internet e tente novamente em instantes. Caso o problema persista, entre em contato com o suporte técnico.';

/**
 * Trata o erro de forma centralizada e resiliente para qualquer requisição HTTP.
 * Exibe a página amigável sem expor detalhes técnicos ao usuário final.
 */
export function tratarErroRequisicao(
  error: unknown, 
  req: Request, 
  res: Response, 
  next?: NextFunction
): void {
  if (res.headersSent) {
    if (next) return next(error);
    return;
  }

  // Log técnico no terminal/servidor para diagnóstico do desenvolvedor/administrador
  const mensagemLog = error instanceof Error ? error.message : String(error);
  const stackLog = error instanceof Error ? error.stack : '';
  console.error(`[RevSys Error Handler] [${req.method} ${req.originalUrl}]:`, mensagemLog);
  if (stackLog) {
    console.error(stackLog);
  }

  const ehErroBanco = isDatabaseConnectionError(error);

  // Detecta se a requisição espera retorno em JSON (AJAX / API)
  const querJson = 
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json')) ||
    req.path.startsWith('/api') ||
    req.headers['x-requested-with'] === 'XMLHttpRequest';

  if (querJson) {
    if (ehErroBanco) {
      res.status(503).json({
        sucesso: false,
        erro: MENSAGEM_BANCO_INDISPONIVEL,
        tipo: 'banco_indisponivel'
      });
      return;
    }

    res.status(500).json({
      sucesso: false,
      erro: 'Ocorreu uma instabilidade inesperada ao processar sua solicitação. Por favor, tente novamente ou contate o suporte técnico.',
      tipo: 'erro_interno'
    });
    return;
  }

  // Resposta em HTML para navegação no navegador
  // Força o Turbo Drive a realizar recarregamento completo clássico para carregar estilos e scripts do zero
  res.setHeader('Turbo-Visit-Control', 'reload');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (ehErroBanco) {
    res.status(503).render('erros/banco', {
      titulo: 'Sistema Sem Acesso aos Dados | RevSys',
      layout: false
    });
    return;
  }

  res.status(500).render('erros/500', {
    titulo: 'Instabilidade no Sistema | RevSys',
    layout: false
  });
}
