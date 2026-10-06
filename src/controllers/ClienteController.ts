import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  sequelize, 
  Cliente, 
  Usuario, 
  Veiculo, 
  LogLgpd, 
  ModeloVeiculo, 
  MarcaVeiculo, 
  Agendamento 
} from '../../models';
import { TipoAcaoAuditoria } from '../../models/LogAuditoria';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cpf } = require('cpf-cnpj-validator');
import crypto from 'crypto';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';
import AuditoriaService from '../services/AuditoriaService';

export interface ICadastroClienteBody {
  nome?: string;
  email?: string;
  telefone?: string;
  cpfInput?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone_whatsapp?: string;
  consentimento_lgpd?: string | boolean;
}

export interface IEdicaoClienteBody {
  nome?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone_whatsapp?: string;
  ativo?: string | boolean;
  motivo_inativacao_opcao?: string;
  motivo_inativacao_outro?: string;
}

export class ClienteController {
  /**
   * GET /clientes
   * Lista todos os clientes cadastrados
   */
  public static async listar(req: Request, res: Response): Promise<void> {
    try {
      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [['criado_em', 'DESC']]
      });

      res.render('clientes/index', {
        titulo: 'Gerenciamento de Clientes',
        clientes,
        erro: req.query.erro || null,
        sucessoMsg: req.query.sucesso || null
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /clientes/novo
   * Exibe formulário de cadastro de cliente
   */
  public static async exibirCadastro(req: Request, res: Response): Promise<void> {
    res.render('clientes/novo', {
      titulo: 'Cadastrar Novo Cliente',
      erro: null,
      dados: {}
    });
  }

  /**
   * POST /clientes
   * Cadastra um novo cliente com usuário e registro LGPD em transação
   */
  public static async cadastrar(req: Request<{}, {}, ICadastroClienteBody>, res: Response): Promise<void> {
    const { 
      nome, email, telefone, cpfInput, 
      logradouro, numero, bairro, cidade, estado, cep,
      telefone_whatsapp, consentimento_lgpd 
    } = req.body;

    const dadosForm = { 
      nome, email, telefone, cpfInput, 
      logradouro, numero, bairro, cidade, estado, cep, 
      telefone_whatsapp 
    };

    // Validações básicas
    if (!nome || !email || !cpfInput || !consentimento_lgpd) {
      console.warn('[Cadastro Cliente] Validação falhou: Campos obrigatórios incompletos ou termo LGPD não aceito.', { nome, email, cpfInput, consentimento_lgpd });
      res.status(422).render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: 'Por favor, preencha todos os campos obrigatórios e marque o termo de consentimento LGPD.',
        dados: dadosForm
      });
      return;
    }

    // Validação de CPF (dígitos verificadores oficiais da Receita Federal)
    const cpfLimpo = cpfInput.replace(/\D/g, '');
    if (!cpf.isValid(cpfLimpo)) {
      console.warn(`[Cadastro Cliente] CPF inválido informado: ${cpfInput} (limpo: ${cpfLimpo})`);
      res.status(422).render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: 'O CPF informado é inválido pelo algoritmo oficial da Receita Federal. Certifique-se de digitar um CPF com dígitos verificadores válidos.',
        dados: dadosForm
      });
      return;
    }

    const t = await sequelize.transaction();

    try {
      // 1. Verificar se e-mail de usuário já existe
      const usuarioExistente = await Usuario.findOne({ where: { email }, transaction: t });
      if (usuarioExistente) {
        await t.rollback();
        console.warn(`[Cadastro Cliente] E-mail já cadastrado: ${email}`);
        res.status(422).render('clientes/novo', {
          titulo: 'Cadastrar Novo Cliente',
          erro: 'Este endereço de e-mail já está cadastrado no sistema.',
          dados: dadosForm
        });
        return;
      }

      // 2. Verificar se CPF já existe via blind index (cpf_hash)
      const cpfHash = crypto.createHash('sha256').update(cpfLimpo).digest('hex');
      const clienteExistente = await Cliente.findOne({ where: { cpf_hash: cpfHash }, transaction: t });
      if (clienteExistente) {
        await t.rollback();
        console.warn(`[Cadastro Cliente] CPF já cadastrado (hash: ${cpfHash})`);
        res.status(422).render('clientes/novo', {
          titulo: 'Cadastrar Novo Cliente',
          erro: 'Este CPF já está cadastrado no sistema.',
          dados: dadosForm
        });
        return;
      }

      // 3. Gerar senha provisória
      const senhaProvisoria = 'RevSys' + cpfLimpo.substring(0, 6);

      // 4. Criar o Usuário com papel 'cliente' e nível de acesso correspondente (id: 5 = cliente)
      const novoUsuario = await Usuario.create({
        nome,
        email,
        senha_hash: senhaProvisoria,
        papel: 'cliente',
        nivel_acesso_id: 5,
        telefone: telefone || null
      }, { transaction: t });

      // 5. Criar o Cliente com dados criptografados e blind index explícito
      const novoCliente = await Cliente.create({
        usuario_id: novoUsuario.id,
        cpf: cpfLimpo,
        cpf_hash: cpfHash,
        logradouro: logradouro || null,
        numero: numero || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        cep: cep || null,
        telefone_whatsapp: telefone_whatsapp || telefone || null,
        consentimento_lgpd: true,
        data_consentimento_lgpd: new Date()
      }, { transaction: t });

      // 6. Registrar o Log de Consentimento LGPD
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = (req.headers['user-agent'] as string) || 'Desconhecido';
      
      await LogLgpd.create({
        cliente_id: novoCliente.id,
        consentimento_dado: true,
        ip_origem: ip,
        user_agent: userAgent
      }, { transaction: t });

      await t.commit();
      console.log(`[Cadastro Cliente] Sucesso! Cliente criado ID: ${novoCliente.id}, Usuário ID: ${novoUsuario.id}`);

      // Registro de Auditoria
      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'Clientes',
        registro_id: novoCliente.id,
        descricao: `Cadastrou o novo cliente ${nome} (${email}).`,
        dados_novos: { nome, email, telefone, logradouro, numero, bairro, cidade, estado, cep }
      });

      try {
        console.log(`[E-mail enviado para ${email}] Senha provisória: ${senhaProvisoria}`);
      } catch (mailErr) {
        console.error('Erro ao enviar e-mail de boas-vindas:', mailErr);
      }

      res.redirect(`/clientes/${novoCliente.id}?sucesso=Cliente cadastrado com sucesso! Senha provisória: ${senhaProvisoria}`);

    } catch (error) {
      await t.rollback();
      console.error('Erro ao cadastrar cliente:', error);
      if (isDatabaseConnectionError(error)) {
        tratarErroRequisicao(error, req, res);
        return;
      }
      const msgErro = error instanceof Error ? error.message : 'Erro no servidor ao salvar dados. Tente novamente.';
      res.status(422).render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: `Erro ao salvar cadastro: ${msgErro}`,
        dados: dadosForm
      });
    }
  }

  /**
   * GET /clientes/:id
   * Exibe perfil e detalhes do cliente
   */
  public static async exibirDetalhes(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const cliente = await Cliente.findByPk(Number(id), {
        include: [
          { model: Usuario, as: 'usuario' },
          { 
            model: Veiculo, 
            as: 'veiculos',
            include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
          }
        ]
      });

      if (!cliente) {
        res.status(404).send('Cliente não encontrado');
        return;
      }

      res.render('clientes/detalhes', {
        titulo: `Cliente: ${cliente.usuario?.nome || 'Cliente'}`,
        cliente,
        erro: req.query.erro || null,
        sucesso: req.query.sucesso || null
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /clientes/:id/editar
   * Exibe formulário de edição de cliente
   */
  public static async exibirEdicao(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const cliente = await Cliente.findByPk(Number(id), {
        include: [{ model: Usuario, as: 'usuario' }]
      });

      if (!cliente) {
        res.status(404).send('Cliente não encontrado');
        return;
      }

      res.render('clientes/editar', {
        titulo: `Editar Cliente: ${cliente.usuario?.nome || 'Cliente'}`,
        cliente,
        erro: null
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * PUT /clientes/:id
   * Atualiza dados cadastrais do cliente
   */
  public static async editar(req: Request<{ id: string }, {}, IEdicaoClienteBody>, res: Response): Promise<void> {
    const { id } = req.params;
    const { 
      nome, email, telefone, 
      logradouro, numero, bairro, cidade, estado, cep,
      telefone_whatsapp,
      ativo, motivo_inativacao_opcao, motivo_inativacao_outro
    } = req.body;

    const t = await sequelize.transaction();

    try {
      const cliente = await Cliente.findByPk(Number(id), {
        include: [{ model: Usuario, as: 'usuario' }]
      });

      if (!cliente) {
        await t.rollback();
        res.status(404).send('Cliente não encontrado');
        return;
      }

      const dadosAnt = {
        nome: cliente.usuario?.nome,
        email: cliente.usuario?.email,
        telefone: cliente.usuario?.telefone,
        logradouro: cliente.logradouro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        ativo: cliente.ativo,
        motivo_inativacao: cliente.motivo_inativacao
      };

      // 1. Processar Status Ativo / Inativo
      const querInativar = ativo !== undefined && (ativo === '0' || ativo === false || ativo === 'false' || ativo === 'inativo');
      const querReativar = ativo !== undefined && (ativo === '1' || ativo === true || ativo === 'true' || ativo === 'ativo');

      let novoAtivo = cliente.ativo;
      let novoMotivoInativacao = cliente.motivo_inativacao;
      let novoInativadoEm = cliente.inativado_em;
      let acaoAuditoria: TipoAcaoAuditoria = 'ATUALIZAR';
      let descricaoAuditoria = `Atualizou os dados cadastrais do cliente ${cliente.usuario?.nome || ''}.`;

      if (querInativar && cliente.ativo) {
        // REGRA DE OURO: Só é possível inativar se não houver pendências (agendamentos pendentes)
        const agendamentosClientePendentes = await Agendamento.findAll({
          where: {
            cliente_id: cliente.id,
            status: 'agendado'
          },
          transaction: t
        });

        const veiculosDoCliente = await Veiculo.findAll({
          where: { cliente_id: cliente.id },
          attributes: ['id'],
          transaction: t
        });
        const veiculosIds = veiculosDoCliente.map(v => v.id);

        let agendamentosVeiculosPendentes: Agendamento[] = [];
        if (veiculosIds.length > 0) {
          agendamentosVeiculosPendentes = await Agendamento.findAll({
            where: {
              veiculo_id: veiculosIds,
              status: 'agendado'
            },
            transaction: t
          });
        }

        const opcao = (motivo_inativacao_opcao || '').trim();

        const clienteParaExibir = {
          ...cliente.toJSON(),
          usuario: {
            ...(cliente.usuario ? cliente.usuario.toJSON() : {}),
            nome: nome || cliente.usuario?.nome,
            email: email || cliente.usuario?.email,
            telefone: telefone !== undefined ? telefone : cliente.usuario?.telefone
          },
          telefone_whatsapp: telefone_whatsapp !== undefined ? telefone_whatsapp : cliente.telefone_whatsapp,
          logradouro: logradouro !== undefined ? logradouro : cliente.logradouro,
          numero: numero !== undefined ? numero : cliente.numero,
          bairro: bairro !== undefined ? bairro : cliente.bairro,
          cidade: cidade !== undefined ? cidade : cliente.cidade,
          estado: estado !== undefined ? estado : cliente.estado,
          cep: cep !== undefined ? cep : cliente.cep,
          ativo: false,
          motivo_inativacao: opcao === 'Outros' 
            ? `Outros: ${motivo_inativacao_outro || ''}` 
            : (opcao || cliente.motivo_inativacao)
        };

        const totalPendencias = agendamentosClientePendentes.length + agendamentosVeiculosPendentes.length;
        if (totalPendencias > 0) {
          await t.rollback();
          const todosPendentes = [...agendamentosClientePendentes, ...agendamentosVeiculosPendentes];
          const pendenciasFormatadas = todosPendentes.map(a => ({
            id: a.id,
            data: a.data_agendada ? new Date(a.data_agendada).toLocaleDateString('pt-BR') : '',
            horario: a.horario_agendado || '',
            motivo: a.motivo_revisao || 'Revisão / Manutenção Geral'
          }));

          res.status(422).render('clientes/editar', {
            titulo: `Editar Cliente: ${cliente.usuario?.nome || 'Cliente'}`,
            cliente: clienteParaExibir,
            pendenciasAgendamentos: pendenciasFormatadas,
            erro: `Não é possível inativar este cliente: existem ${totalPendencias} agendamento(s) com status "Agendado" vinculados a ele ou aos seus veículos. Conclua ou cancele todos os agendamentos pendentes antes de inativar o cadastro.`
          });
          return;
        }

        // Validação estrita do motivo da inativação
        if (!opcao) {
          await t.rollback();
          res.status(422).render('clientes/editar', {
            titulo: `Editar Cliente: ${cliente.usuario?.nome || 'Cliente'}`,
            cliente: clienteParaExibir,
            erro: 'Para inativar o cliente, é obrigatório selecionar o motivo da inativação.'
          });
          return;
        }

        let motivoFinal = opcao;
        if (opcao === 'Outros') {
          const outroTexto = (motivo_inativacao_outro || '').trim();
          if (!outroTexto) {
            await t.rollback();
            res.status(422).render('clientes/editar', {
              titulo: `Editar Cliente: ${cliente.usuario?.nome || 'Cliente'}`,
              cliente: clienteParaExibir,
              erro: 'Ao escolher a opção de motivo "Outros", você deve descrever detalhadamente o motivo no campo de texto.'
            });
            return;
          }
          motivoFinal = `Outros: ${outroTexto}`;
        }

        novoAtivo = false;
        novoMotivoInativacao = motivoFinal;
        novoInativadoEm = new Date();
        acaoAuditoria = 'INATIVAR';
        descricaoAuditoria = `Inativou o cliente ${cliente.usuario?.nome || ''} (Motivo: ${motivoFinal}).`;
      } else if (querReativar && !cliente.ativo) {
        novoAtivo = true;
        novoMotivoInativacao = null;
        novoInativadoEm = null;
        acaoAuditoria = 'REATIVAR';
        descricaoAuditoria = `Reativou o cadastro do cliente ${cliente.usuario?.nome || ''}.`;
      }

      if (email && cliente.usuario && email !== cliente.usuario.email) {
        const usuarioExistente = await Usuario.findOne({ where: { email }, transaction: t });
        if (usuarioExistente) {
          await t.rollback();
          const clienteParaExibirEmail = {
            ...cliente.toJSON(),
            usuario: {
              ...(cliente.usuario ? cliente.usuario.toJSON() : {}),
              nome: nome || cliente.usuario?.nome,
              email: email,
              telefone: telefone !== undefined ? telefone : cliente.usuario?.telefone
            },
            telefone_whatsapp: telefone_whatsapp !== undefined ? telefone_whatsapp : cliente.telefone_whatsapp,
            logradouro: logradouro !== undefined ? logradouro : cliente.logradouro,
            numero: numero !== undefined ? numero : cliente.numero,
            bairro: bairro !== undefined ? bairro : cliente.bairro,
            cidade: cidade !== undefined ? cidade : cliente.cidade,
            estado: estado !== undefined ? estado : cliente.estado,
            ativo: novoAtivo,
            motivo_inativacao: novoMotivoInativacao
          };
          res.status(422).render('clientes/editar', {
            titulo: `Editar Cliente: ${cliente.usuario.nome}`,
            cliente: clienteParaExibirEmail,
            erro: 'Este endereço de e-mail já está sendo usado por outro usuário.'
          });
          return;
        }
      }

      if (cliente.usuario) {
        await cliente.usuario.update({
          nome: nome || cliente.usuario.nome,
          email: email || cliente.usuario.email,
          telefone: telefone !== undefined ? telefone : cliente.usuario.telefone
        }, { transaction: t });
      }

      await cliente.update({
        logradouro: logradouro !== undefined ? logradouro : cliente.logradouro,
        numero: numero !== undefined ? numero : cliente.numero,
        bairro: bairro !== undefined ? bairro : cliente.bairro,
        cidade: cidade !== undefined ? cidade : cliente.cidade,
        estado: estado !== undefined ? estado : cliente.estado,
        cep: cep !== undefined ? cep : cliente.cep,
        telefone_whatsapp: telefone_whatsapp !== undefined ? telefone_whatsapp : cliente.telefone_whatsapp,
        ativo: novoAtivo,
        motivo_inativacao: novoMotivoInativacao,
        inativado_em: novoInativadoEm
      }, { transaction: t });

      await t.commit();

      // Registro de Auditoria
      await AuditoriaService.registrar({
        req,
        acao: acaoAuditoria,
        recurso: 'Clientes',
        registro_id: cliente.id,
        descricao: descricaoAuditoria,
        dados_anteriores: dadosAnt,
        dados_novos: { 
          nome, email, telefone, logradouro, cidade, estado, 
          ativo: novoAtivo, motivo_inativacao: novoMotivoInativacao 
        }
      });

      const msgSucesso = acaoAuditoria === 'INATIVAR' 
        ? 'Cliente inativado com sucesso!' 
        : acaoAuditoria === 'REATIVAR' 
          ? 'Cliente reativado com sucesso!' 
          : 'Cliente atualizado com sucesso!';

      res.redirect(`/clientes/${cliente.id}?sucesso=${encodeURIComponent(msgSucesso)}`);

    } catch (error) {
      await t.rollback();
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * DELETE /clientes/:id
   * Exclui cliente se não possuir veículos ou agendamentos
   */
  public static async deletar(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const cliente = await Cliente.findByPk(Number(id), {
        include: [{ model: Usuario, as: 'usuario' }]
      });
      if (!cliente) {
        res.redirect('/clientes?erro=Cliente não encontrado.');
        return;
      }

      if (req.session.usuario && req.session.usuario.id === cliente.usuario_id) {
        res.redirect(`/clientes/${id}?erro=Você não pode excluir sua própria conta enquanto estiver conectado.`);
        return;
      }

      const [totalVeiculos, totalAgendamentos] = await Promise.all([
        Veiculo.count({ where: { cliente_id: Number(id) } }),
        Agendamento.count({ where: { cliente_id: Number(id) } })
      ]);

      if (totalVeiculos > 0 || totalAgendamentos > 0) {
        const motivos = [];
        if (totalVeiculos > 0) motivos.push(`${totalVeiculos} veículo(s)`);
        if (totalAgendamentos > 0) motivos.push(`${totalAgendamentos} agendamento(s)`);
        res.redirect(`/clientes/${id}?erro=Não é possível excluir este cliente pois existem ${motivos.join(' e ')} vinculados ao seu histórico.`);
        return;
      }

      const nomeCliente = cliente.usuario?.nome || 'Cliente';
      const usuarioId = cliente.usuario_id;
      await cliente.destroy();
      if (usuarioId) {
        await Usuario.destroy({ where: { id: usuarioId } });
      }

      // Registro de Auditoria
      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'Clientes',
        registro_id: id,
        descricao: `Excluiu o cadastro do cliente ${nomeCliente} (ID: ${id}).`
      });

      res.redirect('/clientes?sucesso=Cliente excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      if (isDatabaseConnectionError(error)) {
        tratarErroRequisicao(error, req, res);
        return;
      }
      res.redirect(`/clientes/${id}?erro=Não foi possível excluir o cliente: restrição de integridade no banco de dados.`);
    }
  }

  /**
   * GET /clientes/:id/pendencias-inativacao
   * Consulta assíncrona para checagem preventiva de pendências do cliente e de seus veículos
   */
  public static async verificarPendenciasInativacao(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const clienteId = Number(id);
      const veiculos = await Veiculo.findAll({
        where: { cliente_id: clienteId },
        include: [{ model: ModeloVeiculo, as: 'modelo' }]
      });
      const veiculosIds = veiculos.map(v => v.id);

      const agendamentos = await Agendamento.findAll({
        where: {
          [Op.or]: [
            { cliente_id: clienteId },
            ...(veiculosIds.length > 0 ? [{ veiculo_id: veiculosIds }] : [])
          ],
          status: 'agendado'
        },
        include: [{ model: Veiculo, as: 'veiculo', include: [{ model: ModeloVeiculo, as: 'modelo' }] }],
        order: [['data_agendada', 'ASC'], ['horario_agendado', 'ASC']]
      });

      res.json({
        sucesso: true,
        temPendencias: agendamentos.length > 0,
        totalPendencias: agendamentos.length,
        pendencias: agendamentos.map(a => ({
          id: a.id,
          veiculo: a.veiculo ? `${a.veiculo.modelo?.nome || 'Veículo'} (${a.veiculo.placa})` : 'Geral',
          data: a.data_agendada ? new Date(a.data_agendada).toLocaleDateString('pt-BR') : '',
          horario: a.horario_agendado || '',
          motivo: a.motivo_revisao || 'Revisão / Manutenção Geral',
          status: a.status
        }))
      });
    } catch (error) {
      console.error('Erro ao verificar pendencias de cliente:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao consultar pendências do cliente.' });
    }
  }
}

export default ClienteController;

// Compatibilidade CommonJS
module.exports = ClienteController;
