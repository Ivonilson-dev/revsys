const { Notificacao } = require('../../models');

class NotificacaoController {
  // POST /notificacoes/:id/lida
  static async marcarComoLida(req, res) {
    const { id } = req.params;
    const usuarioLogado = req.session.usuario;

    try {
      const notificacao = await Notificacao.findOne({
        where: { id, usuario_id: usuarioLogado.id }
      });

      if (notificacao) {
        await notificacao.update({ lida: true });
      }

      return res.redirect('back');
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return res.redirect('back');
    }
  }

  // POST /notificacoes/ler-todas
  static async marcarTodasComoLidas(req, res) {
    const usuarioLogado = req.session.usuario;

    try {
      await Notificacao.update(
        { lida: true },
        { where: { usuario_id: usuarioLogado.id, lida: false } }
      );

      return res.redirect('back');
    } catch (error) {
      console.error('Erro ao marcar todas as notificações:', error);
      return res.redirect('back');
    }
  }
}

module.exports = NotificacaoController;
