import { Request, Response } from 'express';
import { Usuario, Cliente } from '../../models';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';
import AuditoriaService from '../services/AuditoriaService';

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
        // Registra tentativa de acesso não autorizada
        await AuditoriaService.registrar({
          req,
          usuario: { email, nome: 'Desconhecido' },
          acao: 'LOGIN_FALHA',
          recurso: 'Autenticação',
          descricao: `Tentativa de login frustrada: usuário não encontrado (${email}).`
        });

        res.render('autenticacao/login', {
          erro: 'E-mail ou senha incorretos.',
          mensagem: null,
          layout: false
        });
        return;
      }

      const senhaValida = await usuario.verificarSenha(senha);

      if (!senhaValida) {
        // Registra tentativa com senha inválida
        await AuditoriaService.registrar({
          req,
          usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
          acao: 'LOGIN_FALHA',
          recurso: 'Autenticação',
          registro_id: usuario.id,
          descricao: `Tentativa de login com senha incorreta para o usuário ${usuario.nome} (${usuario.email}).`
        });

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

      // Registra login bem-sucedido na auditoria
      await AuditoriaService.registrar({
        req,
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
        acao: 'LOGIN',
        recurso: 'Autenticação',
        registro_id: usuario.id,
        descricao: `Usuário ${usuario.nome} realizou login com sucesso no sistema (Perfil: ${usuario.papel.toUpperCase()}).`
      });

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
    const usuarioLogado = req.session?.usuario;
    if (usuarioLogado) {
      await AuditoriaService.registrar({
        req,
        usuario: usuarioLogado,
        acao: 'LOGOUT',
        recurso: 'Autenticação',
        registro_id: usuarioLogado.id,
        descricao: `Usuário ${usuarioLogado.nome} encerrou sua sessão no sistema.`
      });
    }

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
