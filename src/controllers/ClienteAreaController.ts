import { Request, Response } from 'express';
import { 
  sequelize, 
  Veiculo, 
  Cliente, 
  Usuario, 
  ModeloVeiculo, 
  MarcaVeiculo, 
  RegistroTroca, 
  Peca, 
  MarcaPeca, 
  Agendamento, 
  Notificacao, 
  LogLgpd 
} from '../../models';
import { calcularStatusAlerta } from '../utils/alertas';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AgendamentoController = require('./AgendamentoController');

export interface ISolicitarManutencaoBody {
  veiculo_id?: string | number;
  motivo?: string;
}

export class ClienteAreaController {
  /**
   * GET /cliente/veiculos
   * Lista veículos e agendamentos do cliente autenticado
   */
  public static async listarVeiculosCliente(req: Request, res: Response): Promise<void> {
    const usuarioLogado = req.session.usuario;
    if (!usuarioLogado || !usuarioLogado.clienteId) {
      res.redirect('/login');
      return;
    }
    const clienteId = usuarioLogado.clienteId;

    try {
      if (typeof AgendamentoController.autoConcluirAgendamentosVencidos === 'function') {
        await AgendamentoController.autoConcluirAgendamentosVencidos();
      }

      const cliente = await Cliente.findByPk(clienteId, {
        include: [{ model: Usuario, as: 'usuario' }]
      });

      if (!cliente) {
        res.status(404).send('Cadastro de cliente não localizado.');
        return;
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
        const ultimasTrocas: Record<number, RegistroTroca> = {};
        trocas.forEach((t: RegistroTroca) => {
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

      res.render('cliente/veiculos', {
        titulo: 'Meus Veículos e Agendamentos',
        cliente,
        veiculosComAlertas,
        agendamentos,
        sucesso: req.query.sucesso || null,
        erro: req.query.erro || null
      });

    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /cliente/veiculo/:id
   * Exibe detalhes de um veículo do cliente
   */
  public static async exibirDetalhesVeiculo(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    const usuarioLogado = req.session.usuario;
    if (!usuarioLogado || !usuarioLogado.clienteId) {
      res.redirect('/login');
      return;
    }
    const clienteId = usuarioLogado.clienteId;

    try {
      const veiculo = await Veiculo.findOne({
        where: { id: Number(id), cliente_id: clienteId },
        include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
      });

      if (!veiculo) {
        res.status(403).send('Acesso não autorizado a este veículo.');
        return;
      }

      const historicoTrocas = await RegistroTroca.findAll({
        where: { veiculo_id: Number(id) },
        include: [{ model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] }],
        order: [['data_troca', 'DESC'], ['id', 'DESC']]
      });

      const ultimasTrocas: Record<number, RegistroTroca> = {};
      historicoTrocas.forEach((t: RegistroTroca) => {
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

      res.render('cliente/detalhes_veiculo', {
        titulo: `Veículo Placa: ${veiculo.placa}`,
        veiculo,
        historicoTrocas,
        alertasPecas
      });

    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * POST /cliente/solicitar-manutencao
   * Permite ao cliente solicitar agendamento ou manutenção
   */
  public static async solicitarManutencao(req: Request<{}, {}, ISolicitarManutencaoBody>, res: Response): Promise<void> {
    const usuarioLogado = req.session.usuario;
    if (!usuarioLogado || !usuarioLogado.clienteId) {
      res.redirect('/login');
      return;
    }
    const clienteId = usuarioLogado.clienteId;
    const { veiculo_id, motivo } = req.body;

    if (!veiculo_id || !motivo) {
      res.redirect('/cliente/veiculos?erro=Selecione o veículo e informe o motivo.');
      return;
    }

    try {
      const veiculo = await Veiculo.findOne({
        where: { id: Number(veiculo_id), cliente_id: clienteId },
        include: [{ model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] }]
      });

      if (!veiculo) {
        res.status(403).send('Veículo não pertence ao cliente.');
        return;
      }

      if (!veiculo.cliente?.ativo) {
        res.redirect('/cliente/veiculos?erro=Seu cadastro de cliente encontra-se inativo no sistema. Entre em contato com a oficina para atendimento.');
        return;
      }

      if (!veiculo.ativo) {
        res.redirect(`/cliente/veiculos?erro=O veículo ${veiculo.placa} encontra-se inativo no sistema e não pode receber novas solicitações.`);
        return;
      }

      const funcionarios = await Usuario.findAll({
        where: {
          papel: ['admin', 'gerente', 'atendente']
        }
      });

      const nomeCliente = veiculo.cliente?.usuario?.nome || 'Cliente';
      const mensagem = `O cliente ${nomeCliente} solicitou revisão/manutenção para o veículo ${veiculo.placa} (${veiculo.modelo_id ? veiculo.modelo_id : 'Não Informado'}). Motivo: "${motivo}"`;

      const notificacoesToCreate = funcionarios.map(func => ({
        tipo: 'solicitacao_cliente' as const,
        mensagem,
        lida: false,
        usuario_id: func.id
      }));

      await Notificacao.bulkCreate(notificacoesToCreate);

      res.redirect('/cliente/veiculos?sucesso=Sua solicitação de manutenção foi enviada com sucesso! A oficina entrará em contato.');

    } catch (error) {
      console.error('Erro ao solicitar manutenção:', error);
      if (isDatabaseConnectionError(error)) {
        tratarErroRequisicao(error, req, res);
        return;
      }
      res.redirect('/cliente/veiculos?erro=Erro ao processar solicitação.');
    }
  }

  /**
   * POST /cliente/revogar-consentimento (LGPD - RF-32)
   */
  public static async revogarConsentimento(req: Request, res: Response): Promise<void> {
    const usuarioLogado = req.session.usuario;
    if (!usuarioLogado || !usuarioLogado.clienteId) {
      res.redirect('/login');
      return;
    }
    const clienteId = usuarioLogado.clienteId;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Desconhecido';

    const t = await sequelize.transaction();

    try {
      const cliente = await Cliente.findByPk(clienteId, { transaction: t });
      if (!cliente) {
        await t.rollback();
        res.status(404).send('Cliente não localizado.');
        return;
      }

      await cliente.update({
        consentimento_lgpd: false,
        data_consentimento_lgpd: null
      }, { transaction: t });

      await LogLgpd.create({
        cliente_id: clienteId,
        consentimento_dado: false,
        ip_origem: ip,
        user_agent: userAgent
      }, { transaction: t });

      const funcionarios = await Usuario.findAll({ where: { papel: ['admin', 'gerente', 'atendente'] } });
      const mensagemNotificacao = `ALERTA LGPD: O cliente de ID ${clienteId} revogou o consentimento de dados. Seu cadastro foi inativado para novos contatos comerciais.`;
      
      const notificacoesToCreate = funcionarios.map(func => ({
        tipo: 'solicitacao_cliente' as const,
        mensagem: mensagemNotificacao,
        lida: false,
        usuario_id: func.id
      }));
      await Notificacao.bulkCreate(notificacoesToCreate, { transaction: t });

      await t.commit();

      res.redirect('/cliente/veiculos?sucesso=Você revogou seu consentimento LGPD. Seus dados históricos serão mantidos, mas novos contatos estão bloqueados.');

    } catch (error) {
      await t.rollback();
      console.error('Erro ao revogar consentimento LGPD:', error);
      if (isDatabaseConnectionError(error)) {
        tratarErroRequisicao(error, req, res);
        return;
      }
      res.redirect('/cliente/veiculos?erro=Erro ao processar revogação.');
    }
  }

  /**
   * POST /cliente/dar-consentimento (Para reativar)
   */
  public static async darConsentimento(req: Request, res: Response): Promise<void> {
    const usuarioLogado = req.session.usuario;
    if (!usuarioLogado || !usuarioLogado.clienteId) {
      res.redirect('/login');
      return;
    }
    const clienteId = usuarioLogado.clienteId;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Desconhecido';

    const t = await sequelize.transaction();

    try {
      const cliente = await Cliente.findByPk(clienteId, { transaction: t });
      if (cliente) {
        await cliente.update({
          consentimento_lgpd: true,
          data_consentimento_lgpd: new Date()
        }, { transaction: t });
      }

      await LogLgpd.create({
        cliente_id: clienteId,
        consentimento_dado: true,
        ip_origem: ip,
        user_agent: userAgent
      }, { transaction: t });

      await t.commit();
      res.redirect('/cliente/veiculos?sucesso=Consentimento LGPD concedido com sucesso!');
    } catch (error) {
      await t.rollback();
      console.error('Erro ao dar consentimento LGPD:', error);
      if (isDatabaseConnectionError(error)) {
        tratarErroRequisicao(error, req, res);
        return;
      }
      res.redirect('/cliente/veiculos?erro=Erro ao processar consentimento.');
    }
  }
}

export default ClienteAreaController;

// Compatibilidade CommonJS
module.exports = ClienteAreaController;
