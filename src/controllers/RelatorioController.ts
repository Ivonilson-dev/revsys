import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { 
  Veiculo, 
  RegistroTroca, 
  Peca, 
  MarcaPeca, 
  Cliente, 
  Usuario, 
  ModeloVeiculo, 
  MarcaVeiculo, 
  Agendamento, 
  Oficina, 
  Servico 
} from '../../models';
import { AgendamentoAttributes } from '../../models/Agendamento';
import { calcularStatusAlerta } from '../utils/alertas';
import { IResultadoAlerta } from '../types';
import AgendamentoController from './AgendamentoController';
import { tratarErroRequisicao } from '../utils/erros';

export interface IItemRelatorioVencido {
  veiculo: Veiculo;
  peca?: Peca;
  troca: RegistroTroca;
  alerta: IResultadoAlerta;
  whatsapp_url: string | null;
}

export interface IItemRelatorioProximo {
  veiculo: Veiculo;
  peca?: Peca;
  troca: RegistroTroca;
  alerta: IResultadoAlerta;
}

export class RelatorioController {
  /**
   * GET /relatorios
   * Exibe o menu principal de relatórios
   */
  public static async exibirMenu(req: Request, res: Response): Promise<void> {
    try {
      const pecas = await Peca.findAll({ order: [['nome', 'ASC']] });
      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [[{ model: Usuario, as: 'usuario' }, 'nome', 'ASC']]
      });

