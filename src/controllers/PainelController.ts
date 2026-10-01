import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Veiculo, 
  RegistroTroca, 
  Agendamento, 
  Cliente, 
  Usuario, 
  Peca, 
  ModeloVeiculo, 
  MarcaVeiculo,
  Notificacao
} from '../../models';
import { calcularStatusAlerta } from '../utils/alertas';
import { IResultadoAlerta } from '../types';
import AgendamentoController, { IAlerta24hItem } from './AgendamentoController';
import { tratarErroRequisicao } from '../utils/erros';

export interface IItemAtrasado {
  peca?: Peca | null;
  troca: RegistroTroca;
  statusAlerta: IResultadoAlerta;
  kmExcedido: number;
}

export interface IProximaTrocaPainel {
  troca: RegistroTroca;
  veiculo: Veiculo;
  peca?: Peca | null;
  data_prevista: string | Date;
  statusAlerta: IResultadoAlerta;
}

export interface IVeiculoAtrasadoPainel {
  id: number;
  placa: string;
  km_atual: number;
  cliente_id: number;
  cliente?: Cliente | null;
  modelo?: ModeloVeiculo | null;
  itensAtrasados: IItemAtrasado[];
  telefone_whatsapp?: string | null;
  telefone_limpo: string;
  whatsapp_url: string | null;
  whatsapp_mensagem: string;
}

export class PainelController {
  /**
   * GET /painel
   * Renderiza a visão geral / dashboard da oficina AUTEC
   */
  public static async exibirPainel(req: Request, res: Response): Promise<void> {
    const usuarioLogado = req.session.usuario;

    if (!usuarioLogado) {
      res.redirect('/login');
      return;
    }

    // Se o usuário logado for cliente, redireciona para a área do cliente
    if (usuarioLogado.papel === 'cliente') {
      res.redirect('/cliente/veiculos');
      return;
    }

    try {
      // Auto-concluir agendamentos confirmados vencidos
      if (typeof AgendamentoController.autoConcluirAgendamentosVencidos === 'function') {
        await AgendamentoController.autoConcluirAgendamentosVencidos();
      }

      // 1. Agendamentos de hoje (ignora cancelados para liberar a data/horário)
      const hojeStr = new Date().toLocaleDateString('en-CA');
      const agendamentosHoje = await Agendamento.findAll({
        where: { 
          data_agendada: hojeStr,
          status: { [Op.ne]: 'cancelado' }
        },
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
      inicioMes.setHours(0, 0, 0, 0);
      
      const fimMes = new Date();
      fimMes.setMonth(fimMes.getMonth() + 1);
      fimMes.setDate(0);
      fimMes.setHours(23, 59, 59, 999);

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
      const ultimasTrocas: Record<number, Record<number, RegistroTroca>> = {};
      todasTrocas.forEach((troca: RegistroTroca) => {
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
      const veiculosAtrasados: IVeiculoAtrasadoPainel[] = [];
      const proximasTrocas7Dias: IProximaTrocaPainel[] = [];
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const em7Dias = new Date();
      em7Dias.setDate(hoje.getDate() + 7);
      em7Dias.setHours(23, 59, 59, 999);

      for (const veiculoIdStr in ultimasTrocas) {
        const veiculoId = Number(veiculoIdStr);
        let veiculoAtrasado = false;
        let veiculoInfo: Veiculo | null = null;
        const itensAtrasados: IItemAtrasado[] = [];

        for (const pecaIdStr in ultimasTrocas[veiculoId]) {
          const pecaId = Number(pecaIdStr);
          const troca = ultimasTrocas[veiculoId][pecaId];
          veiculoInfo = troca.veiculo || null;
          if (!veiculoInfo) continue;
          const statusAlerta = calcularStatusAlerta(troca, veiculoInfo.km_atual);

          if (statusAlerta.status === 'vencido') {
            veiculoAtrasado = true;
            const kmPrevisto = troca.km_previsto_proximo;
            const kmExcedido = (kmPrevisto && veiculoInfo.km_atual > kmPrevisto) ? (veiculoInfo.km_atual - kmPrevisto) : 0;
            itensAtrasados.push({
              peca: troca.peca,
              troca,
              statusAlerta,
              kmExcedido
            });
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
          const nomeCliente = veiculoInfo.cliente?.usuario?.nome || 'Cliente';
          const placaFormatada = veiculoInfo.placa;
          const modeloStr = veiculoInfo.modelo ? `${veiculoInfo.modelo.marca ? veiculoInfo.modelo.marca.nome + ' ' : ''}${veiculoInfo.modelo.nome}` : 'Veículo';
          const kmFormatado = Number(veiculoInfo.km_atual).toLocaleString('pt-BR');
          const listaPecas = itensAtrasados.map(i => i.peca ? i.peca.nome : '').filter(Boolean).join(', ');

          const msgWhats = `Olá ${nomeCliente}, tudo bem? Aqui é da oficina AUTEC.\n\nNotamos que o seu veículo ${modeloStr} (Placa ${placaFormatada}) atingiu ${kmFormatado} km e está com a manutenção preventiva de: *${listaPecas}* com a quilometragem ou período estipulado ultrapassado.\n\nA realização desta manutenção é essencial para a conservação e segurança do veículo. Gostaríamos de convidá-lo a agendar uma revisão conosco. Qual o melhor dia e horário para você? Estamos à disposição!`;

          let telWhats = veiculoInfo.cliente?.telefone_whatsapp ? String(veiculoInfo.cliente.telefone_whatsapp).replace(/\D/g, '') : '';
          if (telWhats.length === 10 || telWhats.length === 11) {
            telWhats = '55' + telWhats;
          }

          veiculosAtrasados.push({
            id: veiculoInfo.id,
            placa: veiculoInfo.placa,
            km_atual: veiculoInfo.km_atual,
            cliente_id: veiculoInfo.cliente_id,
            cliente: veiculoInfo.cliente,
            modelo: veiculoInfo.modelo,
            itensAtrasados,
            telefone_whatsapp: veiculoInfo.cliente?.telefone_whatsapp,
            telefone_limpo: telWhats,
            whatsapp_url: telWhats ? `https://wa.me/${telWhats}?text=${encodeURIComponent(msgWhats)}` : null,
            whatsapp_mensagem: msgWhats
          });
        }
      }

      // 4. Notificações não lidas
      const notificacoes = await Notificacao.findAll({
        where: { lida: false },
        order: [['criado_em', 'DESC']],
        limit: 5
      });

      // 5. Alertas de Agendamentos em Janela de 24 Horas
      let alertas24h: IAlerta24hItem[] = [];
      try {
        if (typeof AgendamentoController.carregarAlertas24h === 'function') {
          alertas24h = await AgendamentoController.carregarAlertas24h();
        }
      } catch (errAlertas) {
        console.error('Erro ao carregar alertas 24h para o painel:', errAlertas);
      }

      // Renderizar o painel com os dados coletados
      res.render('painel/index', {
        titulo: 'Painel da Oficina',
        agendamentosHoje,
        totalTrocasMes,
        totalVeiculosAtrasados: veiculosAtrasados.length,
        veiculosAtrasados: veiculosAtrasados.slice(0, 5),
        proximasTrocas7Dias: proximasTrocas7Dias.slice(0, 5),
        notificacoes,
        alertas24h
      });

    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }
}

export default PainelController;

// Compatibilidade CommonJS
module.exports = PainelController;
