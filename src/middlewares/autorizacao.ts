import { Request, Response, NextFunction } from 'express';
import { PapelUsuario } from '../types';

/**
 * Middlewares de Autenticação e Autorização (RBAC)
 */

export function estaAutenticado(req: Request, res: Response, next: NextFunction): void {
  // Previne que navegadores guardem em cache páginas autenticadas (Back-Forward Cache / BFCache)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.session && req.session.usuario) {
    // Disponibiliza os dados do usuário para o EJS localmente
    res.locals.usuarioLogado = req.session.usuario;
    return next();
  }
  
  if (req.session) {
    req.session.redirecionarPara = req.originalUrl;
  }
  res.redirect('/login');
}

export function naoAutenticado(req: Request, res: Response, next: NextFunction): void {
  // Previne cache também nas telas de login/recuperação
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.session && req.session.usuario) {
    res.redirect('/painel');
    return;
  }
  next();
}

/**
 * Middleware para validar o papel do usuário
 * @param papeisPermitidos - Lista de papéis permitidos
 */
export function temPapel(...papeisPermitidos: PapelUsuario[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session || !req.session.usuario) {
      res.redirect('/login');
      return;
    }

    const { papel } = req.session.usuario;
    
    if (papeisPermitidos.includes(papel)) {
      return next();
    }

    // Se não tiver permissão, renderiza uma página de erro 403
    res.status(403).render('erros/403', {
      titulo: 'Acesso Negado',
      mensagem: 'Você não tem permissão para acessar esta página.'
    });
  };
}

export default {
  estaAutenticado,
  naoAutenticado,
  temPapel
};

// Compatibilidade CommonJS
module.exports = {
  estaAutenticado,
  naoAutenticado,
  temPapel,
  default: {
    estaAutenticado,
    naoAutenticado,
    temPapel
  }
};
