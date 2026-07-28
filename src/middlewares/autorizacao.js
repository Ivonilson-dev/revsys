/**
 * Middlewares de Autenticação e Autorização (RBAC)
 */

function estaAutenticado(req, res, next) {
  if (req.session && req.session.usuario) {
    // Disponibiliza os dados do usuário para o EJS localmente
    res.locals.usuarioLogado = req.session.usuario;
    return next();
  }
  
  req.session.redirecionarPara = req.originalUrl;
  return res.redirect('/login');
}

function naoAutenticado(req, res, next) {
  if (req.session && req.session.usuario) {
    return res.redirect('/painel');
  }
  return next();
}

/**
 * Middleware para validar o papel do usuário
 * @param {...string} papeisPermitidos - Lista de papéis permitidos
 */
function temPapel(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      return res.redirect('/login');
    }

    const { papel } = req.session.usuario;
    
    if (papeisPermitidos.includes(papel)) {
      return next();
    }

    // Se não tiver permissão, renderiza uma página de erro 403 ou redireciona
    res.status(403).render('erros/403', {
      titulo: 'Acesso Negado',
      mensagem: 'Você não tem permissão para acessar esta página.'
    });
  };
}

module.exports = {
  estaAutenticado,
  naoAutenticado,
  temPapel
};
