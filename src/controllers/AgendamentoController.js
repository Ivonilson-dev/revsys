const { Agendamento, Cliente, Veiculo, Usuario, Servico, ModeloVeiculo, MarcaVeiculo } = require('../../models');
const { Op } = require('sequelize');

// Configuração de Horários Comerciais com intervalos flexíveis de 30 minutos (RF-20 / RF-34)
const HORARIOS_COMERCIAIS = [
  '08:00', '08:30', '09:00', '09:30', 
  '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', 
  '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00', '17:30'
];

const HORARIO_FECHAMENTO = '18:00';
const HORARIO_ALMOCO_INICIO = '12:00';
const HORARIO_ALMOCO_FIM = '14:00';
const SABADO_HORARIO_LIMITE_INICIO = '10:00';
const SABADO_HORARIO_FECHAMENTO = '12:00';

// Blocos de duração pré-configurados para diferentes tipos de revisão e serviços
const OPCOES_DURACAO = [
  { minutos: 30, rotulo: '30 min (Check-up / Inspeção Rápida)' },
  { minutos: 60, rotulo: '1 hora (Troca de Óleo / Filtros / Alinhamento)' },
  { minutos: 90, rotulo: '1h 30 min (Freios / Pastilhas / Suspensão)' },
  { minutos: 120, rotulo: '2 horas (Revisão Periódica Completa)' },
  { minutos: 150, rotulo: '2h 30 min (Revisão Intermediária)' },
  { minutos: 180, rotulo: '3 horas (Correia Dentada / Embreagem)' },
  { minutos: 240, rotulo: '4 horas (Meio Período / Motor / Câmbio)' },
  { minutos: 480, rotulo: '8 horas (Dia Inteiro / Manutenção Geral)' }
];

// Funções auxiliares para manipulação e colisão de blocos de tempo
function horaParaMinutos(horarioStr) {
  if (!horarioStr) return 0;
  const [h, m] = horarioStr.split(':').map(Number);
  return h * 60 + m;
}

