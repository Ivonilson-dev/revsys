const { sequelize, Veiculo, Cliente, Usuario, ModeloVeiculo, MarcaVeiculo, RegistroTroca, Peca, MarcaPeca, Agendamento, Notificacao, LogLgpd } = require('../../models');
const { calcularStatusAlerta } = require('../utils/alertas');

class ClienteAreaController {
  // GET /cliente/veiculos
  static async listarVeiculosCliente(req, res) {
    const clienteId = req.session.usuario.clienteId;

    try {
      const cliente = await Cliente.findByPk(clienteId, {
        include: [{ model: Usuario, as: 'usuario' }]
      });

      if (!cliente) {
        return res.status(404).send('Cadastro de cliente não localizado.');
      }

      // Buscar veículos do cliente
      const veiculos = await Veiculo.findAll({
        where: { cliente_id: clienteId },
        include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
      });

      // Para cada veículo, calcular alertas das peças
      const veiculosComAlertas = [];
      for (const veiculo of veiculos) {
        const trocas = await RegistroTroca.findAll({
          where: { veiculo_id: veiculo.id },
          include: [{ model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }],
          order: [['data_troca', 'DESC'], ['id', 'DESC']]
        });

        // Agrupar por peça para pegar as últimas
        const ultimasTrocas = {};
        trocas.forEach(t => {
          if (!ultimasTrocas[t.peca_id]) {
            ultimasTrocas[t.peca_id] = t;
          }
        });

        // Contar alertas
        let totalVencidos = 0;
        let totalProximos = 0;
        const alertas = [];

        for (const pecaId in ultimasTrocas) {
          const troca = ultimasTrocas[pecaId];
          const alerta = calcularStatusAlerta(troca, veiculo.km_atual);
          if (alerta.status === 'vencido') totalVencidos++;
          if (alerta.status === 'proximo') totalProximos++;

          alertas.push({
            peca: troca.peca,
            troca,
            alerta
          });
        }

        veiculosComAlertas.push({
          veiculo,
          totalVencidos,
          totalProximos,
          alertas
        });
      }

      // Buscar agendamentos do cliente
      const agendamentos = await Agendamento.findAll({
        where: { cliente_id: clienteId },
        include: [{ model: Veiculo, as: 'veiculo' }],
        order: [['data_agendada', 'DESC'], ['horario_agendado', 'DESC']]
      });

      return res.render('cliente/veiculos', {
        titulo: 'Meus Veículos e Agendamentos',
        cliente,
        veiculosComAlertas,
        agendamentos,
        sucesso: req.query.sucesso || null,
        erro: req.query.erro || null
      });

    } catch (error) {
      console.error('Erro na área do cliente:', error);
      return res.status(500).send('Erro interno do servidor.');
    }
  }

  // GET /cliente/veiculo/:id
  static async exibirDetalhesVeiculo(req, res) {
    const { id } = req.params;
    const clienteId = req.session.usuario.clienteId;

    try {
      // Garantir que o veículo pertence ao cliente logado
      const veiculo = await Veiculo.findOne({
        where: { id, cliente_id: clienteId },
        include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
      });

      if (!veiculo) {
        return res.status(403).send('Acesso não autorizado a este veículo.');
      }

      // Histórico completo de trocas
      const historicoTrocas = await RegistroTroca.findAll({
        where: { veiculo_id: id },
        include: [{ model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }],
        order: [['data_troca', 'DESC'], ['id', 'DESC']]
      });

      // Calcular alertas atuais
      const ultimasTrocas = {};
      historicoTrocas.forEach(t => {
        if (!ultimasTrocas[t.peca_id]) {
          ultimasTrocas[t.peca_id] = t;
        }
      });

      const alertasPecas = [];
      for (const pecaId in ultimasTrocas) {
        const troca = ultimasTrocas[pecaId];
        const alerta = calcularStatusAlerta(troca, veiculo.km_atual);
        alertasPecas.push({
          peca: troca.peca,
          troca,
          alerta
        });
      }

      return res.render('cliente/detalhes_veiculo', {
        titulo: `Veículo Placa: ${veiculo.placa}`,
        veiculo,
        historicoTrocas,
        alertasPecas
      });

    } catch (error) {
      console.error('Erro ao exibir detalhes do veículo do cliente:', error);
      return res.status(500).send('Erro interno.');
    }
  }

