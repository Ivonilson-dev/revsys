import { Request, Response } from 'express';
import { Notificacao } from '../../models';

export class NotificacaoController {
  /**
   * POST /notificacoes/:id/lida
   * Marca uma notificação específica como lida
   */
  public static async marcarComoLida(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const usuarioLogado = req.session.usuario;

    if (!usuarioLogado) {
      res.redirect('/login');
      return;
    }

    try {
      const notificacao = await Notificacao.findOne({
        where: { id: Number(id), usuario_id: usuarioLogado.id }
      });

      if (notificacao) {
        await notificacao.update({ lida: true });
      }

      res.redirect('back');
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.redirect('back');
    }
  }

  /**
   * POST /notificacoes/ler-todas
   * Marca todas as notificações não lidas do usuário como lidas
   */
  public static async marcarTodasComoLidas(req: Request, res: Response): Promise<void> {
    const usuarioLogado = req.session.usuario;

    if (!usuarioLogado) {
      res.redirect('/login');
      return;
    }

    try {
      await Notificacao.update(
        { lida: true },
        { where: { usuario_id: usuarioLogado.id, lida: false } }
      );

      res.redirect('back');
    } catch (error) {
      console.error('Erro ao marcar todas as notificações:', error);
      res.redirect('back');
    }
  }
}

export default NotificacaoController;

// Compatibilidade CommonJS
module.exports = NotificacaoController;
