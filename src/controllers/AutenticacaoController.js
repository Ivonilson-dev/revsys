const { Usuario, Cliente } = require('../../models');

class AutenticacaoController {
  // GET /login
  static async exibirLogin(req, res) {
    return res.render('autenticacao/login', {
      erro: null,
      mensagem: null,
      layout: false // Não usar layout principal na tela de login
    });
  }

  // POST /login
  static async login(req, res) {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.render('autenticacao/login', {
        erro: 'Por favor, preencha todos os campos.',
        mensagem: null,
        layout: false
      });
    }

    try {
      const usuario = await Usuario.findOne({
        where: { email },
        include: [{ model: Cliente, as: 'cliente' }]
      });

      if (!usuario) {
        return res.render('autenticacao/login', {
          erro: 'E-mail ou senha incorretos.',
          mensagem: null,
          layout: false
        });
      }

      const senhaValida = await usuario.verificarSenha(senha);

      if (!senhaValida) {
        return res.render('autenticacao/login', {
          erro: 'E-mail ou senha incorretos.',
          mensagem: null,
          layout: false
        });
      }

      // Criar a sessão do usuário
      req.session.usuario = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        clienteId: usuario.cliente ? usuario.cliente.id : null
      };

      // Redirecionar para onde estava tentando acessar ou para o painel
      const redirecionarPara = req.session.redirecionarPara || '/painel';
      delete req.session.redirecionarPara;
      return res.redirect(redirecionarPara);

    } catch (error) {
      console.error('Erro no login:', error);
      return res.render('autenticacao/login', {
        erro: 'Ocorreu um erro no servidor. Tente novamente mais tarde.',
        mensagem: null,
        layout: false
      });
    }
  }

  // GET /sair
  static async sair(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Erro ao destruir sessão:', err);
      }
      res.clearCookie('connect.sid');
      return res.redirect('/login');
    });
  }

  // GET /recuperar-senha
  static async exibirRecuperarSenha(req, res) {
    return res.render('autenticacao/recuperar-senha', {
      erro: null,
      mensagem: null,
      layout: false
    });
  }

  // POST /recuperar-senha
  static async recuperarSenha(req, res) {
    const { email } = req.body;
    
    try {
      const usuario = await Usuario.findOne({ where: { email } });
      
      if (!usuario) {
        // Por motivos de segurança, informamos que o link foi enviado mesmo que o e-mail não exista
        return res.render('autenticacao/recuperar-senha', {
          erro: null,
          mensagem: 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.',
          layout: false
        });
      }

      // Aqui integraria o nodemailer para enviar o link real de recuperação (RF-05)
      // Como é uma simulação, apenas retornamos sucesso
      console.log(`[Recuperação de Senha] Link solicitado para: ${email}`);

      return res.render('autenticacao/recuperar-senha', {
        erro: null,
        mensagem: 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.',
        layout: false
      });
    } catch (error) {
      console.error('Erro na recuperação de senha:', error);
      return res.render('autenticacao/recuperar-senha', {
        erro: 'Ocorreu um erro ao processar sua solicitação.',
        mensagem: null,
        layout: false
      });
    }
  }
}

module.exports = AutenticacaoController;