      res.render('relatorios/index', {
        titulo: 'Relatórios do Sistema',
        pecas,
        clientes
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /relatorios/peca
   * Relatório de trocas filtrado por peça
   */
  public static async relatorioPeca(req: Request<{}, {}, {}, { peca_id?: string }>, res: Response): Promise<void> {
    const { peca_id } = req.query;

    if (!peca_id) {
      res.redirect('/relatorios');
      return;
    }

    try {
      const peca = await Peca.findByPk(Number(peca_id), { include: [{ model: MarcaPeca, as: 'marca' }] });
      if (!peca) {
        res.status(404).send('Peça não encontrada.');
        return;
      }

      const trocas = await RegistroTroca.findAll({
        where: { peca_id: Number(peca_id) },
        include: [
          { 
            model: Veiculo, 
            as: 'veiculo', 
            include: [
              { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] }, 
              { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }
            ] 
          }
        ],
        order: [['data_troca', 'DESC']]
      });

      res.render('relatorios/peca', {
        titulo: `Relatório da Peça: ${peca.nome} (${peca.marca ? peca.marca.nome : ''})`,
        peca,
        trocas
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /relatorios/cliente
   * Relatório de manutenções e veículos de um cliente
   */
  public static async relatorioCliente(req: Request<{}, {}, {}, { cliente_id?: string }>, res: Response): Promise<void> {
    const { cliente_id } = req.query;

    if (!cliente_id) {
      res.redirect('/relatorios');
      return;
    }

    try {
      const cliente = await Cliente.findByPk(Number(cliente_id), {
        include: [{ model: Usuario, as: 'usuario' }]
      });
      if (!cliente) {
        res.status(404).send('Cliente não encontrado.');
        return;
      }

      const veiculos = await Veiculo.findAll({
        where: { cliente_id: Number(cliente_id) },
        include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
      });

      const veiculosComStatus = [];

      for (const veiculo of veiculos) {
        const trocas = await RegistroTroca.findAll({
          where: { veiculo_id: veiculo.id },
          include: [{ model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }],
          order: [['data_troca', 'DESC']]
        });

        const ultimasTrocas: Record<number, RegistroTroca> = {};
        trocas.forEach((t: RegistroTroca) => {
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

      res.render('relatorios/cliente', {
        titulo: `Relatório do Cliente: ${cliente.usuario?.nome || 'Cliente'}`,
        cliente,
        veiculosComStatus
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /relatorios/vencidos
   * Relatório de veículos com manutenções vencidas e botão de contato WhatsApp AUTEC
   */
  public static async relatorioVencidos(req: Request, res: Response): Promise<void> {
    try {
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
          { model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }
        ],
        order: [['data_troca', 'DESC']]
      });

      const ultimasTrocas: Record<string, RegistroTroca> = {};
      todasTrocas.forEach((t: RegistroTroca) => {
        if (!t.veiculo) return;
        const key = `${t.veiculo_id}_${t.peca_id}`;
        if (!ultimasTrocas[key]) {
          ultimasTrocas[key] = t;
        }
      });

      const itensVencidos: IItemRelatorioVencido[] = [];

      for (const key in ultimasTrocas) {
        const troca = ultimasTrocas[key];
        const veiculo = troca.veiculo;
        if (!veiculo) continue;
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

      res.render('relatorios/vencidos', {
        titulo: 'Relatório de Manutenções Vencidas',
        itensVencidos
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /relatorios/proximos
   * Relatório de manutenções próximas ao vencimento
   */
  public static async relatorioProximos(req: Request, res: Response): Promise<void> {
    try {
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
          { model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }
        ],
        order: [['data_troca', 'DESC']]
      });

      const ultimasTrocas: Record<string, RegistroTroca> = {};
      todasTrocas.forEach((t: RegistroTroca) => {
        if (!t.veiculo) return;
        const key = `${t.veiculo_id}_${t.peca_id}`;
        if (!ultimasTrocas[key]) {
          ultimasTrocas[key] = t;
        }
      });

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const em7Dias = new Date();
      em7Dias.setDate(hoje.getDate() + 7);
      em7Dias.setHours(23, 59, 59, 999);

      const itensProximos: IItemRelatorioProximo[] = [];

      for (const key in ultimasTrocas) {
        const troca = ultimasTrocas[key];
        const veiculo = troca.veiculo;
        if (!veiculo) continue;
        const statusAlerta = calcularStatusAlerta(troca, veiculo.km_atual);

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
        } else if (statusAlerta.status === 'proximo') {
          itensProximos.push({
            veiculo,
            peca: troca.peca,
            troca,
            alerta: statusAlerta
          });
        }
      }

      res.render('relatorios/proximos', {
        titulo: 'Próximas Trocas (7 dias ou iminente)',
        itensProximos
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /relatorios/agendamentos
   * Relatório de agendamentos por dia ou mês
   */
  public static async relatorioAgendamentos(req: Request<{}, {}, {}, { tipo?: string }>, res: Response): Promise<void> {
    const { tipo } = req.query;
    const hojeStr = new Date().toLocaleDateString('en-CA');
    
    let whereClause: WhereOptions<AgendamentoAttributes> = {};
    let subTitulo = 'Agendamentos';

    try {
      if (typeof AgendamentoController.autoConcluirAgendamentosVencidos === 'function') {
        await AgendamentoController.autoConcluirAgendamentosVencidos();
      }

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

      res.render('relatorios/agendamentos', {
        titulo: subTitulo,
        agendamentos,
        tipo: tipo || 'dia'
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /relatorios/trocas-mes
   * Relatório mensal de serviços e trocas realizadas
   */
  public static async relatorioTrocasMes(req: Request<{}, {}, {}, { ano?: string; mes?: string }>, res: Response): Promise<void> {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    const ano = req.query.ano ? parseInt(req.query.ano, 10) : anoAtual;
    const mes = req.query.mes ? parseInt(req.query.mes, 10) : mesAtual;

    const fimMesObj = new Date(ano, mes, 0);

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

      const totalTrocas = trocas.length;
      const veiculosSet = new Set<number>();
      trocas.forEach((t: RegistroTroca) => {
        if (t.veiculo_id) veiculosSet.add(t.veiculo_id);
      });
      const totalVeiculosAtendidos = veiculosSet.size;

      const contagemPecas: Record<string, number> = {};
      trocas.forEach((t: RegistroTroca) => {
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

      res.render('relatorios/trocas-mes', {
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
      tratarErroRequisicao(error, req, res);
    }
  }
}

export default RelatorioController;

// Compatibilidade CommonJS
module.exports = RelatorioController;
