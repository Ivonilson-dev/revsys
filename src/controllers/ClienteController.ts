import { Request, Response } from 'express';
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cpf } = require('cpf-cnpj-validator');
import crypto from 'crypto';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';

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
      res.render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: 'Por favor, preencha todos os campos obrigatórios e aceite o termo de consentimento LGPD.',
        dados: dadosForm
      });
      return;
    }

    // Validação de CPF
    const cpfLimpo = cpfInput.replace(/\D/g, '');
    if (!cpf.isValid(cpfLimpo)) {
      res.render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: 'CPF informado é inválido.',
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
        res.render('clientes/novo', {
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
        res.render('clientes/novo', {
          titulo: 'Cadastrar Novo Cliente',
          erro: 'Este CPF já está cadastrado no sistema.',
          dados: dadosForm
        });
        return;
      }

      // 3. Gerar senha provisória
      const senhaProvisoria = 'RevSys' + cpfLimpo.substring(0, 6);

      // 4. Criar o Usuário com papel 'cliente'
      const novoUsuario = await Usuario.create({
        nome,
        email,
        senha_hash: senhaProvisoria,
        papel: 'cliente',
        telefone: telefone || null
      }, { transaction: t });

      // 5. Criar o Cliente
      const novoCliente = await Cliente.create({
        usuario_id: novoUsuario.id,
        cpf: cpfLimpo,
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
      res.render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: 'Erro no servidor ao salvar dados. Tente novamente.',
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
      telefone_whatsapp 
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

      if (email && cliente.usuario && email !== cliente.usuario.email) {
        const usuarioExistente = await Usuario.findOne({ where: { email }, transaction: t });
        if (usuarioExistente) {
          await t.rollback();
          res.render('clientes/editar', {
            titulo: `Editar Cliente: ${cliente.usuario.nome}`,
            cliente,
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
        telefone_whatsapp: telefone_whatsapp !== undefined ? telefone_whatsapp : cliente.telefone_whatsapp
      }, { transaction: t });

      await t.commit();
      res.redirect(`/clientes/${cliente.id}?sucesso=Cliente atualizado com sucesso!`);

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

      const usuarioId = cliente.usuario_id;
      await cliente.destroy();
      if (usuarioId) {
        await Usuario.destroy({ where: { id: usuarioId } });
      }

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
}

export default ClienteController;

// Compatibilidade CommonJS
module.exports = ClienteController;
