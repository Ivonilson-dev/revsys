import { Request, Response } from 'express';
import { Agendamento, Cliente, Veiculo, Usuario, Servico, ModeloVeiculo, MarcaVeiculo, Notificacao } from '../../models';
import { AgendamentoAttributes } from '../../models/Agendamento';
import { Op, WhereOptions } from 'sequelize';
import { IHorarioSlot, IDuracaoOpcao } from '../types';
import { tratarErroRequisicao } from '../utils/erros';

// Configuração de Horários Comerciais com intervalos flexíveis de 30 minutos (RF-20 / RF-34)
export const HORARIOS_COMERCIAIS: readonly string[] = [
  '08:00', '08:30', '09:00', '09:30', 
  '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', 
  '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00', '17:30'
];

export const HORARIO_FECHAMENTO = '18:00';
export const HORARIO_ALMOCO_INICIO = '12:00';
export const HORARIO_ALMOCO_FIM = '14:00';
export const SABADO_HORARIO_LIMITE_INICIO = '10:00';
export const SABADO_HORARIO_FECHAMENTO = '12:00';

// Blocos de duração pré-configurados para diferentes tipos de revisão e serviços
export const OPCOES_DURACAO: readonly IDuracaoOpcao[] = [
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
export function horaParaMinutos(horarioStr: string): number {
  if (!horarioStr) return 0;
  const [h, m] = horarioStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function calcularHorarioFim(horarioInicio: string, duracaoMinutos: number | string): string {
  const minInicio = horaParaMinutos(horarioInicio);
  const minFim = minInicio + Number(duracaoMinutos || 60);
  return minutosParaHora(minFim);
}

// Verifica colisão entre dois intervalos abertos [inicio1, fim1) e [inicio2, fim2)
export function verificarSobreposicao(inicio1: string, fim1: string, inicio2: string, fim2: string): boolean {
  const i1 = horaParaMinutos(inicio1);
  const f1 = horaParaMinutos(fim1);
  const i2 = horaParaMinutos(inicio2);
  const f2 = horaParaMinutos(fim2);
  return i1 < f2 && f1 > i2;
}

// Retorna o dia da semana seguro (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
export function obterDiaDaSemana(dataStr: string): number {
  if (!dataStr) return -1;
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const dt = new Date(ano, mes - 1, dia, 12, 0, 0);
  return dt.getDay();
}

// Verifica se há colisão com o intervalo de almoço (12:00 às 14:00)
export function colideComAlmoco(horarioInicio: string, horarioFim: string): boolean {
  return verificarSobreposicao(horarioInicio, horarioFim, HORARIO_ALMOCO_INICIO, HORARIO_ALMOCO_FIM);
}

export interface ICadastroAgendamentoBody {
  cliente_id?: string | number;
  veiculo_id?: string | number;
  servico_id?: string | number | null;
  data_agendada?: string;
  horario_agendado?: string;
  duracao_minutos?: string | number;
  horario_fim?: string;
  motivo_revisao?: string;
  observacoes?: string | null;
}

export interface IAtualizacaoAgendamentoBody {
  status?: 'agendado' | 'concluido' | 'cancelado';
  data_agendada?: string;
  horario_agendado?: string;
  duracao_minutos?: string | number;
  horario_fim?: string;
  motivo_revisao?: string;
  observacoes?: string | null;
  motivo_cancelamento?: string;
}

export interface IAlerta24hItem {
  id: number;
  cliente_nome: string;
  cliente_telefone: string;
  telefone_limpo: string;
  whatsapp_url: string | null;
  mensagem_whatsapp: string;
  veiculo_placa: string;
  veiculo_modelo: string;
  data_agendada: string | Date;
  data_formatada: string;
  horario_agendado: string;
  horario_fim?: string | null;
  duracao_minutos: number;
  motivo_revisao: string;
  servico_nome: string;
  status: string;
  confirmacao_presenca: string;
  confirmacao_solicitada_em?: Date | null;
  horas_restantes: number;
  minutos_restantes: number;
}

export class AgendamentoController {
  /**
   * Auto-conclusão de agendamentos com presença confirmada cujo tempo alocado expirou
   */
  public static async autoConcluirAgendamentosVencidos(): Promise<number> {
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

      const idsParaConcluir: number[] = [];

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

  /**
   * GET /agendamentos
   * Lista todos os agendamentos com filtros
   */
  public static async listar(
    req: Request<{}, {}, {}, { data?: string; status?: string; cliente_id?: string; veiculo_id?: string }>,
    res: Response
  ): Promise<void> {
    await AgendamentoController.autoConcluirAgendamentosVencidos();
    const { data, status, cliente_id, veiculo_id } = req.query;
    const whereClause: WhereOptions<AgendamentoAttributes> = {
      ...(data ? { data_agendada: data } : {}),
      ...(status ? { status: status as AgendamentoAttributes['status'] } : {}),
      ...(cliente_id ? { cliente_id: Number(cliente_id) } : {}),
      ...(veiculo_id ? { veiculo_id: Number(veiculo_id) } : {})
    };

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

      res.render('agendamentos/index', {
        titulo: 'Lista de Agendamentos',
        agendamentos,
        clientes,
        veiculos,
        servicos,
        filtros: { data, status, cliente_id, veiculo_id }
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /agendamentos/calendario-tela
   * Exibe visualização mensal/semanal da agenda
   */
  public static async exibirCalendario(
    req: Request<{}, {}, {}, { cliente_id?: string; veiculo_id?: string }>,
    res: Response
  ): Promise<void> {
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

      res.render('agendamentos/calendario', {
        titulo: 'Agenda de Revisões',
        clientes,
        servicos,
        horariosComerciais: HORARIOS_COMERCIAIS,
        opcoesDuracao: OPCOES_DURACAO,
        clientePreSelecionado: cliente_id || null,
        veiculoPreSelecionado: veiculo_id || null
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /agendamentos/calendario
   * API JSON para o FullCalendar
   */
  public static async obterEventosCalendario(
    req: Request<{}, {}, {}, { start?: string; end?: string }>,
    res: Response
  ): Promise<void> {
    const { start, end } = req.query;

    if (!start || !end) {
      res.status(400).json({ erro: 'Parâmetros start e end são obrigatórios.' });
      return;
    }

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

      const eventos = agendamentos.map((a: Agendamento) => {
        let cor = '#0ea5e9';
        if (a.status === 'concluido') cor = '#10b981';

        const servicoNome = a.servico ? a.servico.nome : '';
        const duracaoMin = a.duracao_minutos || 60;
        const horarioFim = a.horario_fim || calcularHorarioFim(a.horario_agendado, duracaoMin);

        const tituloExibicao = servicoNome 
          ? `${a.horario_agendado} às ${horarioFim} - ${a.cliente ? a.cliente.usuario?.nome : 'Cliente'} (${a.veiculo ? a.veiculo.placa : 'Placa'}) - ${servicoNome}`
          : `${a.horario_agendado} às ${horarioFim} - ${a.cliente ? a.cliente.usuario?.nome : 'Cliente'} (${a.veiculo ? a.veiculo.placa : 'Placa'})`;

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
            cliente: a.cliente ? a.cliente.usuario?.nome : 'Cliente',
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

      res.json(eventos);
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /agendamentos/horarios-disponiveis
   * Retorna slots disponíveis respeitando regras de domingo, sábado até 10h/12h, almoço 12-14h e passado
   */
  public static async obterHorariosDisponiveis(
    req: Request<{}, {}, {}, { data?: string; duracao?: string; ignorar_id?: string }>,
    res: Response
  ): Promise<void> {
    await AgendamentoController.autoConcluirAgendamentosVencidos();
    const { data, duracao, ignorar_id } = req.query;

    if (!data) {
      res.status(400).json({ erro: 'Data não informada.' });
      return;
    }

    const duracaoMin = parseInt(String(duracao), 10) || 60;
    const diaSemana = obterDiaDaSemana(data);

    const agora = new Date();
    const hojeStr = agora.toLocaleDateString('en-CA');
    const horaAtualStr = agora.toTimeString().substring(0, 5);

    // 0. Bloqueio de datas passadas
    if (data < hojeStr) {
      const listaPassado: IHorarioSlot[] = HORARIOS_COMERCIAIS.map(h => ({
        horario: h,
        horario_fim: calcularHorarioFim(h, duracaoMin),
        ocupado: true,
        motivo_bloqueio: 'Data no passado (não é possível agendar retroativamente)'
      }));
      res.json(listaPassado);
      return;
    }

    // 1. Domingo fechado
    if (diaSemana === 0) {
      const listaDomingo: IHorarioSlot[] = HORARIOS_COMERCIAIS.map(h => ({
        horario: h,
        horario_fim: calcularHorarioFim(h, duracaoMin),
        ocupado: true,
        motivo_bloqueio: 'Oficina fechada aos domingos'
      }));
      res.json(listaDomingo);
      return;
    }

    try {
      const whereClause: WhereOptions<AgendamentoAttributes> = {
        data_agendada: data,
        status: {
          [Op.ne]: 'cancelado'
        },
        ...(ignorar_id ? { id: { [Op.ne]: Number(ignorar_id) } } : {})
      };

      const agendamentos = await Agendamento.findAll({
        where: whereClause,
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: Veiculo, as: 'veiculo' }
        ]
      });

      const intervalosOcupados = agendamentos.map((a: Agendamento) => {
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

      const listaHorarios: IHorarioSlot[] = HORARIOS_COMERCIAIS.map(h => {
        const minInicio = horaParaMinutos(h);
        const minFim = minInicio + duracaoMin;
        const horarioFimEstimado = minutosParaHora(minFim);

        // Se for hoje, horários já transcorridos bloqueados
        if (data === hojeStr && h <= horaAtualStr) {
          return {
            horario: h,
            horario_fim: horarioFimEstimado,
            ocupado: true,
            motivo_bloqueio: 'Horário já transcorrido hoje (não é possível agendar retroativamente)'
          };
        }

        // Regras de Sábado
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
          // Segunda a Sexta: Fechamento às 18:00
          if (minFim > minFechamentoSemana) {
            return {
              horario: h,
              horario_fim: horarioFimEstimado,
              ocupado: true,
              motivo_bloqueio: `Ultrapassa horário de fechamento (${HORARIO_FECHAMENTO})`
            };
          }
        }

        // Regra de Almoço (12:00 às 14:00)
        if (colideComAlmoco(h, horarioFimEstimado)) {
          return {
            horario: h,
            horario_fim: horarioFimEstimado,
            ocupado: true,
            motivo_bloqueio: `Horário de almoço da oficina (${HORARIO_ALMOCO_INICIO} às ${HORARIO_ALMOCO_FIM})`
          };
        }

        // Conflitos de agenda
        const conflito = intervalosOcupados.find(ocupado =>
          verificarSobreposicao(h, horarioFimEstimado, ocupado.inicio, ocupado.fim)
        );

        if (conflito) {
          return {
            horario: h,
            horario_fim: horarioFimEstimado,
            ocupado: true,
            motivo_bloqueio: `Ocupado: ${conflito.cliente} (${conflito.placa}) das ${conflito.inicio} às ${conflito.fim}`,
            conflito_com: conflito
          };
        }

        return {
          horario: h,
          horario_fim: horarioFimEstimado,
          ocupado: false,
          motivo_bloqueio: undefined
        };
      });

      res.json(listaHorarios);
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * POST /agendamentos
   * Cadastra novo agendamento com validação rígida de horários
   */
  public static async cadastrar(req: Request<{}, {}, ICadastroAgendamentoBody>, res: Response): Promise<void> {
    const { cliente_id, veiculo_id, servico_id, data_agendada, horario_agendado, duracao_minutos, horario_fim, motivo_revisao, observacoes } = req.body;
    const criado_por = req.session.usuario?.id;

    if (!criado_por) {
      res.redirect('/login');
      return;
    }

    if (!cliente_id || !veiculo_id || !data_agendada || !horario_agendado || !motivo_revisao) {
      res.status(400).send('Todos os campos obrigatórios devem ser preenchidos.');
      return;
    }

    if (!HORARIOS_COMERCIAIS.includes(horario_agendado)) {
      res.status(400).send('Horário de início fora do período comercial.');
      return;
    }

    const diaSemana = obterDiaDaSemana(data_agendada);
    if (diaSemana === 0) {
      res.status(400).send('A oficina não abre aos domingos. Por favor, escolha uma data de segunda a sábado.');
      return;
    }

    const agora = new Date();
    const hojeStr = agora.toLocaleDateString('en-CA');
    const horaAtualStr = agora.toTimeString().substring(0, 5);
    if (data_agendada < hojeStr || (data_agendada === hojeStr && horario_agendado < horaAtualStr)) {
      res.status(400).send('Não é possível realizar agendamentos em datas ou horários que já passaram.');
      return;
    }

    const duracaoMin = parseInt(String(duracao_minutos), 10) || 60;
    const fimCalculado = horario_fim || calcularHorarioFim(horario_agendado, duracaoMin);

    if (diaSemana === 6) {
      if (horario_agendado > SABADO_HORARIO_LIMITE_INICIO) {
        res.status(400).send(`Aos sábados, a oficina realiza agendamentos com horário de início somente até as ${SABADO_HORARIO_LIMITE_INICIO}.`);
        return;
      }
      if (horaParaMinutos(fimCalculado) > horaParaMinutos(SABADO_HORARIO_FECHAMENTO)) {
        res.status(400).send(`Aos sábados, a oficina fecha às ${SABADO_HORARIO_FECHAMENTO}. O tempo estimado do serviço ultrapassa o expediente.`);
        return;
      }
    } else {
      if (horaParaMinutos(fimCalculado) > horaParaMinutos(HORARIO_FECHAMENTO)) {
        res.status(400).send(`O bloco de agendamento excede o horário de expediente da oficina (até às ${HORARIO_FECHAMENTO}).`);
        return;
      }
    }

    if (colideComAlmoco(horario_agendado, fimCalculado)) {
      res.status(400).send(`O intervalo das ${HORARIO_ALMOCO_INICIO} às ${HORARIO_ALMOCO_FIM} é reservado para o almoço da oficina. Nenhum agendamento pode coincidir ou sobrepor este período.`);
      return;
    }

    try {
      const agendamentosExistentes = await Agendamento.findAll({
        where: {
          data_agendada,
          status: { [Op.ne]: 'cancelado' }
        },
        include: [{ model: Veiculo, as: 'veiculo' }]
      });

      const conflito = agendamentosExistentes.find((existente: Agendamento) => {
        const exFim = existente.horario_fim || calcularHorarioFim(existente.horario_agendado, existente.duracao_minutos || 60);
        return verificarSobreposicao(horario_agendado, fimCalculado, existente.horario_agendado, exFim);
      });

      if (conflito) {
        const exFim = conflito.horario_fim || calcularHorarioFim(conflito.horario_agendado, conflito.duracao_minutos || 60);
        res.status(400).send(`Conflito de agenda: o veículo ${conflito.veiculo ? conflito.veiculo.placa : ''} já possui agendamento das ${conflito.horario_agendado} às ${exFim}. Escolha outro bloco de horário.`);
        return;
      }

      await Agendamento.create({
        cliente_id: Number(cliente_id),
        veiculo_id: Number(veiculo_id),
        servico_id: servico_id ? parseInt(String(servico_id), 10) : null,
        data_agendada,
        horario_agendado,
        duracao_minutos: duracaoMin,
        horario_fim: fimCalculado,
        motivo_revisao,
        observacoes: observacoes || null,
        criado_por,
        status: 'agendado'
      });

      res.redirect('/agendamentos/calendario-tela?sucesso=Agendamento criado com sucesso!');
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * PUT /agendamentos/:id
   * Atualiza ou cancela agendamento liberando a vaga se cancelado
   */
  public static async atualizar(req: Request<{ id: string }, {}, IAtualizacaoAgendamentoBody>, res: Response): Promise<void> {
    const { id } = req.params;
    const { status, data_agendada, horario_agendado, duracao_minutos, horario_fim, motivo_revisao, observacoes, motivo_cancelamento } = req.body;

    try {
      const agendamento = await Agendamento.findByPk(Number(id));
      if (!agendamento) {
        res.status(404).send('Agendamento não encontrado.');
        return;
      }

      const novaData = data_agendada || String(agendamento.data_agendada);
      const novoInicio = horario_agendado || agendamento.horario_agendado;
      const novaDuracao = duracao_minutos ? parseInt(String(duracao_minutos), 10) : (agendamento.duracao_minutos || 60);
      const novoFim = horario_fim || calcularHorarioFim(novoInicio, novaDuracao);
      const novoStatus = status || agendamento.status;

      if (agendamento.status === 'concluido' && novoStatus !== 'concluido') {
        res.status(400).send('Um agendamento já CONCLUÍDO preserva o histórico de serviços executados e não pode ser cancelado ou revertido.');
        return;
      }

      if (agendamento.status === 'concluido') {
        const mudouData = data_agendada && data_agendada !== String(agendamento.data_agendada);
        const mudouHorario = horario_agendado && horario_agendado !== agendamento.horario_agendado;
        const mudouDuracao = duracao_minutos && parseInt(String(duracao_minutos), 10) !== agendamento.duracao_minutos;

        if (mudouData || mudouHorario || mudouDuracao) {
          res.status(400).send('Este agendamento já foi concluído e seu tempo alocado foi finalizado. Caso o cliente necessite de mais slots de tempo ou novos serviços, realize um novo agendamento de acordo com a disponibilidade da oficina.');
          return;
        }
      }

      if (novoStatus === 'concluido') {
        const agora = new Date();
        const hojeStr = agora.toLocaleDateString('en-CA');
        const horaAtualStr = agora.toTimeString().substring(0, 5);
        const ehFuturo = novaData > hojeStr || (novaData === hojeStr && novoInicio > horaAtualStr);

        if (ehFuturo) {
          res.status(400).send('Não é possível marcar um agendamento futuro como concluído antes da data e horário marcados.');
          return;
        }
      }

      if (novoStatus === 'cancelado') {
        if (!motivo_cancelamento || !motivo_cancelamento.trim()) {
          res.status(400).send('Para cancelar o agendamento, é obrigatório informar o motivo do cancelamento.');
          return;
        }
      }

      if (novoStatus !== 'cancelado') {
        const agora = new Date();
        const hojeStr = agora.toLocaleDateString('en-CA');
        const horaAtualStr = agora.toTimeString().substring(0, 5);

        const ehPassado = novaData < hojeStr || (novaData === hojeStr && novoInicio < horaAtualStr);
        if (ehPassado && (novaData !== String(agendamento.data_agendada) || novoInicio !== agendamento.horario_agendado)) {
          res.status(400).send('Não é possível reagendar para datas ou horários que já passaram.');
          return;
        }

        const diaSemanaNovo = obterDiaDaSemana(novaData);
        if (diaSemanaNovo === 0) {
          res.status(400).send('A oficina não abre aos domingos. Por favor, escolha uma data de segunda a sábado.');
          return;
        }

        if (diaSemanaNovo === 6) {
          if (novoInicio > SABADO_HORARIO_LIMITE_INICIO) {
            res.status(400).send(`Aos sábados, a oficina realiza agendamentos com horário de início somente até as ${SABADO_HORARIO_LIMITE_INICIO}.`);
            return;
          }
          if (horaParaMinutos(novoFim) > horaParaMinutos(SABADO_HORARIO_FECHAMENTO)) {
            res.status(400).send(`Aos sábados, a oficina fecha às ${SABADO_HORARIO_FECHAMENTO}. O tempo estimado do serviço ultrapassa o expediente de sábado.`);
            return;
          }
        } else {
          if (horaParaMinutos(novoFim) > horaParaMinutos(HORARIO_FECHAMENTO)) {
            res.status(400).send(`O bloco de agendamento excede o horário de expediente da oficina (até às ${HORARIO_FECHAMENTO}).`);
            return;
          }
        }

        if (colideComAlmoco(novoInicio, novoFim)) {
          res.status(400).send(`O intervalo das ${HORARIO_ALMOCO_INICIO} às ${HORARIO_ALMOCO_FIM} é reservado para o almoço da oficina. Nenhum agendamento pode coincidir ou sobrepor este período.`);
          return;
        }

        const agendamentosExistentes = await Agendamento.findAll({
          where: {
            id: { [Op.ne]: Number(id) },
            data_agendada: novaData,
            status: { [Op.ne]: 'cancelado' }
          },
          include: [{ model: Veiculo, as: 'veiculo' }]
        });

        const conflito = agendamentosExistentes.find((existente: Agendamento) => {
          const exFim = existente.horario_fim || calcularHorarioFim(existente.horario_agendado, existente.duracao_minutos || 60);
          return verificarSobreposicao(novoInicio, novoFim, existente.horario_agendado, exFim);
        });

        if (conflito) {
          const exFim = conflito.horario_fim || calcularHorarioFim(conflito.horario_agendado, conflito.duracao_minutos || 60);
          res.status(400).send(`Não é possível reagendar: conflito com o veículo ${conflito.veiculo ? conflito.veiculo.placa : ''} das ${conflito.horario_agendado} às ${exFim}.`);
          return;
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
        motivo_cancelamento: novoStatus === 'cancelado' ? motivo_cancelamento!.trim() : (novoStatus === 'agendado' ? null : agendamento.motivo_cancelamento),
        confirmacao_adiada_ate: novoStatus === 'cancelado' ? null : agendamento.confirmacao_adiada_ate
      });

      res.status(200).send('Agendamento atualizado com sucesso!');
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * Helper estático: Carrega a fila ordenada de agendamentos em janela de 24h
   */
  public static async carregarAlertas24h(): Promise<IAlerta24hItem[]> {
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

    const filaAlertas: IAlerta24hItem[] = [];

    for (const a of agendamentos) {
      // Garantia estrita: nunca processa agendamento cancelado ou concluído
      if (a.status !== 'agendado') continue;

      const [ano, mes, dia] = String(a.data_agendada).split('-').map(Number);
      const [hora, min] = a.horario_agendado.split(':').map(Number);
      const inicio = new Date(ano, mes - 1, dia, hora, min, 0);
      const diffMs = inicio.getTime() - agora.getTime();

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
          cliente_telefone: a.cliente?.telefone_whatsapp || '',
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
          status: a.status,
          confirmacao_presenca: a.confirmacao_presenca || 'pendente',
          confirmacao_solicitada_em: a.confirmacao_solicitada_em,
          horas_restantes: horasRestantes,
          minutos_restantes: minutosRestantes
        });
      }
    }

    return filaAlertas;
  }

  /**
   * GET /agendamentos/alertas-24h
   */
  public static async obterAlertas24h(req: Request, res: Response): Promise<void> {
    try {
      const alertas = await AgendamentoController.carregarAlertas24h();
      res.json(alertas);
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * POST /agendamentos/:id/solicitar-confirmacao
   */
  public static async solicitarConfirmacao(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const agendamento = await Agendamento.findByPk(Number(id), {
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: Veiculo, as: 'veiculo', include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }] }
        ]
      });

      if (!agendamento) {
        res.status(404).json({ erro: 'Agendamento não encontrado.' });
        return;
      }

      if (agendamento.status !== 'agendado') {
        res.status(400).json({ erro: 'Não é possível solicitar confirmação de presença para agendamento cancelado ou concluído.' });
        return;
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

      res.json({
        sucesso: true,
        mensagem: 'Confirmação solicitada via WhatsApp! O lembrete retornará em 60 minutos caso a presença não seja confirmada.',
        whatsapp_url: telefoneLimpo ? `https://wa.me/${telefoneLimpo}?text=${encodeURIComponent(msgWhats)}` : null
      });

    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * POST /agendamentos/:id/adiar-confirmacao
   */
  public static async adiarConfirmacao(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const agendamento = await Agendamento.findByPk(Number(id));
      if (!agendamento) {
        res.status(404).json({ erro: 'Agendamento não encontrado.' });
        return;
      }

      if (agendamento.status !== 'agendado') {
        res.status(400).json({ erro: 'Não é possível adiar notificação de agendamento cancelado ou concluído.' });
        return;
      }

      const em60Min = new Date(Date.now() + 60 * 60 * 1000);

      await agendamento.update({
        confirmacao_adiada_ate: em60Min
      });

      res.json({
        sucesso: true,
        mensagem: 'Alerta adiado por 60 minutos com sucesso.'
      });

    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * POST /agendamentos/:id/confirmar-presenca
   */
  public static async confirmarPresenca(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const agendamento = await Agendamento.findByPk(Number(id), {
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: Veiculo, as: 'veiculo', include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }] }
        ]
      });
      if (!agendamento) {
        res.status(404).json({ erro: 'Agendamento não encontrado.' });
        return;
      }

      if (agendamento.status !== 'agendado') {
        res.status(400).json({ erro: 'Não é possível confirmar presença para agendamento cancelado ou concluído.' });
        return;
      }

      const agora = new Date();
      const hojeStr = agora.toLocaleDateString('en-CA');
      const horaAtualStr = agora.toTimeString().substring(0, 5);
      const fim = agendamento.horario_fim || calcularHorarioFim(agendamento.horario_agendado, agendamento.duracao_minutos || 60);
      const jaPassou = String(agendamento.data_agendada) < hojeStr || (String(agendamento.data_agendada) === hojeStr && fim <= horaAtualStr);

      const dadosAtualizacao: Partial<AgendamentoAttributes> = {
        confirmacao_presenca: 'confirmada',
        confirmado_em: agora,
        confirmacao_adiada_ate: null
      };

      if (jaPassou && agendamento.status === 'agendado') {
        dadosAtualizacao.status = 'concluido';
      }

      await agendamento.update(dadosAtualizacao);

      // Gerar notificação no painel
      const [anoStr, mesStr, diaStr] = String(agendamento.data_agendada).split('-');
      const dataFormatada = `${diaStr}/${mesStr}/${anoStr}`;
      const nomeCliente = agendamento.cliente && agendamento.cliente.usuario ? agendamento.cliente.usuario.nome : 'Cliente';
      const placaVeiculo = agendamento.veiculo ? agendamento.veiculo.placa : '';
      const modeloVeiculo = agendamento.veiculo && agendamento.veiculo.modelo ? `${agendamento.veiculo.modelo.marca ? agendamento.veiculo.modelo.marca.nome + ' ' : ''}${agendamento.veiculo.modelo.nome}` : 'Veículo';

      await Notificacao.create({
        tipo: 'lembrete_agendamento',
        mensagem: `Agendamento de revisão confirmado para o veículo ${modeloVeiculo} (${placaVeiculo}) do cliente ${nomeCliente} no dia ${dataFormatada} às ${agendamento.horario_agendado}.`,
        lida: false,
        usuario_id: agendamento.criado_por || 1
      });

      const mensagemRetorno = dadosAtualizacao.status === 'concluido'
        ? 'Presença confirmada e agendamento concluído automaticamente, pois o tempo alocado já foi finalizado.'
        : 'Presença confirmada com sucesso! Baixa registrada no sistema.';

      res.json({
        sucesso: true,
        mensagem: mensagemRetorno,
        statusAtual: dadosAtualizacao.status || agendamento.status
      });

    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }
}

export default AgendamentoController;

// Compatibilidade CommonJS
module.exports = AgendamentoController;
