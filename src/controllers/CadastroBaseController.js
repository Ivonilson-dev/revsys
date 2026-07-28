const { MarcaVeiculo, ModeloVeiculo, MarcaPeca, Peca, Oficina } = require('../../models');
const cache = require('../utils/cache');

class CadastroBaseController {
  // GET /cadastros
  static async exibirPainelCadastros(req, res) {
    try {
      // Obter Marcas de Veículo (com cache)
      let marcasVeiculo = cache.get(cache.keys.MARCAS_VEICULO);
      if (!marcasVeiculo) {
        marcasVeiculo = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        cache.set(cache.keys.MARCAS_VEICULO, marcasVeiculo);
      }

      // Obter Modelos de Veículo (com cache)
      let modelosVeiculo = cache.get(cache.keys.MODELOS_VEICULO);
      if (!modelosVeiculo) {
        modelosVeiculo = await ModeloVeiculo.findAll({
          include: [{ model: MarcaVeiculo, as: 'marca' }],
          order: [['nome', 'ASC']]
        });
        cache.set(cache.keys.MODELOS_VEICULO, modelosVeiculo);
      }

      // Obter Marcas de Peça (com cache)
      let marcasPeca = cache.get(cache.keys.MARCAS_PECA);
      if (!marcasPeca) {
        marcasPeca = await MarcaPeca.findAll({ order: [['nome', 'ASC']] });
        cache.set(cache.keys.MARCAS_PECA, marcasPeca);
      }

      // Obter Peças (com cache)
      let pecas = cache.get(cache.keys.PECAS);
      if (!pecas) {
        pecas = await Peca.findAll({
          include: [{ model: MarcaPeca, as: 'marca' }],
          order: [['nome', 'ASC']]
        });
        cache.set(cache.keys.PECAS, pecas);
      }

      // Obter Oficinas (com cache)
      let oficinas = cache.get(cache.keys.OFICINAS);
      if (!oficinas) {
        oficinas = await Oficina.findAll({ order: [['nome', 'ASC']] });
        cache.set(cache.keys.OFICINAS, oficinas);
      }

      return res.render('cadastros/index', {
        titulo: 'Tabelas Auxiliares',
        marcasVeiculo,
        modelosVeiculo,
        marcasPeca,
        pecas,
        oficinas,
        erro: req.query.erro || null,
        sucesso: req.query.sucesso || null
      });
    } catch (error) {
      console.error('Erro ao renderizar painel de cadastros:', error);
      return res.status(500).send('Erro interno do servidor.');
    }
  }

  // POST /marcas-veiculo
  static async criarMarcaVeiculo(req, res) {
    const { nome } = req.body;
    if (!nome) return res.redirect('/cadastros?erro=Nome da marca é obrigatório.');
    try {
      await MarcaVeiculo.create({ nome });
      cache.del(cache.keys.MARCAS_VEICULO); // Invalida o cache
      return res.redirect('/cadastros?sucesso=Marca de veículo cadastrada!');
    } catch (error) {
      return res.redirect('/cadastros?erro=Erro ao cadastrar marca de veículo (pode ser duplicada).');
    }
  }

  // POST /modelos-veiculo
  static async criarModeloVeiculo(req, res) {
    const { nome, marca_veiculo_id } = req.body;
    if (!nome || !marca_veiculo_id) return res.redirect('/cadastros?erro=Nome e Marca são obrigatórios.');
    try {
      await ModeloVeiculo.create({ nome, marca_veiculo_id });
      cache.del(cache.keys.MODELOS_VEICULO);
      return res.redirect('/cadastros?sucesso=Modelo de veículo cadastrado!');
    } catch (error) {
      return res.redirect('/cadastros?erro=Erro ao cadastrar modelo.');
    }
  }

  // POST /marcas-peca
  static async criarMarcaPeca(req, res) {
    const { nome } = req.body;
    if (!nome) return res.redirect('/cadastros?erro=Nome da marca da peça é obrigatório.');
    try {
      await MarcaPeca.create({ nome });
      cache.del(cache.keys.MARCAS_PECA);
      return res.redirect('/cadastros?sucesso=Marca de peça cadastrada!');
    } catch (error) {
      return res.redirect('/cadastros?erro=Erro ao cadastrar marca de peça.');
    }
  }

  // POST /pecas
  static async criarPeca(req, res) {
    const { nome, marca_peca_id } = req.body;
    if (!nome || !marca_peca_id) return res.redirect('/cadastros?erro=Nome e Marca da peça são obrigatórios.');
    try {
      await Peca.create({ nome, marca_peca_id });
      cache.del(cache.keys.PECAS);
      return res.redirect('/cadastros?sucesso=Peça cadastrada!');
    } catch (error) {
      return res.redirect('/cadastros?erro=Erro ao cadastrar peça.');
    }
  }

  // POST /oficinas
  static async criarOficina(req, res) {
    const { nome, cnpj, telefone, endereco, email, whatsapp_numero } = req.body;
    if (!nome || !cnpj) return res.redirect('/cadastros?erro=Nome e CNPJ da oficina são obrigatórios.');
    try {
      await Oficina.create({ nome, cnpj, telefone, endereco, email, whatsapp_numero });
      cache.del(cache.keys.OFICINAS);
      return res.redirect('/cadastros?sucesso=Oficina cadastrada!');
    } catch (error) {
      return res.redirect('/cadastros?erro=Erro ao cadastrar oficina (CNPJ duplicado).');
    }
  }
}

module.exports = CadastroBaseController;
