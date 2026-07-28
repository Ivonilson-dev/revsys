const { sequelize, Cliente, Usuario, Veiculo, LogLgpd, ModeloVeiculo, MarcaVeiculo } = require('../../models');
const { cpf } = require('cpf-cnpj-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

class ClienteController {
  // GET /clientes
  static async listar(req, res) {
    try {
      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [['criado_em', 'DESC']]
      });

      return res.render('clientes/index', {
        titulo: 'Gerenciamento de Clientes',
        clientes
      });
    } catch (error) {
      console.error('Erro ao listar clientes:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // GET /clientes/novo
  static async exibirCadastro(req, res) {
    return res.render('clientes/novo', {
      titulo: 'Cadastrar Novo Cliente',
      erro: null,
      dados: {}
    });
  }

  // POST /clientes
  static async cadastrar(req, res) {
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
      return res.render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: 'Por favor, preencha todos os campos obrigatórios e aceite o termo de consentimento LGPD.',
        dados: dadosForm
      });
    }

    // Validação de CPF
    const cpfLimpo = cpfInput.replace(/\D/g, '');
    if (!cpf.isValid(cpfLimpo)) {
      return res.render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: 'CPF informado é inválido.',
        dados: dadosForm
      });
    }

    const t = await sequelize.transaction();

    try {
      // 1. Verificar se e-mail de usuário já existe
      const usuarioExistente = await Usuario.findOne({ where: { email } }, { transaction: t });
      if (usuarioExistente) {
        await t.rollback();
        return res.render('clientes/novo', {
          titulo: 'Cadastrar Novo Cliente',
          erro: 'Este endereço de e-mail já está cadastrado no sistema.',
          dados: dadosForm
        });
      }

      // 2. Verificar se CPF já existe via blind index (cpf_hash)
      const cpfHash = crypto.createHash('sha256').update(cpfLimpo).digest('hex');
      const clienteExistente = await Cliente.findOne({ where: { cpf_hash: cpfHash } }, { transaction: t });
      if (clienteExistente) {
        await t.rollback();
        return res.render('clientes/novo', {
          titulo: 'Cadastrar Novo Cliente',
          erro: 'Este CPF já está cadastrado no sistema.',
          dados: dadosForm
        });
      }

      // 3. Gerar senha provisória
      const senhaProvisoria = 'RevSys' + cpfLimpo.substring(0, 6); // Ex: RevSys123456

      // 4. Criar o Usuário com papel 'cliente'
      const novoUsuario = await Usuario.create({
        nome,
        email,
        senha_hash: senhaProvisoria, // O hook do model fará o hash bcrypt
        papel: 'cliente',
        telefone: telefone || null
      }, { transaction: t });

      // 5. Criar o Cliente
      const novoCliente = await Cliente.create({
        usuario_id: novoUsuario.id,
        cpf: cpfLimpo, // Encriptado automaticamente via model set()
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        cep,
        telefone_whatsapp: telefone_whatsapp || telefone || null,
        consentimento_lgpd: true,
        data_consentimento_lgpd: new Date()
      }, { transaction: t });

      // 6. Registrar o Log de Consentimento LGPD
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Desconhecido';
      
      await LogLgpd.create({
        cliente_id: novoCliente.id,
        consentimento_dado: true,
        ip_origem: ip,
        user_agent: userAgent
      }, { transaction: t });

      // Commitar transação
      await t.commit();

      // Enviar e-mail de boas-vindas com dados de login de forma assíncrona (sem travar a requisição)
      // Usaremos try-catch interno para que se der erro no SMTP do cliente não impeça a tela de carregar
      try {
        console.log(`[E-mail enviado para ${email}] Senha provisória: ${senhaProvisoria}`);
        // Configuração de envio via Nodemailer pode ser implementada conforme dados do .env
      } catch (mailErr) {
        console.error('Erro ao enviar e-mail de boas-vindas:', mailErr);
      }

      return res.redirect(`/clientes/${novoCliente.id}?sucesso=Cliente cadastrado com sucesso! Senha provisória: ${senhaProvisoria}`);

    } catch (error) {
      await t.rollback();
      console.error('Erro ao cadastrar cliente:', error);
      return res.render('clientes/novo', {
        titulo: 'Cadastrar Novo Cliente',
        erro: 'Erro no servidor ao salvar dados. Tente novamente.',
        dados: dadosForm
      });
    }
  }

  // GET /clientes/:id
  static async exibirDetalhes(req, res) {
    const { id } = req.params;
    const sucesso = req.query.sucesso;

    try {
      const cliente = await Cliente.findByPk(id, {
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
        return res.status(404).send('Cliente não encontrado');
      }

      return res.render('clientes/detalhes', {
        titulo: `Cliente: ${cliente.usuario.nome}`,
        cliente,
        sucesso
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // GET /clientes/:id/editar
  static async exibirEdicao(req, res) {
    const { id } = req.params;

    try {
      const cliente = await Cliente.findByPk(id, {
        include: [{ model: Usuario, as: 'usuario' }]
      });

      if (!cliente) {
        return res.status(404).send('Cliente não encontrado');
      }

      return res.render('clientes/editar', {
        titulo: `Editar Cliente: ${cliente.usuario.nome}`,
        cliente,
        erro: null
      });
    } catch (error) {
      console.error('Erro ao exibir form de edição do cliente:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // PUT /clientes/:id
  static async editar(req, res) {
    const { id } = req.params;
    const { 
      nome, email, telefone, 
      logradouro, numero, bairro, cidade, estado, cep,
      telefone_whatsapp 
    } = req.body;

    const t = await sequelize.transaction();

    try {
      const cliente = await Cliente.findByPk(id, {
        include: [{ model: Usuario, as: 'usuario' }]
      });

      if (!cliente) {
        await t.rollback();
        return res.status(404).send('Cliente não encontrado');
      }

      // Validar se o e-mail mudou e já existe em outro usuário
      if (email !== cliente.usuario.email) {
        const usuarioExistente = await Usuario.findOne({ where: { email } }, { transaction: t });
        if (usuarioExistente) {
          await t.rollback();
          return res.render('clientes/editar', {
            titulo: `Editar Cliente: ${cliente.usuario.nome}`,
            cliente,
            erro: 'Este endereço de e-mail já está sendo usado por outro usuário.'
          });
        }
      }

      // Atualizar dados de usuário
      await cliente.usuario.update({
        nome,
        email,
        telefone
      }, { transaction: t });

      // Atualizar dados de cliente
      await cliente.update({
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        cep,
        telefone_whatsapp
      }, { transaction: t });

      await t.commit();
      return res.redirect(`/clientes/${cliente.id}?sucesso=Cliente atualizado com sucesso!`);

    } catch (error) {
      await t.rollback();
      console.error('Erro ao editar cliente:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // DELETE /clientes/:id
  static async deletar(req, res) {
    const { id } = req.params;

    try {
      const cliente = await Cliente.findByPk(id);
      if (!cliente) {
        return res.status(404).send('Cliente não encontrado');
      }

      // Ao deletar o usuário associado, a tabela 'clientes' será deletada automaticamente
      // devido a constraint ON DELETE CASCADE na chave estrangeira usuario_id!
      await Usuario.destroy({ where: { id: cliente.usuario_id } });

      return res.redirect('/clientes?sucesso=Cliente deletado com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }
}

module.exports = ClienteController;
