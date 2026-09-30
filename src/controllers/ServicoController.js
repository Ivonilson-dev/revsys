const { sequelize, RegistroServico, Veiculo, Servico, Oficina } = require('../../models');

class ServicoController {
  // POST /registro-servico
  static async registrar(req, res) {
    const {
      veiculo_id,
      servico_id,
      oficina_id,
      nome_oficina_manual,
      km_no_servico,
      data_servico,
      km_previsto_proximo,
      data_prevista_proximo,
      executado_por,
      observacoes,
      atualizar_km_veiculo
    } = req.body;

    if (!veiculo_id || !servico_id || !km_no_servico || !executado_por) {
      return res.status(400).send('Campos obrigatórios ausentes.');
    }

    const kmServicoInt = parseInt(km_no_servico, 10);
    if (isNaN(kmServicoInt) || kmServicoInt < 0) {
      return res.status(400).send('Inconsistência lógica: A quilometragem no serviço não pode ser negativa.');
    }

    const hojeStr = new Date().toLocaleDateString('en-CA');
    const dataServicoInformada = data_servico || hojeStr;
    if (dataServicoInformada > hojeStr) {
      return res.status(400).send('Inconsistência lógica: A data do serviço não pode ser futura, pois refere-se a um serviço já executado.');
    }

    if (km_previsto_proximo) {
      const kmProxInt = parseInt(km_previsto_proximo, 10);
      if (kmProxInt <= kmServicoInt) {
        return res.status(400).send('Inconsistência lógica: A quilometragem prevista para a próxima revisão deve ser maior que a quilometragem atual.');
      }
    }

    if (data_prevista_proximo && data_prevista_proximo <= dataServicoInformada) {
      return res.status(400).send('Inconsistência lógica: A data prevista para a próxima revisão deve ser posterior à data do serviço.');
    }

    const t = await sequelize.transaction();

    try {
      const veiculo = await Veiculo.findByPk(veiculo_id, { transaction: t });
      if (!veiculo) {
        await t.rollback();
        return res.status(404).send('Veículo não encontrado');
      }

      if (dataServicoInformada === hojeStr && kmServicoInt < veiculo.km_atual) {
        await t.rollback();
        return res.status(400).send(`Inconsistência lógica: A quilometragem no serviço (${kmServicoInt} km) não pode ser inferior à quilometragem atual do veículo (${veiculo.km_atual} km).`);
      }

      let idOficina = oficina_id ? parseInt(oficina_id) : null;
      let nomeOficinaManual = nome_oficina_manual || null;

      if (idOficina) {
        nomeOficinaManual = null;
      }

      const novoServico = await RegistroServico.create({
        veiculo_id,
        servico_id,
        oficina_id: idOficina,
        nome_oficina_manual: nomeOficinaManual,
        km_no_servico: parseInt(km_no_servico),
        data_servico: data_servico || new Date().toISOString().split('T')[0],
        km_previsto_proximo: km_previsto_proximo ? parseInt(km_previsto_proximo) : null,
        data_prevista_proximo: data_prevista_proximo || null,
        executado_por,
        observacoes: observacoes || null
      }, { transaction: t });

      // Regra de Negócio RF-33: Atualizar KM do veículo (apenas se for maior, impedindo regressão)
      if (kmServicoInt > veiculo.km_atual) {
        await veiculo.update({
          km_atual: kmServicoInt
        }, { transaction: t });
      }

      await t.commit();
      
      return res.redirect(`/veiculos/${veiculo_id}?sucesso=Registro de serviço realizado com sucesso!`);

    } catch (error) {
      await t.rollback();
      console.error('Erro ao registrar serviço no veículo:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // DELETE /registro-servico/:id
  static async deletar(req, res) {
    const { id } = req.params;

    try {
      const reg = await RegistroServico.findByPk(id);
      if (!reg) {
        return res.status(404).send('Registro de serviço não encontrado');
      }

      const veiculoId = reg.veiculo_id;
      await reg.destroy();

      return res.redirect(`/veiculos/${veiculoId}?sucesso=Registro de serviço removido com sucesso!`);
    } catch (error) {
      console.error('Erro ao deletar registro de serviço:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }
}

module.exports = ServicoController;