  // POST /cliente/solicitar-manutencao
  static async solicitarManutencao(req, res) {
    const clienteId = req.session.usuario.clienteId;
    const { veiculo_id, motivo } = req.body;

    if (!veiculo_id || !motivo) {
      return res.redirect('/cliente/veiculos?erro=Selecione o veículo e informe o motivo.');
    }

    try {
      // Validar propriedade do veículo
      const veiculo = await Veiculo.findOne({
        where: { id: veiculo_id, cliente_id: clienteId },
        include: [{ model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] }]
      });

      if (!veiculo) {
        return res.status(403).send('Veículo não pertence ao cliente.');
      }

      // Criar a notificação para todos os funcionários internos da oficina (admin, gerente, atendente)
      const funcionarios = await Usuario.findAll({
        where: {
          papel: ['admin', 'gerente', 'atendente']
        }
      });

      const mensagem = `O cliente ${veiculo.cliente.usuario.nome} solicitou revisão/manutenção para o veículo ${veiculo.placa} (${veiculo.modelo_id ? veiculo.modelo_id : 'Não Informado'}). Motivo: "${motivo}"`;

      // Inserir notificações para todos os funcionários
      const notificacoesToCreate = funcionarios.map(func => ({
        tipo: 'solicitacao_cliente',
        mensagem,
        lida: false,
        usuario_id: func.id
      }));

      await Notificacao.bulkCreate(notificacoesToCreate);

      return res.redirect('/cliente/veiculos?sucesso=Sua solicitação de manutenção foi enviada com sucesso! A oficina entrará em contato.');

    } catch (error) {
      console.error('Erro ao solicitar manutenção:', error);
      return res.redirect('/cliente/veiculos?erro=Erro ao processar solicitação.');
    }
  }

  // POST /cliente/revogar-consentimento (LGPD - RF-32)
  static async revogarConsentimento(req, res) {
    const clienteId = req.session.usuario.clienteId;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconhecido';

    const t = await sequelize.transaction();

    try {
      const cliente = await Cliente.findByPk(clienteId, { transaction: t });
      if (!cliente) {
        await t.rollback();
        return res.status(404).send('Cliente não localizado.');
      }

      // Atualiza o consentimento no cliente
      await cliente.update({
        consentimento_lgpd: false,
        data_consentimento_lgpd: null
      }, { transaction: t });

      // Insere o log de revogação na tabela logs_lgpd
      await LogLgpd.create({
        cliente_id: clienteId,
        consentimento_dado: false,
        ip_origem: ip,
        user_agent: userAgent
      }, { transaction: t });

      // Criar notificação para os atendentes avisando da revogação LGPD
      const funcionarios = await Usuario.findAll({ where: { papel: ['admin', 'gerente', 'atendente'] } }, { transaction: t });
      const mensagemNotificacao = `ALERTA LGPD: O cliente de ID ${clienteId} revogou o consentimento de dados. Seu cadastro foi inativado para novos contatos comerciais.`;
      
      const notificacoesToCreate = funcionarios.map(func => ({
        tipo: 'solicitacao_cliente',
        mensagem: mensagemNotificacao,
        lida: false,
        usuario_id: func.id
      }));
      await Notificacao.bulkCreate(notificacoesToCreate, { transaction: t });

      await t.commit();

      return res.redirect('/cliente/veiculos?sucesso=Você revogou seu consentimento LGPD. Seus dados históricos serão mantidos, mas novos contatos estão bloqueados.');

    } catch (error) {
      await t.rollback();
      console.error('Erro ao revogar consentimento LGPD:', error);
      return res.redirect('/cliente/veiculos?erro=Erro ao processar revogação.');
    }
  }

  // POST /cliente/dar-consentimento (Para reativar)
  static async darConsentimento(req, res) {
    const clienteId = req.session.usuario.clienteId;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconhecido';

    const t = await sequelize.transaction();

    try {
      const cliente = await Cliente.findByPk(clienteId, { transaction: t });
      
      await cliente.update({
        consentimento_lgpd: true,
        data_consentimento_lgpd: new Date()
      }, { transaction: t });

      await LogLgpd.create({
        cliente_id: clienteId,
        consentimento_dado: true,
        ip_origem: ip,
        user_agent: userAgent
      }, { transaction: t });

      await t.commit();
      return res.redirect('/cliente/veiculos?sucesso=Consentimento LGPD concedido com sucesso!');
    } catch (error) {
      await t.rollback();
      console.error('Erro ao dar consentimento LGPD:', error);
      return res.redirect('/cliente/veiculos?erro=Erro ao processar consentimento.');
    }
  }
}

module.exports = ClienteAreaController;
