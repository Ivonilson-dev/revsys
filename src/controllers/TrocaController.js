const { sequelize, RegistroTroca, Veiculo, Peca, Oficina } = require('../../models');

class TrocaController {
  // POST /troca
  static async registrar(req, res) {
    const {
      veiculo_id,
      peca_id,
      oficina_id,
      nome_oficina_manual,
      km_na_troca,
      data_troca,
      km_previsto_proximo,
      data_prevista_proximo,
      executado_por,
      observacoes,
      atualizar_km_veiculo
    } = req.body;

    if (!veiculo_id || !peca_id || !km_na_troca || !executado_por) {
      return res.status(400).send('Campos obrigatórios ausentes.');
    }

    const t = await sequelize.transaction();

    try {
      const veiculo = await Veiculo.findByPk(veiculo_id, { transaction: t });
      if (!veiculo) {
        await t.rollback();
        return res.status(404).send('Veículo não encontrado');
      }

      // Preparar dados da oficina
      let idOficina = oficina_id ? parseInt(oficina_id) : null;
      let nomeOficinaManual = nome_oficina_manual || null;

      if (idOficina) {
        nomeOficinaManual = null; // Se selecionou oficina do sistema, limpa a manual
      }

      // Criar registro de troca
      const novaTroca = await RegistroTroca.create({
        veiculo_id,
        peca_id,
        oficina_id: idOficina,
        nome_oficina_manual: nomeOficinaManual,
        km_na_troca: parseInt(km_na_troca),
        data_troca: data_troca || new Date().toISOString().split('T')[0],
        km_previsto_proximo: km_previsto_proximo ? parseInt(km_previsto_proximo) : null,
        data_prevista_proximo: data_prevista_proximo || null,
        executado_por,
        observacoes: observacoes || null
      }, { transaction: t });

      // Regra de Negócio RF-33: Atualizar KM do veículo
      const kmTrocaInt = parseInt(km_na_troca);
      if (atualizar_km_veiculo === 'true' || atualizar_km_veiculo === true || kmTrocaInt > veiculo.km_atual) {
        await veiculo.update({
          km_atual: kmTrocaInt
        }, { transaction: t });
      }

      await t.commit();
      
      // Redireciona para o veículo com mensagem de sucesso
      return res.redirect(`/veiculos/${veiculo_id}?sucesso=Troca de peça registrada com sucesso!`);

    } catch (error) {
      await t.rollback();
      console.error('Erro ao registrar troca de peça:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // DELETE /troca/:id
  static async deletar(req, res) {
    const { id } = req.params;

    try {
      const troca = await RegistroTroca.findByPk(id);
      if (!troca) {
        return res.status(404).send('Troca não encontrada');
      }

      const veiculoId = troca.veiculo_id;
      await troca.destroy();

      return res.redirect(`/veiculos/${veiculoId}?sucesso=Registro de troca removido com sucesso!`);
    } catch (error) {
      console.error('Erro ao deletar registro de troca:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }
}

module.exports = TrocaController;
