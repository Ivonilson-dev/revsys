const { Op } = require('sequelize');
const { Veiculo, RegistroTroca, Peca, MarcaPeca, Cliente, Usuario, ModeloVeiculo, MarcaVeiculo, Agendamento, Oficina, Servico } = require('../../models');
const { calcularStatusAlerta } = require('../utils/alertas');
const AgendamentoController = require('./AgendamentoController');

class RelatorioController {
  // GET /relatorios
  static async exibirMenu(req, res) {
    try {
      const pecas = await Peca.findAll({ order: [['nome', 'ASC']] });
      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [[{ model: Usuario, as: 'usuario' }, 'nome', 'ASC']]
      });

      return res.render('relatorios/index', {
        titulo: 'Relatórios do Sistema',
        pecas,
        clientes
      });
    } catch (error) {
      console.error('Erro ao abrir página de relatórios:', error);
      return res.status(500).send('Erro.');
    }
  }

  // GET /relatorios/peca
  static async relatorioPeca(req, res) {
    const { peca_id } = req.query;

    if (!peca_id) {
      return res.redirect('/relatorios');
    }

    try {
      const peca = await Peca.findByPk(peca_id, { include: [{ model: MarcaPeca, as: 'marca' }] });
      if (!peca) return res.status(404).send('Peça não encontrada.');

      const trocas = await RegistroTroca.findAll({
        where: { peca_id },
        include: [
          { model: Veiculo, as: 'veiculo', include: [{ model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] }, { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }] }
        ],
        order: [['data_troca', 'DESC']]
      });

      return res.render('relatorios/peca', {
        titulo: `Relatório da Peça: ${peca.nome} (${peca.marca.nome})`,
        peca,
        trocas
      });
    } catch (error) {
      console.error('Erro no relatório por peça:', error);
      return res.status(500).send('Erro interno.');
    }
  }

  // GET /relatorios/cliente
  static async relatorioCliente(req, res) {
    const { cliente_id } = req.query;

    if (!cliente_id) {
      return res.redirect('/relatorios');
    }

    try {
      const cliente = await Cliente.findByPk(cliente_id, {
        include: [{ model: Usuario, as: 'usuario' }]
      });
      if (!cliente) return res.status(404).send('Cliente não encontrado.');

      const veiculos = await Veiculo.findAll({
        where: { cliente_id },
        include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
      });

      const veiculosComStatus = [];

      for (const veiculo of veiculos) {
        // Obter as trocas recentes do veículo
        const trocas = await RegistroTroca.findAll({
          where: { veiculo_id: veiculo.id },
          include: [{ model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }],
          order: [['data_troca', 'DESC']]
        });

        const ultimasTrocas = {};
        trocas.forEach(t => {
          if (!ultimasTrocas[t.peca_id]) {
            ultimasTrocas[t.peca_id] = t;
          }
        });

        const alertas = [];
        let statusGeral = 'normal';

        for (const pecaId in ultimasTrocas) {
          const troca = ultimasTrocas[pecaId];
          const alerta = calcularStatusAlerta(troca, veiculo.km_atual);
          if (alerta.status === 'vencido') {
            statusGeral = 'vencido';
          } else if (alerta.status === 'proximo' && statusGeral !== 'vencido') {
            statusGeral = 'proximo';
          }
          alertas.push({ peca: troca.peca, troca, alerta });
        }

        veiculosComStatus.push({
          veiculo,
          statusGeral,
          alertas
        });
      }

      return res.render('relatorios/cliente', {
        titulo: `Relatório do Cliente: ${cliente.usuario.nome}`,
        cliente,
        veiculosComStatus
      });
    } catch (error) {
      console.error('Erro no relatório de cliente:', error);
      return res.status(500).send('Erro.');
    }
  }

  // GET /relatorios/vencidos
  static async relatorioVencidos(req, res) {
    try {
      const todasTrocas = await RegistroTroca.findAll({
        include: [
          { model: Veiculo, as: 'veiculo', include: [{ model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] }, { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }] },
          { model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }
        ],
        order: [['data_troca', 'DESC']]
      });

      const ultimasTrocas = {};
      todasTrocas.forEach(t => {
        if (!t.veiculo) return;
        const key = `${t.veiculo_id}_${t.peca_id}`;
        if (!ultimasTrocas[key]) {
          ultimasTrocas[key] = t;
        }
      });

      const itensVencidos = [];

      for (const key in ultimasTrocas) {
        const troca = ultimasTrocas[key];
        const veiculo = troca.veiculo;
        const statusAlerta = calcularStatusAlerta(troca, veiculo.km_atual);

        if (statusAlerta.status === 'vencido') {
          const nomeCliente = veiculo.cliente?.usuario?.nome || 'Cliente';
          const placaFormatada = veiculo.placa;
          const modeloStr = veiculo.modelo ? `${veiculo.modelo.marca ? veiculo.modelo.marca.nome + ' ' : ''}${veiculo.modelo.nome}` : 'Veículo';
          const kmFormatado = Number(veiculo.km_atual).toLocaleString('pt-BR');
          const pecaNome = troca.peca ? troca.peca.nome : 'Peça';

          const msgWhats = `Olá ${nomeCliente}, tudo bem? Aqui é da oficina AUTEC.\n\nNotamos que o seu veículo ${modeloStr} (Placa ${placaFormatada}) atingiu ${kmFormatado} km e está com a manutenção preventiva de: *${pecaNome}* com a quilometragem ou período estipulado ultrapassado.\n\nA realização desta manutenção é essencial para a conservação e segurança do veículo. Gostaríamos de convidá-lo a agendar uma revisão conosco. Qual o melhor dia e horário para você? Estamos à disposição!`;

          let telWhats = veiculo.cliente?.telefone_whatsapp ? String(veiculo.cliente.telefone_whatsapp).replace(/\D/g, '') : '';
          if (telWhats.length === 10 || telWhats.length === 11) {
            telWhats = '55' + telWhats;
          }

          itensVencidos.push({
            veiculo,
            peca: troca.peca,
            troca,
            alerta: statusAlerta,
            whatsapp_url: telWhats ? `https://wa.me/${telWhats}?text=${encodeURIComponent(msgWhats)}` : null
          });
        }
      }

      return res.render('relatorios/vencidos', {
        titulo: 'Relatório de Manutenções Vencidas',
        itensVencidos
      });
    } catch (error) {
      console.error('Erro no relatório de vencidos:', error);
      return res.status(500).send('Erro.');
    }
  }

  // GET /relatorios/proximos
  static async relatorioProximos(req, res) {
    try {
      const todasTrocas = await RegistroTroca.findAll({
        include: [
          { model: Veiculo, as: 'veiculo', include: [{ model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] }, { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }] },
          { model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }
        ],
        order: [['data_troca', 'DESC']]
      });

      const ultimasTrocas = {};
      todasTrocas.forEach(t => {
        if (!t.veiculo) return;
        const key = `${t.veiculo_id}_${t.peca_id}`;
        if (!ultimasTrocas[key]) {
          ultimasTrocas[key] = t;
        }
      });

      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      const em7Dias = new Date();
      em7Dias.setDate(hoje.getDate() + 7);
      em7Dias.setHours(23,59,59,999);

      const itensProximos = [];

      for (const key in ultimasTrocas) {
        const troca = ultimasTrocas[key];
        const veiculo = troca.veiculo;
        const statusAlerta = calcularStatusAlerta(troca, veiculo.km_atual);

        // Verifica se vence nos próximos 7 dias por data
        if (troca.data_prevista_proximo) {
          const dataPrevista = new Date(troca.data_prevista_proximo);
          if (dataPrevista >= hoje && dataPrevista <= em7Dias && statusAlerta.status !== 'vencido') {
            itensProximos.push({
              veiculo,
              peca: troca.peca,
              troca,
              alerta: statusAlerta
            });
          }
        }
        // Ou se o alerta geral diz que está próximo (geralmente por KM faltando menos de 1000)
        else if (statusAlerta.status === 'proximo') {
          itensProximos.push({
            veiculo,
            peca: troca.peca,
            troca,
            alerta: statusAlerta
          });
        }
      }

      return res.render('relatorios/proximos', {
        titulo: 'Próximas Trocas (7 dias ou iminente)',
        itensProximos
      });
    } catch (error) {
      console.error('Erro no relatório de próximos:', error);
      return res.status(500).send('Erro.');
    }
  }

  // GET /relatorios/agendamentos
  static async relatorioAgendamentos(req, res) {
    const { tipo } = req.query; // 'dia' ou 'mes'
    const hojeStr = new Date().toLocaleDateString('en-CA');
    
    let whereClause = {};
    let subTitulo = 'Agendamentos';

    try {
      await AgendamentoController.autoConcluirAgendamentosVencidos();
      if (tipo === 'mes') {
        const inicioMes = new Date();
        inicioMes.setDate(1);
        const fimMes = new Date();
        fimMes.setMonth(fimMes.getMonth() + 1);
        fimMes.setDate(0);

        whereClause.data_agendada = {
          [Op.between]: [inicioMes.toISOString().split('T')[0], fimMes.toISOString().split('T')[0]]
        };
        subTitulo = 'Agendamentos Deste Mês';
      } else {
        // Padrão: dia (hoje)
        whereClause.data_agendada = hojeStr;
        subTitulo = 'Agendamentos de Hoje';
      }

      const agendamentos = await Agendamento.findAll({
        where: whereClause,
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { 
            model: Veiculo, 
            as: 'veiculo',
            include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
          },
          { model: Servico, as: 'servico' }
        ],
        order: [['data_agendada', 'ASC'], ['horario_agendado', 'ASC']]
      });

      return res.render('relatorios/agendamentos', {
        titulo: subTitulo,
        agendamentos,
        tipo: tipo || 'dia'
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de agendamentos:', error);
      return res.status(500).send('Erro interno ao buscar agendamentos.');
    }
  }

  // GET /relatorios/trocas-mes
  static async relatorioTrocasMes(req, res) {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    const ano = req.query.ano ? parseInt(req.query.ano) : anoAtual;
    const mes = req.query.mes ? parseInt(req.query.mes) : mesAtual;

    const fimMesObj = new Date(ano, mes, 0); // Último dia do mês

    const inicioMesStr = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fimMesStr = `${ano}-${String(mes).padStart(2, '0')}-${String(fimMesObj.getDate()).padStart(2, '0')}`;

    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    try {
      const trocas = await RegistroTroca.findAll({
        where: {
          data_troca: {
            [Op.between]: [inicioMesStr, fimMesStr]
          }
        },
        include: [
          { 
            model: Veiculo, 
            as: 'veiculo', 
            include: [
              { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
              { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }
            ] 
          },
          { model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] },
          { model: Oficina, as: 'oficina' }
        ],
        order: [['data_troca', 'DESC'], ['id', 'DESC']]
      });

      // Indicadores do mês
      const totalTrocas = trocas.length;
      const veiculosSet = new Set();
      trocas.forEach(t => {
        if (t.veiculo_id) veiculosSet.add(t.veiculo_id);
      });
      const totalVeiculosAtendidos = veiculosSet.size;

      // Peça com maior volume
      const contagemPecas = {};
      trocas.forEach(t => {
        const nomePeca = t.peca ? t.peca.nome : 'Outras Peças';
        contagemPecas[nomePeca] = (contagemPecas[nomePeca] || 0) + 1;
      });

      let pecaDestaque = '-';
      let maxQtd = 0;
      for (const [nome, qtd] of Object.entries(contagemPecas)) {
        if (qtd > maxQtd) {
          maxQtd = qtd;
          pecaDestaque = `${nome} (${qtd}x)`;
        }
      }

      return res.render('relatorios/trocas-mes', {
        titulo: `Trocas de Peças - ${mesesNomes[mes - 1]} de ${ano}`,
        trocas,
        mes,
        ano,
        nomeMes: mesesNomes[mes - 1],
        totalTrocas,
        totalVeiculosAtendidos,
        pecaDestaque,
        inicioMesStr,
        fimMesStr,
        mesAtual,
        anoAtual
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de trocas do mês:', error);
      return res.status(500).send('Erro interno do servidor ao gerar relatório de trocas.');
    }
  }
}

module.exports = RelatorioController;
