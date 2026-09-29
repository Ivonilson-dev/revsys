const { Veiculo, Cliente, Usuario, ModeloVeiculo, MarcaVeiculo, RegistroTroca, Peca, MarcaPeca, Agendamento, Oficina, RegistroServico, Servico } = require('../../models');
const { calcularStatusAlerta } = require('../utils/alertas');

class VeiculoController {
  // GET /veiculos
  static async listar(req, res) {
    const { busca } = req.query;
    let whereClause = {};

    try {
      // Se houver busca rápida por placa
      if (busca) {
        const buscaLimpa = busca.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        whereClause = { placa: buscaLimpa };
      }

      const veiculos = await Veiculo.findAll({
        where: whereClause,
        include: [
          { 
            model: Cliente, 
            as: 'cliente', 
            include: [{ model: Usuario, as: 'usuario' }] 
          },
          { 
            model: ModeloVeiculo, 
            as: 'modelo', 
            include: [{ model: MarcaVeiculo, as: 'marca' }] 
          }
        ],
        order: [['criado_em', 'DESC']]
      });

      // Se buscou por placa e encontrou exatamente um veículo, redireciona para a página do veículo
      if (busca && veiculos.length === 1) {
        return res.redirect(`/veiculos/${veiculos[0].id}`);
      }

      return res.render('veiculos/index', {
        titulo: 'Gerenciamento de Veículos',
        veiculos,
        busca: busca || ''
      });
    } catch (error) {
      console.error('Erro ao listar veículos:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // GET /veiculos/novo
  static async exibirCadastro(req, res) {
    const clienteId = req.query.cliente_id;

    try {
      const clientes = await Cliente.findAll({
        include: [{ model: Usuario, as: 'usuario' }],
        order: [[{ model: Usuario, as: 'usuario' }, 'nome', 'ASC']]
      });

      const marcas = await MarcaVeiculo.findAll({
        order: [['nome', 'ASC']]
      });

      const modelos = await ModeloVeiculo.findAll({
        include: [{ model: MarcaVeiculo, as: 'marca' }],
        order: [['nome', 'ASC']]
      });

      return res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        clientes,
        marcas,
        modelos,
        clienteId: clienteId || '',
        erro: null,
        dados: {}
      });
    } catch (error) {
      console.error('Erro ao exibir form de cadastro de veículo:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // POST /veiculos
  static async cadastrar(req, res) {
    const { placa, modelo_id, cliente_id, ano, cor, km_atual, condicao } = req.body;
    
    const dadosForm = { placa, modelo_id, cliente_id, ano, cor, km_atual, condicao };

    // Validação da Placa
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

    if (!placaRegex.test(placaLimpa)) {
      return res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        erro: 'Formato de placa inválido (deve ser padrão antigo AAA-9999 ou Mercosul AAA9A99).',
        dados: dadosForm,
        clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
        marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
        modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
        clienteId: cliente_id
      });
    }

    const anoInt = parseInt(ano, 10);
    const anoMax = new Date().getFullYear() + 1;
    if (isNaN(anoInt) || anoInt < 1900 || anoInt > anoMax) {
      return res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        erro: `Inconsistência lógica: O ano de fabricação deve estar entre 1900 e ${anoMax}.`,
        dados: dadosForm,
        clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
        marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
        modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
        clienteId: cliente_id
      });
    }

    const kmInt = parseInt(km_atual, 10);
    if (isNaN(kmInt) || kmInt < 0) {
      return res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        erro: 'Inconsistência lógica: A quilometragem atual não pode ser negativa.',
        dados: dadosForm,
        clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
        marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
        modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
        clienteId: cliente_id
      });
    }

    try {
      // Verificar se placa já existe
      const veiculoExistente = await Veiculo.findOne({ where: { placa: placaLimpa } });
      if (veiculoExistente) {
        return res.render('veiculos/novo', {
          titulo: 'Cadastrar Veículo',
          erro: 'Este veículo (placa) já está cadastrado no sistema.',
          dados: dadosForm,
          clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
          marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
          modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
          clienteId: cliente_id
        });
      }

      const novoVeiculo = await Veiculo.create({
        placa: placaLimpa,
        modelo_id,
        cliente_id,
        ano,
        cor,
        km_atual,
        condicao
      });

      return res.redirect(`/veiculos/${novoVeiculo.id}?sucesso=Veículo cadastrado com sucesso!`);
    } catch (error) {
      console.error('Erro ao cadastrar veículo:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // GET /veiculos/:id
  static async exibirDetalhes(req, res) {
    const { id } = req.params;
    const sucesso = req.query.sucesso;

    try {
      const veiculo = await Veiculo.findByPk(id, {
        include: [
          { 
            model: Cliente, 
            as: 'cliente', 
            include: [{ model: Usuario, as: 'usuario' }] 
          },
          { 
            model: ModeloVeiculo, 
            as: 'modelo', 
            include: [{ model: MarcaVeiculo, as: 'marca' }] 
          }
        ]
      });

      if (!veiculo) {
        return res.status(404).send('Veículo não encontrado');
      }

      // Histórico de trocas (da mais recente para a mais antiga)
      const historicoTrocas = await RegistroTroca.findAll({
        where: { veiculo_id: id },
        include: [
          { model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] },
          { model: Oficina, as: 'oficina' }
        ],
        order: [['data_troca', 'DESC'], ['id', 'DESC']]
      });

      // Histórico de serviços prestados
      const historicoServicos = await RegistroServico.findAll({
        where: { veiculo_id: id },
        include: [
          { model: Servico, as: 'servico' },
          { model: Oficina, as: 'oficina' }
        ],
        order: [['data_servico', 'DESC'], ['id', 'DESC']]
      });

      // Calcular alertas atuais (com base na última troca de cada peça)
      const ultimasTrocas = {};
      historicoTrocas.forEach(troca => {
        const pecaId = troca.peca_id;
        if (!ultimasTrocas[pecaId]) {
          ultimasTrocas[pecaId] = troca;
        }
      });

      const alertasPecas = [];
      for (const pecaId in ultimasTrocas) {
        const troca = ultimasTrocas[pecaId];
        const statusAlerta = calcularStatusAlerta(troca, veiculo.km_atual);
        alertasPecas.push({
          peca: troca.peca,
          troca,
          alerta: statusAlerta
        });
      }

      // Agendamentos do veículo
      const agendamentos = await Agendamento.findAll({
        where: { veiculo_id: id },
        include: [{ model: Usuario, as: 'criador' }, { model: Servico, as: 'servico' }],
        order: [['data_agendada', 'DESC'], ['horario_agendado', 'DESC']]
      });

      // Carregar peças, serviços e oficinas para formulários rápidos
      const pecas = await Peca.findAll({
        include: [{ model: MarcaPeca, as: 'marca' }],
        order: [
          [{ model: MarcaPeca, as: 'marca' }, 'nome', 'ASC'],
          ['nome', 'ASC']
        ]
      });

      const servicos = await Servico.findAll({
        order: [['nome', 'ASC']]
      });

      const oficinas = await Oficina.findAll({ order: [['nome', 'ASC']] });

      return res.render('veiculos/detalhes', {
        titulo: `Veículo: ${veiculo.placa}`,
        veiculo,
        historicoTrocas,
        historicoServicos,
        alertasPecas,
        agendamentos,
        pecas,
        servicos,
        oficinas,
        sucesso
      });
    } catch (error) {
      console.error('Erro ao exibir detalhes do veículo:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // GET /veiculos/:id/editar
  static async exibirEdicao(req, res) {
    const { id } = req.params;

    try {
      const veiculo = await Veiculo.findByPk(id, {
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: ModeloVeiculo, as: 'modelo' }
        ]
      });

      if (!veiculo) {
        return res.status(404).send('Veículo não encontrado');
      }

      const marcas = await MarcaVeiculo.findAll({
        order: [['nome', 'ASC']]
      });

      const modelos = await ModeloVeiculo.findAll({
        include: [{ model: MarcaVeiculo, as: 'marca' }],
        order: [['nome', 'ASC']]
      });

      return res.render('veiculos/editar', {
        titulo: `Editar Veículo: ${veiculo.placa}`,
        veiculo,
        marcas,
        modelos,
        erro: null
      });
    } catch (error) {
      console.error('Erro ao exibir formulário de edição de veículo:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // PUT /veiculos/:id
  static async editar(req, res) {
    const { id } = req.params;
    const { placa, modelo_id, ano, cor, km_atual, condicao } = req.body;

    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    try {
      const veiculo = await Veiculo.findByPk(id);
      if (!veiculo) {
        return res.status(404).send('Veículo não encontrado');
      }

      const anoInt = parseInt(ano, 10);
      const anoMax = new Date().getFullYear() + 1;
      if (isNaN(anoInt) || anoInt < 1900 || anoInt > anoMax) {
        const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
        return res.render('veiculos/editar', {
          titulo: `Editar Veículo: ${veiculo.placa}`,
          veiculo,
          marcas,
          modelos,
          erro: `Inconsistência lógica: O ano de fabricação deve estar entre 1900 e ${anoMax}.`
        });
      }

      const kmInt = parseInt(km_atual, 10);
      if (isNaN(kmInt) || kmInt < 0) {
        const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
        return res.render('veiculos/editar', {
          titulo: `Editar Veículo: ${veiculo.placa}`,
          veiculo,
          marcas,
          modelos,
          erro: 'Inconsistência lógica: A quilometragem atual não pode ser negativa.'
        });
      }

      // Validar placa única se mudou
      if (placaLimpa !== veiculo.placa) {
        const veiculoExistente = await Veiculo.findOne({ where: { placa: placaLimpa } });
        if (veiculoExistente) {
          const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
          const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
          return res.render('veiculos/editar', {
            titulo: `Editar Veículo: ${veiculo.placa}`,
            veiculo,
            marcas,
            modelos,
            erro: 'Esta placa já está cadastrada em outro veículo.'
          });
        }
      }

      await veiculo.update({
        placa: placaLimpa,
        modelo_id,
        ano,
        cor,
        km_atual,
        condicao
      });

      return res.redirect(`/veiculos/${veiculo.id}?sucesso=Veículo atualizado com sucesso!`);
    } catch (error) {
      console.error('Erro ao editar veículo:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }

  // DELETE /veiculos/:id
  static async deletar(req, res) {
    const { id } = req.params;

    try {
      const veiculo = await Veiculo.findByPk(id);
      if (!veiculo) {
        return res.status(404).send('Veículo não encontrado');
      }

      const clienteId = veiculo.cliente_id;
      await veiculo.destroy();

      return res.redirect(`/clientes/${clienteId}?sucesso=Veículo removido com sucesso!`);
    } catch (error) {
      console.error('Erro ao deletar veículo:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }
}

module.exports = VeiculoController;