function minutosParaHora(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calcularHorarioFim(horarioInicio, duracaoMinutos) {
  const minInicio = horaParaMinutos(horarioInicio);
  const minFim = minInicio + Number(duracaoMinutos || 60);
  return minutosParaHora(minFim);
}

// Verifica colisão entre dois intervalos abertos [inicio1, fim1) e [inicio2, fim2)
function verificarSobreposicao(inicio1, fim1, inicio2, fim2) {
  const i1 = horaParaMinutos(inicio1);
  const f1 = horaParaMinutos(fim1);
  const i2 = horaParaMinutos(inicio2);
  const f2 = horaParaMinutos(fim2);
  return i1 < f2 && f1 > i2;
}

// Retorna o dia da semana seguro (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
function obterDiaDaSemana(dataStr) {
  if (!dataStr) return -1;
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const dt = new Date(ano, mes - 1, dia, 12, 0, 0);
  return dt.getDay();
}

// Verifica se há colisão com o intervalo de almoço (12:00 às 14:00)
function colideComAlmoco(horarioInicio, horarioFim) {
  return verificarSobreposicao(horarioInicio, horarioFim, HORARIO_ALMOCO_INICIO, HORARIO_ALMOCO_FIM);
}

class AgendamentoController {
  // Auto-conclusão de agendamentos com presença confirmada cujo tempo alocado expirou
  static async autoConcluirAgendamentosVencidos() {
    const agora = new Date();
    const hojeStr = agora.toLocaleDateString('en-CA');
    const horaAtualStr = agora.toTimeString().substring(0, 5);

    try {
      const agendamentosParaConcluir = await Agendamento.findAll({
        where: {
          status: 'agendado',
          confirmacao_presenca: 'confirmada',
          [Op.or]: [
            { data_agendada: { [Op.lt]: hojeStr } },
            { data_agendada: hojeStr }
          ]
        }
      });

      const idsParaConcluir = [];

      for (const a of agendamentosParaConcluir) {
        if (a.data_agendada < hojeStr) {
          idsParaConcluir.push(a.id);
        } else {
          const fim = a.horario_fim || calcularHorarioFim(a.horario_agendado, a.duracao_minutos || 60);
          if (fim <= horaAtualStr) {
            idsParaConcluir.push(a.id);
          }
        }
      }

      if (idsParaConcluir.length > 0) {
        await Agendamento.update(
          { status: 'concluido' },
          { where: { id: { [Op.in]: idsParaConcluir } } }
        );
        console.log(`[Auto-Conclusão] ${idsParaConcluir.length} agendamento(s) confirmado(s) com tempo alocado expirado foram concluídos automaticamente: IDs [${idsParaConcluir.join(', ')}]`);
      }

      return idsParaConcluir.length;
    } catch (error) {
      console.error('Erro na auto-conclusão de agendamentos vencidos:', error);
      return 0;
    }
  }

  // GET /agendamentos
  static async listar(req, res) {
    await AgendamentoController.autoConcluirAgendamentosVencidos();
    const { data, status, cliente_id, veiculo_id } = req.query;
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
    if (veiculo_id) {
      whereClause.veiculo_id = veiculo_id;
    }

    try {
      const agendamentos = await Agendamento.findAll({
        where: whereClause,
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { 
            model: Veiculo, 
            as: 'veiculo',
            include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
          },
          { model: Usuario, as: 'criador' },
          { model: Servico, as: 'servico' }
        ],
        order: [['data_agendada', 'DESC'], ['horario_agendado', 'ASC']]
      });

      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [[{ model: Usuario, as: 'usuario' }, 'nome', 'ASC']]
      });

      const veiculos = await Veiculo.findAll({
        include: [
          { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] },
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] }
        ],
        order: [['placa', 'ASC']]
      });

      const servicos = await Servico.findAll({
        order: [['nome', 'ASC']]
      });

      return res.render('agendamentos/index', {
        titulo: 'Lista de Agendamentos',
        agendamentos,
        clientes,
        veiculos,
        servicos,
        filtros: { data, status, cliente_id, veiculo_id }
      });
    } catch (error) {
      console.error('Erro ao listar agendamentos:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // GET /agendamentos/calendario-tela
  static async exibirCalendario(req, res) {
    try {
      await AgendamentoController.autoConcluirAgendamentosVencidos();
      const { cliente_id, veiculo_id } = req.query;

      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [[{ model: Usuario, as: 'usuario' }, 'nome', 'ASC']]
      });

      const servicos = await Servico.findAll({
        order: [['nome', 'ASC']]
      });

      return res.render('agendamentos/calendario', {
        titulo: 'Agenda de Revisões',
        clientes,
        servicos,
        horariosComerciais: HORARIOS_COMERCIAIS,
        opcoesDuracao: OPCOES_DURACAO,
        clientePreSelecionado: cliente_id || null,
        veiculoPreSelecionado: veiculo_id || null
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
      await AgendamentoController.autoConcluirAgendamentosVencidos();

      const agendamentos = await Agendamento.findAll({
        where: {
          data_agendada: {
            [Op.between]: [start.split('T')[0], end.split('T')[0]]
          },
          status: {
            [Op.ne]: 'cancelado'
          }
        },
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: Veiculo, as: 'veiculo' },
          { model: Servico, as: 'servico' }
        ]
      });

      const eventos = agendamentos.map(a => {
        let cor = '#0ea5e9'; // Azul default para agendado
        if (a.status === 'concluido') cor = '#10b981'; // Verde para concluído

        const servicoNome = a.servico ? a.servico.nome : '';
        const duracaoMin = a.duracao_minutos || 60;
        const horarioFim = a.horario_fim || calcularHorarioFim(a.horario_agendado, duracaoMin);

        const tituloExibicao = servicoNome 
          ? `${a.horario_agendado} às ${horarioFim} - ${a.cliente ? a.cliente.usuario.nome : 'Cliente'} (${a.veiculo ? a.veiculo.placa : 'Placa'}) - ${servicoNome}`
          : `${a.horario_agendado} às ${horarioFim} - ${a.cliente ? a.cliente.usuario.nome : 'Cliente'} (${a.veiculo ? a.veiculo.placa : 'Placa'})`;

        return {
          id: a.id,
          title: tituloExibicao,
          start: `${a.data_agendada}T${a.horario_agendado}:00`,
          end: `${a.data_agendada}T${horarioFim}:00`,
          color: cor,
          extendedProps: {
            motivo: a.motivo_revisao,
            servico: servicoNome,
            status: a.status,
            cliente: a.cliente ? a.cliente.usuario.nome : 'Cliente',
            clienteId: a.cliente_id,
            veiculoId: a.veiculo_id,
            placa: a.veiculo ? a.veiculo.placa : '',
            observacoes: a.observacoes,
            dataAgendada: a.data_agendada,
            horarioInicio: a.horario_agendado,
            horarioFim: horarioFim,
            duracaoMinutos: duracaoMin,
            motivoCancelamento: a.motivo_cancelamento || '',
            confirmacaoPresenca: a.confirmacao_presenca || 'pendente',
            confirmacaoSolicitadaEm: a.confirmacao_solicitada_em,
            confirmadoEm: a.confirmado_em
          }
        };
      });

      return res.json(eventos);
    } catch (error) {
      console.error('Erro ao obter eventos do calendário:', error);
      return res.status(500).json({ erro: 'Erro interno ao carregar calendário.' });
    }
  }

  // GET /agendamentos/horarios-disponiveis (Suporta duração flexível e verificação de conflitos)
  static async obterHorariosDisponiveis(req, res) {
    await AgendamentoController.autoConcluirAgendamentosVencidos();
    const { data, duracao, ignorar_id } = req.query;

    if (!data) {
      return res.status(400).json({ erro: 'Data não informada.' });
    }

    const duracaoMin = parseInt(duracao, 10) || 60;
    const diaSemana = obterDiaDaSemana(data);

    const agora = new Date();
    const hojeStr = agora.toLocaleDateString('en-CA');
    const horaAtualStr = agora.toTimeString().substring(0, 5);

    // 0. Regra de Data no Passado: Bloqueio total para datas anteriores a hoje
    if (data < hojeStr) {
      const listaPassado = HORARIOS_COMERCIAIS.map(h => ({
        horario: h,
        horario_fim: calcularHorarioFim(h, duracaoMin),
        ocupado: true,
        motivo_bloqueio: 'Data no passado (não é possível agendar retroativamente)'
      }));
      return res.json(listaPassado);
    }

    // 1. Regra de Domingo: A oficina não abre aos domingos
    if (diaSemana === 0) {
      const listaDomingo = HORARIOS_COMERCIAIS.map(h => ({
        horario: h,
        horario_fim: calcularHorarioFim(h, duracaoMin),
        ocupado: true,
        motivo_bloqueio: 'Oficina fechada aos domingos'
      }));
      return res.json(listaDomingo);
    }

    try {
      const whereClause = {
        data_agendada: data,
        status: {
          [Op.ne]: 'cancelado'
        }
      };

      if (ignorar_id) {
        whereClause.id = { [Op.ne]: ignorar_id };
      }

      const agendamentos = await Agendamento.findAll({
        where: whereClause,
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: Veiculo, as: 'veiculo' }
        ]
      });

      // Mapear intervalos ocupados no dia
      const intervalosOcupados = agendamentos.map(a => {
        const inicio = a.horario_agendado;
        const dur = a.duracao_minutos || 60;
        const fim = a.horario_fim || calcularHorarioFim(inicio, dur);
        return {
          id: a.id,
          inicio,
          fim,
          cliente: a.cliente?.usuario?.nome || 'Cliente',
          placa: a.veiculo?.placa || '',
          motivo: a.motivo_revisao
        };
      });

      const minFechamentoSemana = horaParaMinutos(HORARIO_FECHAMENTO);
      const minFechamentoSabado = horaParaMinutos(SABADO_HORARIO_FECHAMENTO);

      const listaHorarios = HORARIOS_COMERCIAIS.map(h => {
        const minInicio = horaParaMinutos(h);
        const minFim = minInicio + duracaoMin;
        const horarioFimEstimado = minutosParaHora(minFim);

        // 0.1. Se for a data de hoje, horários já transcorridos não podem ser agendados
        if (data === hojeStr && h <= horaAtualStr) {
          return {
            horario: h,
            horario_fim: horarioFimEstimado,
            ocupado: true,
            motivo_bloqueio: 'Horário já transcorrido hoje (não é possível agendar retroativamente)'
          };
        }

        // A. Regras de Sábado (diaSemana === 6): início apenas até as 10:00 e fechamento às 12:00
        if (diaSemana === 6) {
          if (h > SABADO_HORARIO_LIMITE_INICIO) {
            return {
              horario: h,
              horario_fim: horarioFimEstimado,
              ocupado: true,
              motivo_bloqueio: `Aos sábados os atendimentos iniciam somente até as ${SABADO_HORARIO_LIMITE_INICIO} (fechamento às ${SABADO_HORARIO_FECHAMENTO})`
            };
          }
          if (minFim > minFechamentoSabado) {
            return {
              horario: h,
              horario_fim: horarioFimEstimado,
              ocupado: true,
              motivo_bloqueio: `Ultrapassa o fechamento de sábado (${SABADO_HORARIO_FECHAMENTO})`
            };
          }
        } else {
          // B. Regras de Segunda a Sexta: Fechamento às 18:00
          if (minFim > minFechamentoSemana) {
            return {
              horario: h,
              horario_fim: horarioFimEstimado,
              ocupado: true,
              motivo_bloqueio: `Ultrapassa horário de fechamento (${HORARIO_FECHAMENTO})`
            };
          }
        }

        // C. Regra de Horário de Almoço (12:00 às 14:00) para qualquer data
        if (colideComAlmoco(h, horarioFimEstimado)) {
          return {
            horario: h,
            horario_fim: horarioFimEstimado,
            ocupado: true,
            motivo_bloqueio: `Horário de almoço da oficina (${HORARIO_ALMOCO_INICIO} às ${HORARIO_ALMOCO_FIM})`
          };
        }

        // D. Verifica sobreposição com agendamentos existentes
        const conflito = intervalosOcupados.find(ocupado =>
          verificarSobreposicao(h, horarioFimEstimado, ocupado.inicio, ocupado.fim)
        );

        if (conflito) {
          return {
            horario: h,
            horario_fim: horarioFimEstimado,
            ocupado: true,
            motivo_bloqueio: `Ocupado: ${conflito.cliente} (${conflito.placa}) das ${conflito.inicio} às ${conflito.fim}`
          };
        }

        return {
          horario: h,
          horario_fim: horarioFimEstimado,
          ocupado: false,
          motivo_bloqueio: null
        };
      });

      return res.json(listaHorarios);
    } catch (error) {
      console.error('Erro ao obter horários disponíveis:', error);
      return res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
  }

  // POST /agendamentos
  static async cadastrar(req, res) {
    const { cliente_id, veiculo_id, servico_id, data_agendada, horario_agendado, duracao_minutos, horario_fim, motivo_revisao, observacoes } = req.body;
    const criado_por = req.session.usuario.id;

    if (!cliente_id || !veiculo_id || !data_agendada || !horario_agendado || !motivo_revisao) {
      return res.status(400).send('Todos os campos obrigatórios devem ser preenchidos.');
    }

    if (!HORARIOS_COMERCIAIS.includes(horario_agendado)) {
      return res.status(400).send('Horário de início fora do período comercial.');
    }

    // Regra de Domingo: A oficina não abre aos domingos
    const diaSemana = obterDiaDaSemana(data_agendada);
    if (diaSemana === 0) {
      return res.status(400).send('A oficina não abre aos domingos. Por favor, escolha uma data de segunda a sábado.');
    }

    // Inconsistência lógica: Bloquear agendamento no passado
    const agora = new Date();
    const hojeStr = agora.toLocaleDateString('en-CA');
    const horaAtualStr = agora.toTimeString().substring(0, 5);
    if (data_agendada < hojeStr || (data_agendada === hojeStr && horario_agendado < horaAtualStr)) {
      return res.status(400).send('Inconsistência lógica: Não é possível realizar agendamentos em datas ou horários que já passaram.');
    }

    const duracaoMin = parseInt(duracao_minutos, 10) || 60;
    const fimCalculado = horario_fim || calcularHorarioFim(horario_agendado, duracaoMin);

    // Validação de Sábado vs Dias Úteis
    if (diaSemana === 6) {
      if (horario_agendado > SABADO_HORARIO_LIMITE_INICIO) {
        return res.status(400).send(`Aos sábados, a oficina realiza agendamentos com horário de início somente até as ${SABADO_HORARIO_LIMITE_INICIO}.`);
      }
      if (horaParaMinutos(fimCalculado) > horaParaMinutos(SABADO_HORARIO_FECHAMENTO)) {
        return res.status(400).send(`Aos sábados, a oficina fecha às ${SABADO_HORARIO_FECHAMENTO}. O tempo estimado do serviço ultrapassa o expediente.`);
      }
    } else {
      // Valida se o término não excede o expediente em dias de semana (18:00)
      if (horaParaMinutos(fimCalculado) > horaParaMinutos(HORARIO_FECHAMENTO)) {
        return res.status(400).send(`O bloco de agendamento excede o horário de expediente da oficina (até às ${HORARIO_FECHAMENTO}).`);
      }
    }

    // Validação do Horário de Almoço (12:00 às 14:00) para qualquer data
    if (colideComAlmoco(horario_agendado, fimCalculado)) {
      return res.status(400).send(`O intervalo das ${HORARIO_ALMOCO_INICIO} às ${HORARIO_ALMOCO_FIM} é reservado para o almoço da oficina. Nenhum agendamento pode coincidir ou sobrepor este período.`);
    }

    try {
      // Buscar todos os agendamentos do dia não cancelados para checar colisão de intervalo
      const agendamentosExistentes = await Agendamento.findAll({
        where: {
          data_agendada,
          status: { [Op.ne]: 'cancelado' }
        },
        include: [{ model: Veiculo, as: 'veiculo' }]
      });

      const conflito = agendamentosExistentes.find(existente => {
        const exFim = existente.horario_fim || calcularHorarioFim(existente.horario_agendado, existente.duracao_minutos || 60);
        return verificarSobreposicao(horario_agendado, fimCalculado, existente.horario_agendado, exFim);
      });

      if (conflito) {
        const exFim = conflito.horario_fim || calcularHorarioFim(conflito.horario_agendado, conflito.duracao_minutos || 60);
        return res.status(400).send(`Conflito de agenda: o veículo ${conflito.veiculo ? conflito.veiculo.placa : ''} já possui agendamento das ${conflito.horario_agendado} às ${exFim}. Escolha outro bloco de horário.`);
      }

      await Agendamento.create({
        cliente_id,
        veiculo_id,
        servico_id: servico_id ? parseInt(servico_id) : null,
        data_agendada,
        horario_agendado,
        duracao_minutos: duracaoMin,
        horario_fim: fimCalculado,
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
    const { status, data_agendada, horario_agendado, duracao_minutos, horario_fim, motivo_revisao, observacoes, motivo_cancelamento } = req.body;

    try {
      const agendamento = await Agendamento.findByPk(id);
      if (!agendamento) {
        return res.status(404).send('Agendamento não encontrado.');
      }

      const novaData = data_agendada || agendamento.data_agendada;
      const novoInicio = horario_agendado || agendamento.horario_agendado;
      const novaDuracao = duracao_minutos ? parseInt(duracao_minutos, 10) : (agendamento.duracao_minutos || 60);
      const novoFim = horario_fim || calcularHorarioFim(novoInicio, novaDuracao);
      const novoStatus = status || agendamento.status;

      // Inconsistência Lógica: Preservação de Histórico - Agendamentos já concluídos não podem ser revertidos ou cancelados
      if (agendamento.status === 'concluido' && novoStatus !== 'concluido') {
        return res.status(400).send('Inconsistência lógica: Um agendamento já CONCLUÍDO preserva o histórico de serviços executados e não pode ser cancelado ou revertido.');
      }

      // Regra de Negócio: Não permitir estender ou alterar tempo alocado de agendamentos já concluídos
      if (agendamento.status === 'concluido') {
        const mudouData = data_agendada && data_agendada !== agendamento.data_agendada;
        const mudouHorario = horario_agendado && horario_agendado !== agendamento.horario_agendado;
        const mudouDuracao = duracao_minutos && parseInt(duracao_minutos, 10) !== agendamento.duracao_minutos;

        if (mudouData || mudouHorario || mudouDuracao) {
          return res.status(400).send('Este agendamento já foi concluído e seu tempo alocado foi finalizado. Caso o cliente necessite de mais slots de tempo ou novos serviços, realize um novo agendamento de acordo com a disponibilidade da oficina.');
        }
      }

      // Inconsistência Lógica 1: Agendamentos futuros NÃO podem ser marcados como concluídos
      if (novoStatus === 'concluido') {
        const agora = new Date();
        const hojeStr = agora.toLocaleDateString('en-CA');
        const horaAtualStr = agora.toTimeString().substring(0, 5);
        const ehFuturo = novaData > hojeStr || (novaData === hojeStr && novoInicio > horaAtualStr);

        if (ehFuturo) {
          return res.status(400).send('Inconsistência lógica: Não é possível marcar um agendamento futuro como concluído antes da data e horário marcados.');
        }
      }

      // Regra de Cancelamento: Obrigatoriedade de especificar o motivo
      if (novoStatus === 'cancelado') {
        if (!motivo_cancelamento || !motivo_cancelamento.trim()) {
          return res.status(400).send('Para cancelar o agendamento, é obrigatório informar o motivo do cancelamento.');
        }
      }

      // Se o status for diferente de cancelado, valida regras de data retroativa, expediente e conflito de intervalo
      if (novoStatus !== 'cancelado') {
        const agora = new Date();
        const hojeStr = agora.toLocaleDateString('en-CA');
        const horaAtualStr = agora.toTimeString().substring(0, 5);

        // Bloqueio de reagendamento para datas/horários passados
        const ehPassado = novaData < hojeStr || (novaData === hojeStr && novoInicio < horaAtualStr);
        if (ehPassado && (novaData !== agendamento.data_agendada || novoInicio !== agendamento.horario_agendado)) {
          return res.status(400).send('Inconsistência lógica: Não é possível reagendar para datas ou horários que já passaram.');
        }

        const diaSemanaNovo = obterDiaDaSemana(novaData);
        if (diaSemanaNovo === 0) {
          return res.status(400).send('A oficina não abre aos domingos. Por favor, escolha uma data de segunda a sábado.');
        }

        if (diaSemanaNovo === 6) {
          if (novoInicio > SABADO_HORARIO_LIMITE_INICIO) {
            return res.status(400).send(`Aos sábados, a oficina realiza agendamentos com horário de início somente até as ${SABADO_HORARIO_LIMITE_INICIO}.`);
          }
          if (horaParaMinutos(novoFim) > horaParaMinutos(SABADO_HORARIO_FECHAMENTO)) {
            return res.status(400).send(`Aos sábados, a oficina fecha às ${SABADO_HORARIO_FECHAMENTO}. O tempo estimado do serviço ultrapassa o expediente de sábado.`);
          }
        } else {
          if (horaParaMinutos(novoFim) > horaParaMinutos(HORARIO_FECHAMENTO)) {
            return res.status(400).send(`O bloco de agendamento excede o horário de expediente da oficina (até às ${HORARIO_FECHAMENTO}).`);
          }
        }

        if (colideComAlmoco(novoInicio, novoFim)) {
          return res.status(400).send(`O intervalo das ${HORARIO_ALMOCO_INICIO} às ${HORARIO_ALMOCO_FIM} é reservado para o almoço da oficina. Nenhum agendamento pode coincidir ou sobrepor este período.`);
        }

        const agendamentosExistentes = await Agendamento.findAll({
          where: {
            id: { [Op.ne]: id },
            data_agendada: novaData,
            status: { [Op.ne]: 'cancelado' }
          },
          include: [{ model: Veiculo, as: 'veiculo' }]
        });

        const conflito = agendamentosExistentes.find(existente => {
          const exFim = existente.horario_fim || calcularHorarioFim(existente.horario_agendado, existente.duracao_minutos || 60);
          return verificarSobreposicao(novoInicio, novoFim, existente.horario_agendado, exFim);
        });

        if (conflito) {
          const exFim = conflito.horario_fim || calcularHorarioFim(conflito.horario_agendado, conflito.duracao_minutos || 60);
          return res.status(400).send(`Não é possível reagendar: conflito com o veículo ${conflito.veiculo ? conflito.veiculo.placa : ''} das ${conflito.horario_agendado} às ${exFim}.`);
        }
      }

      await agendamento.update({
        status: novoStatus,
        data_agendada: novaData,
        horario_agendado: novoInicio,
        duracao_minutos: novaDuracao,
        horario_fim: novoFim,
        motivo_revisao: motivo_revisao || agendamento.motivo_revisao,
        observacoes: observacoes !== undefined ? observacoes : agendamento.observacoes,
        motivo_cancelamento: novoStatus === 'cancelado' ? motivo_cancelamento.trim() : (novoStatus === 'agendado' ? null : agendamento.motivo_cancelamento)
      });

      return res.status(200).send('Agendamento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      return res.status(500).send('Erro interno do servidor.');
    }
  }

  // Helper estático: Carrega a fila ordenada de agendamentos em janela de 24h
  static async carregarAlertas24h() {
    await AgendamentoController.autoConcluirAgendamentosVencidos();
    const agora = new Date();
    const limite24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
    const hojeStr = agora.toLocaleDateString('en-CA');
    const limiteStr = limite24h.toLocaleDateString('en-CA');

    const agendamentos = await Agendamento.findAll({
      where: {
        data_agendada: {
          [Op.between]: [hojeStr, limiteStr]
        },
        status: 'agendado',
        confirmacao_presenca: {
          [Op.ne]: 'confirmada'
        },
        [Op.or]: [
          { confirmacao_adiada_ate: null },
          { confirmacao_adiada_ate: { [Op.lte]: agora } }
        ]
      },
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

    const filaAlertas = [];

    for (const a of agendamentos) {
      const [ano, mes, dia] = a.data_agendada.split('-').map(Number);
      const [hora, min] = a.horario_agendado.split(':').map(Number);
      const inicio = new Date(ano, mes - 1, dia, hora, min, 0);
      const diffMs = inicio.getTime() - agora.getTime();

      // Precisa estar a 24 horas ou menos do prazo inicial e ainda não ter passado
      if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
        const horasRestantes = Math.floor(diffMs / (1000 * 60 * 60));
        const minutosRestantes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let telefoneLimpo = a.cliente && a.cliente.telefone_whatsapp ? String(a.cliente.telefone_whatsapp).replace(/\D/g, '') : '';
        if (telefoneLimpo.length === 10 || telefoneLimpo.length === 11) {
          telefoneLimpo = '55' + telefoneLimpo;
        }

        const [anoStr, mesStr, diaStr] = String(a.data_agendada).split('-');
        const dataFormatada = `${diaStr}/${mesStr}/${anoStr}`;
        const nomeCliente = a.cliente && a.cliente.usuario ? a.cliente.usuario.nome : 'Cliente';
        const placaVeiculo = a.veiculo ? a.veiculo.placa : '';
        const modeloVeiculo = a.veiculo && a.veiculo.modelo ? `${a.veiculo.modelo.marca ? a.veiculo.modelo.marca.nome + ' ' : ''}${a.veiculo.modelo.nome}` : '';
        const servicoNome = a.servico ? a.servico.nome : a.motivo_revisao;

        const msgWhats = `Olá ${nomeCliente}, tudo bem? Aqui é da oficina AUTEC. Lembramos que você possui um agendamento de revisão para ${dataFormatada} às ${a.horario_agendado} referente ao veículo ${modeloVeiculo ? modeloVeiculo + ' ' : ''}(${placaVeiculo}). Você confirma sua presença?`;

        filaAlertas.push({
          id: a.id,
          cliente_nome: nomeCliente,
          cliente_telefone: a.cliente ? a.cliente.telefone_whatsapp : '',
          telefone_limpo: telefoneLimpo,
          whatsapp_url: telefoneLimpo ? `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(msgWhats)}` : null,
          mensagem_whatsapp: msgWhats,
          veiculo_placa: placaVeiculo,
          veiculo_modelo: modeloVeiculo,
          data_agendada: a.data_agendada,
          data_formatada: dataFormatada,
          horario_agendado: a.horario_agendado,
          horario_fim: a.horario_fim,
          duracao_minutos: a.duracao_minutos,
          motivo_revisao: a.motivo_revisao,
          servico_nome: servicoNome,
          confirmacao_presenca: a.confirmacao_presenca || 'pendente',
          confirmacao_solicitada_em: a.confirmacao_solicitada_em,
          horas_restantes: horasRestantes,
          minutos_restantes: minutosRestantes
        });
      }
    }

    return filaAlertas;
  }

  // GET /agendamentos/alertas-24h (Retorna JSON com a fila de alertas para o modal)
  static async obterAlertas24h(req, res) {
    try {
      const alertas = await AgendamentoController.carregarAlertas24h();
      return res.json(alertas);
    } catch (error) {
      console.error('Erro ao buscar alertas 24h:', error);
      return res.status(500).json({ erro: 'Erro ao carregar fila de confirmação.' });
    }
  }

  // POST /agendamentos/:id/solicitar-confirmacao (Marca como solicitada e adia alerta em 60 min)
  static async solicitarConfirmacao(req, res) {
    const { id } = req.params;
    try {
      const agendamento = await Agendamento.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: Veiculo, as: 'veiculo', include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }] }
        ]
      });

      if (!agendamento) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      }

      const em60Min = new Date(Date.now() + 60 * 60 * 1000);

      await agendamento.update({
        confirmacao_presenca: 'solicitada',
        confirmacao_solicitada_em: new Date(),
        confirmacao_adiada_ate: em60Min
      });

      let telefoneLimpo = agendamento.cliente && agendamento.cliente.telefone_whatsapp ? String(agendamento.cliente.telefone_whatsapp).replace(/\D/g, '') : '';
      if (telefoneLimpo.length === 10 || telefoneLimpo.length === 11) {
        telefoneLimpo = '55' + telefoneLimpo;
      }

      const [anoStr, mesStr, diaStr] = String(agendamento.data_agendada).split('-');
      const dataFormatada = `${diaStr}/${mesStr}/${anoStr}`;
      const nomeCliente = agendamento.cliente && agendamento.cliente.usuario ? agendamento.cliente.usuario.nome : 'Cliente';
      const placaVeiculo = agendamento.veiculo ? agendamento.veiculo.placa : '';
      const modeloVeiculo = agendamento.veiculo && agendamento.veiculo.modelo ? `${agendamento.veiculo.modelo.marca ? agendamento.veiculo.modelo.marca.nome + ' ' : ''}${agendamento.veiculo.modelo.nome}` : '';

      const msgWhats = `Olá ${nomeCliente}, tudo bem? Aqui é da oficina AUTEC. Lembramos que você possui um agendamento de revisão para ${dataFormatada} às ${agendamento.horario_agendado} referente ao veículo ${modeloVeiculo ? modeloVeiculo + ' ' : ''}(${placaVeiculo}). Você confirma sua presença?`;

      return res.json({
        sucesso: true,
        mensagem: 'Confirmação solicitada via WhatsApp! O lembrete retornará em 60 minutos caso a presença não seja confirmada.',
        whatsapp_url: telefoneLimpo ? `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(msgWhats)}` : null
      });

    } catch (error) {
      console.error('Erro ao solicitar confirmação:', error);
      return res.status(500).json({ erro: 'Erro interno ao registrar solicitação de confirmação.' });
    }
  }

  // POST /agendamentos/:id/adiar-confirmacao (Adia o lembrete por 60 minutos)
  static async adiarConfirmacao(req, res) {
    const { id } = req.params;
    try {
      const agendamento = await Agendamento.findByPk(id);
      if (!agendamento) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      }

      const em60Min = new Date(Date.now() + 60 * 60 * 1000);

      await agendamento.update({
        confirmacao_adiada_ate: em60Min
      });

      return res.json({
        sucesso: true,
        mensagem: 'Alerta adiado por 60 minutos com sucesso.'
      });

    } catch (error) {
      console.error('Erro ao adiar confirmação:', error);
      return res.status(500).json({ erro: 'Erro interno ao adiar alerta.' });
    }
  }

  // POST /agendamentos/:id/confirmar-presenca (Dá baixa no sistema confirmando presença)
  static async confirmarPresenca(req, res) {
    const { id } = req.params;
    try {
      const agendamento = await Agendamento.findByPk(id);
      if (!agendamento) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' });
      }

      const agora = new Date();
      const hojeStr = agora.toLocaleDateString('en-CA');
      const horaAtualStr = agora.toTimeString().substring(0, 5);
      const fim = agendamento.horario_fim || calcularHorarioFim(agendamento.horario_agendado, agendamento.duracao_minutos || 60);
      const jaPassou = agendamento.data_agendada < hojeStr || (agendamento.data_agendada === hojeStr && fim <= horaAtualStr);

      const dadosAtualizacao = {
        confirmacao_presenca: 'confirmada',
        confirmado_em: agora,
        confirmacao_adiada_ate: null
      };

      // Se o tempo alocado já expirou no momento em que a presença é confirmada, transiciona automaticamente para concluído
      if (jaPassou && agendamento.status === 'agendado') {
        dadosAtualizacao.status = 'concluido';
      }

      await agendamento.update(dadosAtualizacao);

      const mensagemRetorno = dadosAtualizacao.status === 'concluido'
        ? 'Presença confirmada e agendamento concluído automaticamente, pois o tempo alocado já foi finalizado.'
        : 'Presença confirmada com sucesso! Baixa registrada no sistema.';

      return res.json({
        sucesso: true,
        mensagem: mensagemRetorno,
        statusAtual: dadosAtualizacao.status || agendamento.status
      });

    } catch (error) {
      console.error('Erro ao confirmar presença:', error);
      return res.status(500).json({ erro: 'Erro interno ao confirmar presença.' });
    }
  }
}

module.exports = AgendamentoController;
