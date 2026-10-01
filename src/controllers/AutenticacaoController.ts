import { Request, Response } from 'express';
import { Usuario, Cliente } from '../../models';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';

export interface ILoginBody {
  email?: string;
  senha?: string;
}

export interface IRecuperarSenhaBody {
  email?: string;
}

export class AutenticacaoController {
  /**
   * GET /login
   * Exibe a página de login
   */
  public static async exibirLogin(req: Request, res: Response): Promise<void> {
    res.render('autenticacao/login', {
      erro: null,
      mensagem: null,
      layout: false
    });
  }

  /**
   * POST /login
   * Processa a autenticação do usuário
   */
  public static async login(req: Request<{}, {}, ILoginBody>, res: Response): Promise<void> {
    const { email, senha } = req.body;

    if (!email || !senha) {
      res.render('autenticacao/login', {
        erro: 'Por favor, preencha todos os campos.',
        mensagem: null,
        layout: false
      });
      return;
    }

    try {
      const usuario = await Usuario.findOne({
        where: { email },
        include: [{ model: Cliente, as: 'cliente' }]
      });

      if (!usuario) {
        res.render('autenticacao/login', {
          erro: 'E-mail ou senha incorretos.',
          mensagem: null,
          layout: false
        });
        return;
      }

      const senhaValida = await usuario.verificarSenha(senha);

      if (!senhaValida) {
        res.render('autenticacao/login', {
          erro: 'E-mail ou senha incorretos.',
          mensagem: null,
          layout: false
        });
        return;
      }

      // Criar a sessão do usuário
      req.session.usuario = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        clienteId: usuario.cliente ? usuario.cliente.id : undefined
      };

      // Redirecionar para onde estava tentando acessar ou para o painel
      const redirecionarPara = req.session.redirecionarPara || '/painel';
      delete req.session.redirecionarPara;
      res.redirect(redirecionarPara);

    } catch (error) {
      console.error('Erro no login:', error);
      if (isDatabaseConnectionError(error)) {
        tratarErroRequisicao(error, req, res);
        return;
      }
      res.render('autenticacao/login', {
        erro: 'Ocorreu um erro no servidor. Tente novamente mais tarde.',
        mensagem: null,
        layout: false
      });
    }
  }

  /**
   * GET /sair
   * Encerra a sessão e desloga o usuário
   */
  public static async sair(req: Request, res: Response): Promise<void> {
    req.session.destroy((err) => {
      if (err) {
        console.error('Erro ao destruir sessão:', err);
      }
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  }

  /**
   * GET /recuperar-senha
   * Exibe formulário para solicitar recuperação de senha
   */
  public static async exibirRecuperarSenha(req: Request, res: Response): Promise<void> {
    res.render('autenticacao/recuperar-senha', {
      erro: null,
      mensagem: null,
      layout: false
    });
  }

  /**
   * POST /recuperar-senha
   * Processa a solicitação de redefinição de senha
   */
  public static async recuperarSenha(req: Request<{}, {}, IRecuperarSenhaBody>, res: Response): Promise<void> {
    const { email } = req.body;
    
    if (!email) {
      res.render('autenticacao/recuperar-senha', {
        erro: 'Por favor, informe seu e-mail.',
        mensagem: null,
        layout: false
      });
      return;
    }

    try {
      const usuario = await Usuario.findOne({ where: { email } });
      
      if (!usuario) {
        // Por segurança, retorna a mesma mensagem genérica
        res.render('autenticacao/recuperar-senha', {
          erro: null,
          mensagem: 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.',
          layout: false
        });
        return;
      }

      console.log(`[Recuperação de Senha] Link solicitado para: ${email}`);

      res.render('autenticacao/recuperar-senha', {
        erro: null,
        mensagem: 'Se o e-mail estiver cadastrado, um link de recuperação foi enviado.',
        layout: false
      });
    } catch (error) {
      console.error('Erro na recuperação de senha:', error);
      if (isDatabaseConnectionError(error)) {
        tratarErroRequisicao(error, req, res);
        return;
      }
      res.render('autenticacao/recuperar-senha', {
        erro: 'Ocorreu um erro ao processar sua solicitação.',
        mensagem: null,
        layout: false
      });
    }
  }
}

export default AutenticacaoController;

// Compatibilidade CommonJS
module.exports = AutenticacaoController;
