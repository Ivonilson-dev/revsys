const { Agendamento, Cliente, Veiculo, Usuario } = require('../../models');
const { Op } = require('sequelize');

// Configuração de Horário Comercial (RF-34)
const HORARIOS_COMERCIAIS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

class AgendamentoController {
  // GET /agendamentos
  static async listar(req, res) {
    const { data, status, cliente_id } = req.query;
    let whereClause = {};

    if (data) {
      whereClause.data_agendada = data;
    }
    if (status) {
      whereClause.status = status;
    }
    if (cliente_id) {
      whereClause.cliente_id = cliente_id;
    }

    try {
      const agendamentos = await Agendamento.findAll({
        where: whereClause,
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: Veiculo, as: 'veiculo' },
          { model: Usuario, as: 'criador' }
        ],
        order: [['data_agendada', 'DESC'], ['horario_agendado', 'ASC']]
      });

      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [[{ model: Usuario, as: 'usuario' }, 'nome', 'ASC']]
      });

      return res.render('agendamentos/index', {
        titulo: 'Lista de Agendamentos',
        agendamentos,
        clientes,
        filtros: { data, status, cliente_id }
      });
    } catch (error) {
      console.error('Erro ao listar agendamentos:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // GET /agendamentos/calendario-tela
  static async exibirCalendario(req, res) {
    try {
      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [[{ model: Usuario, as: 'usuario' }, 'nome', 'ASC']]
      });

      return res.render('agendamentos/calendario', {
        titulo: 'Agenda de Revisões',
        clientes,
        horariosComerciais: HORARIOS_COMERCIAIS
      });
    } catch (error) {
      console.error('Erro ao exibir calendário:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // GET /agendamentos/calendario (API JSON para o FullCalendar - RF-17)
  static async obterEventosCalendario(req, res) {
    const { start, end } = req.query; // datas YYYY-MM-DD enviadas pelo FullCalendar

    try {
      const agendamentos = await Agendamento.findAll({
        where: {
          data_agendada: {
            [Op.between]: [start.split('T')[0], end.split('T')[0]]
          },
          status: {
            [Op.ne]: 'cancelado' // não exibir cancelados no calendário ou exibir com outra cor
          }
        },
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: Veiculo, as: 'veiculo' }
        ]
      });

      const eventos = agendamentos.map(a => {
        let cor = '#0ea5e9'; // Azul default para agendado
        if (a.status === 'concluido') cor = '#10b981'; // Verde para concluído

        return {
          id: a.id,
          title: `${a.horario_agendado} - ${a.cliente.usuario.nome} (${a.veiculo.placa})`,
          start: `${a.data_agendada}T${a.horario_agendado}:00`,
          end: `${a.data_agendada}T${parseInt(a.horario_agendado) + 1}:00`,
          color: cor,
          extendedProps: {
            motivo: a.motivo_revisao,
            status: a.status,
            cliente: a.cliente.usuario.nome,
            placa: a.veiculo.placa,
            observacoes: a.observacoes
          }
        };
      });

      return res.json(eventos);
    } catch (error) {
      console.error('Erro ao obter eventos do calendário:', error);
      return res.status(500).json({ erro: 'Erro interno ao carregar calendário.' });
    }
  }

  // GET /agendamentos/horarios-disponiveis
  static async obterHorariosDisponiveis(req, res) {
    const { data } = req.query;

    if (!data) {
      return res.status(400).json({ erro: 'Data não informada.' });
    }

    try {
      // Buscar agendamentos não cancelados para a data
      const agendamentos = await Agendamento.findAll({
        where: {
          data_agendada: data,
          status: {
            [Op.ne]: 'cancelado'
          }
        }
      });

      const horariosOcupados = agendamentos.map(a => a.horario_agendado);

      const listaHorarios = HORARIOS_COMERCIAIS.map(h => ({
        horario: h,
        ocupado: horariosOcupados.includes(h)
      }));

      return res.json(listaHorarios);
    } catch (error) {
      console.error('Erro ao obter horários disponíveis:', error);
      return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
  }

  // POST /agendamentos
  static async cadastrar(req, res) {
    const { cliente_id, veiculo_id, data_agendada, horario_agendado, motivo_revisao, observacoes } = req.body;
    const criado_por = req.session.usuario.id;

    if (!cliente_id || !veiculo_id || !data_agendada || !horario_agendado || !motivo_revisao) {
      return res.status(400).send('Todos os campos obrigatórios devem ser preenchidos.');
    }

    // Validar horário comercial
    if (!HORARIOS_COMERCIAIS.includes(horario_agendado)) {
      return res.status(400).send('Horário fora do período comercial.');
    }

    try {
      // Regra de ocupação (RF-20): Impedir agendamento no mesmo horário
      const agendamentoExistente = await Agendamento.findOne({
        where: {
          data_agendada,
          horario_agendado,
          status: {
            [Op.ne]: 'cancelado'
          }
        }
      });

      if (agendamentoExistente) {
        return res.status(400).send('Este horário já está ocupado por outro veículo.');
      }

      await Agendamento.create({
        cliente_id,
        veiculo_id,
        data_agendada,
        horario_agendado,
        motivo_revisao,
        observacoes: observacoes || null,
        criado_por,
        status: 'agendado'
      });

      return res.redirect('/agendamentos/calendario-tela?sucesso=Agendamento criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      return res.status(500).send('Erro interno do servidor.');
    }
  }

  // PUT /agendamentos/:id
  static async atualizar(req, res) {
    const { id } = req.params;
    const { status, data_agendada, horario_agendado, motivo_revisao, observacoes } = req.body;

    try {
      const agendamento = await Agendamento.findByPk(id);
      if (!agendamento) {
        return res.status(404).send('Agendamento não encontrado.');
      }

      // Se estiver remarcando (mudando data ou horário)
      if ((data_agendada && data_agendada !== agendamento.data_agendada) || 
          (horario_agendado && horario_agendado !== agendamento.horario_agendado)) {
        
        const novaData = data_agendada || agendamento.data_agendada;
        const novoHorario = horario_agendado || agendamento.horario_agendado;

        // Verificar conflito de horário (RF-20)
        const agendamentoConflito = await Agendamento.findOne({
          where: {
            id: { [Op.ne]: id },
            data_agendada: novaData,
            horario_agendado: novoHorario,
            status: { [Op.ne]: 'cancelado' }
          }
        });

        if (agendamentoConflito) {
          return res.status(400).send('Não é possível remarcar para este horário, pois já está ocupado.');
        }
      }

      await agendamento.update({
        status: status || agendamento.status,
        data_agendada: data_agendada || agendamento.data_agendada,
        horario_agendado: horario_agendado || agendamento.horario_agendado,
        motivo_revisao: motivo_revisao || agendamento.motivo_revisao,
        observacoes: observacoes !== undefined ? observacoes : agendamento.observacoes
      });

      return res.status(200).send('Agendamento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      return res.status(500).send('Erro interno do servidor.');
    }
  }
}

module.exports = AgendamentoController;
