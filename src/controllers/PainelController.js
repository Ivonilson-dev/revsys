const { Op } = require('sequelize');
const { 
  Veiculo, 
  RegistroTroca, 
  Agendamento, 
  Cliente, 
  Usuario, 
  Peca, 
  ModeloVeiculo, 
  MarcaVeiculo,
  Notificacao
} = require('../../models');
const { calcularStatusAlerta } = require('../utils/alertas');
const AgendamentoController = require('./AgendamentoController');

class PainelController {
  // GET /painel
  static async exibirPainel(req, res) {
    const { usuario } = req; // Se colocarmos no middleware de colocar o usuario logado na req
    const usuarioLogado = req.session.usuario;

    // Se o usuário logado for cliente, redireciona para a área do cliente
    if (usuarioLogado.papel === 'cliente') {
      return res.redirect('/cliente/veiculos');
    }

    try {
      // 1. Agendamentos de hoje
      const hojeStr = new Date().toISOString().split('T')[0];
      const agendamentosHoje = await Agendamento.findAll({
        where: { data_agendada: hojeStr },
        include: [
          { 
            model: Cliente, 
            as: 'cliente', 
            include: [{ model: Usuario, as: 'usuario' }] 
          },
          { 
            model: Veiculo, 
            as: 'veiculo',
            include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
          }
        ],
        order: [['horario_agendado', 'ASC']]
      });

      // 2. Total de trocas no mês
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0,0,0,0);
      
      const fimMes = new Date();
      fimMes.setMonth(fimMes.getMonth() + 1);
      fimMes.setDate(0);
      fimMes.setHours(23,59,59,999);

      const totalTrocasMes = await RegistroTroca.count({
        where: {
          data_troca: {
            [Op.between]: [inicioMes.toISOString().split('T')[0], fimMes.toISOString().split('T')[0]]
          }
        }
      });

      // 3. Obter todas as trocas ordenadas para calcular veículos com manutenção atrasada e próximas trocas
      const todasTrocas = await RegistroTroca.findAll({
        include: [
          { 
            model: Veiculo, 
            as: 'veiculo', 
            include: [
              { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
              { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }
            ] 
          },
          { model: Peca, as: 'peca' }
        ],
        order: [['data_troca', 'DESC'], ['id', 'DESC']]
      });

      // Agrupar por veículo e peça para pegar a última troca de cada peça
      const ultimasTrocas = {};
      todasTrocas.forEach(troca => {
        if (!troca.veiculo) return;
        const veiculoId = troca.veiculo_id;
        const pecaId = troca.peca_id;

        if (!ultimasTrocas[veiculoId]) {
          ultimasTrocas[veiculoId] = {};
        }

        if (!ultimasTrocas[veiculoId][pecaId]) {
          ultimasTrocas[veiculoId][pecaId] = troca;
        }
      });

      // Calcular alertas
      const veiculosAtrasados = [];
      const proximasTrocas7Dias = [];
      
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      const em7Dias = new Date();
      em7Dias.setDate(hoje.getDate() + 7);
      em7Dias.setHours(23,59,59,999);

      // Mapear veículos
      const veiculosProcessados = new Set();

      for (const veiculoId in ultimasTrocas) {
        let veiculoAtrasado = false;
        let veiculoInfo = null;

        for (const pecaId in ultimasTrocas[veiculoId]) {
          const troca = ultimasTrocas[veiculoId][pecaId];
          veiculoInfo = troca.veiculo;
          const statusAlerta = calcularStatusAlerta(troca, veiculoInfo.km_atual);

          if (statusAlerta.status === 'vencido') {
            veiculoAtrasado = true;
          }

          // Se estiver nos próximos 7 dias por data
          if (troca.data_prevista_proximo) {
            const dataPrevista = new Date(troca.data_prevista_proximo);
            if (dataPrevista >= hoje && dataPrevista <= em7Dias) {
              proximasTrocas7Dias.push({
                troca,
                veiculo: veiculoInfo,
                peca: troca.peca,
                data_prevista: troca.data_prevista_proximo,
                statusAlerta
              });
            }
          }
        }

        if (veiculoAtrasado && veiculoInfo) {
          veiculosAtrasados.push(veiculoInfo);
        }
      }

      // 4. Notificações não lidas
      const notificacoes = await Notificacao.findAll({
        where: { lida: false },
        order: [['criado_em', 'DESC']],
        limit: 5
      });

      // 5. Alertas de Agendamentos em Janela de 24 Horas (Fila de confirmação de presença)
      let alertas24h = [];
      try {
        alertas24h = await AgendamentoController.carregarAlertas24h();
      } catch (errAlertas) {
        console.error('Erro ao carregar alertas 24h para o painel:', errAlertas);
      }

      // Renderizar o painel com os dados coletados
      return res.render('painel/index', {
        titulo: 'Painel da Oficina',
        agendamentosHoje,
        totalTrocasMes,
        totalVeiculosAtrasados: veiculosAtrasados.length,
        veiculosAtrasados: veiculosAtrasados.slice(0, 5), // limitar a 5 no dashboard
        proximasTrocas7Dias: proximasTrocas7Dias.slice(0, 5), // limitar a 5 no dashboard
        notificacoes,
        alertas24h
      });

    } catch (error) {
      console.error('Erro ao renderizar painel:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }
}

module.exports = PainelController;
