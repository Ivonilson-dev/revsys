const { MarcaVeiculo, ModeloVeiculo, MarcaPeca, Peca, Oficina, Servico, RegistroTroca, RegistroServico, Veiculo, Agendamento } = require('../../models');
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
          order: [
            [{ model: MarcaPeca, as: 'marca' }, 'nome', 'ASC'],
            ['nome', 'ASC']
          ]
        });
        cache.set(cache.keys.PECAS, pecas);
      }

      // Obter Oficinas (com cache)
      let oficinas = cache.get(cache.keys.OFICINAS);
      if (!oficinas) {
        oficinas = await Oficina.findAll({ order: [['nome', 'ASC']] });
        cache.set(cache.keys.OFICINAS, oficinas);
      }

      // Obter Serviços (com cache)
      let servicos = cache.get(cache.keys.SERVICOS);
      if (!servicos) {
        servicos = await Servico.findAll({ order: [['nome', 'ASC']] });
        cache.set(cache.keys.SERVICOS, servicos);
      }

      return res.render('cadastros/index', {
        titulo: 'Tabelas Auxiliares',
        marcasVeiculo,
        modelosVeiculo,
        marcasPeca,
        pecas,
        oficinas,
        servicos,
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
      cache.del(cache.keys.MARCAS_VEICULO);
      return res.redirect('/cadastros?sucesso=Marca de veículo cadastrada!');
    } catch (error) {
      return res.redirect('/cadastros?erro=Erro ao cadastrar marca de veículo (pode ser duplicada).');
    }
  }

  // DELETE /marcas-veiculo/:id
  static async deletarMarcaVeiculo(req, res) {
    const { id } = req.params;
    try {
      const m = await MarcaVeiculo.findByPk(id);
      if (!m) return res.redirect('/cadastros?erro=Marca de veículo não encontrada.');

      const totalModelos = await ModeloVeiculo.count({ where: { marca_veiculo_id: id } });
      if (totalModelos > 0) {
        return res.redirect(`/cadastros?erro=Não é possível excluir a marca "${m.nome}" pois existem ${totalModelos} modelo(s) de veículos vinculados a ela.`);
      }

      await m.destroy();
      cache.del(cache.keys.MARCAS_VEICULO);
      return res.redirect('/cadastros?sucesso=Marca de veículo excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar marca de veículo:', error);
      return res.redirect('/cadastros?erro=Não foi possível excluir a marca: existem registros vinculados.');
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

  // DELETE /modelos-veiculo/:id
  static async deletarModeloVeiculo(req, res) {
    const { id } = req.params;
    try {
      const mod = await ModeloVeiculo.findByPk(id);
      if (!mod) return res.redirect('/cadastros?erro=Modelo de veículo não encontrado.');

      const totalVeiculos = await Veiculo.count({ where: { modelo_id: id } });
      if (totalVeiculos > 0) {
        return res.redirect(`/cadastros?erro=Não é possível excluir o modelo "${mod.nome}" pois existem ${totalVeiculos} veículo(s) cadastrados com este modelo.`);
      }

      await mod.destroy();
      cache.del(cache.keys.MODELOS_VEICULO);
      return res.redirect('/cadastros?sucesso=Modelo de veículo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar modelo de veículo:', error);
      return res.redirect('/cadastros?erro=Não foi possível excluir o modelo: existem veículos vinculados.');
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

  // DELETE /marcas-peca/:id
  static async deletarMarcaPeca(req, res) {
    const { id } = req.params;
    try {
      const mp = await MarcaPeca.findByPk(id);
      if (!mp) return res.redirect('/cadastros?erro=Marca/fabricante de peça não encontrada.');

      const totalPecas = await Peca.count({ where: { marca_peca_id: id } });
      if (totalPecas > 0) {
        return res.redirect(`/cadastros?erro=Não é possível excluir a fabricante "${mp.nome}" pois existem ${totalPecas} peça(s) cadastradas sob esta marca.`);
      }

      await mp.destroy();
      cache.del(cache.keys.MARCAS_PECA);
      return res.redirect('/cadastros?sucesso=Marca de peça excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar marca de peça:', error);
      return res.redirect('/cadastros?erro=Não foi possível excluir a fabricante: existem peças vinculadas.');
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

  // DELETE /pecas/:id (Consistência: Produto não pode ser excluído se vinculado a manutenções)
  static async deletarPeca(req, res) {
    const { id } = req.params;
    try {
      const p = await Peca.findByPk(id);
      if (!p) return res.redirect('/cadastros?erro=Peça não encontrada.');

      const totalTrocas = await RegistroTroca.count({ where: { peca_id: id } });
      if (totalTrocas > 0) {
        return res.redirect(`/cadastros?erro=Não é possível excluir a peça "${p.nome}" pois ela já está vinculada a ${totalTrocas} registro(s) de troca em veículos.`);
      }

      await p.destroy();
      cache.del(cache.keys.PECAS);
      return res.redirect('/cadastros?sucesso=Peça excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar peça:', error);
      return res.redirect('/cadastros?erro=Não foi possível excluir a peça: restrição de integridade no banco de dados.');
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

  // DELETE /oficinas/:id
  static async deletarOficina(req, res) {
    const { id } = req.params;
    try {
      const o = await Oficina.findByPk(id);
      if (!o) return res.redirect('/cadastros?erro=Oficina não encontrada.');

      const [totalTrocas, totalServicos] = await Promise.all([
        RegistroTroca.count({ where: { oficina_id: id } }),
        RegistroServico.count({ where: { oficina_id: id } })
      ]);

      if (totalTrocas > 0 || totalServicos > 0) {
        return res.redirect(`/cadastros?erro=Não é possível excluir a oficina "${o.nome}" pois existem serviços ou trocas de peças vinculados a ela.`);
      }

      await o.destroy();
      cache.del(cache.keys.OFICINAS);
      return res.redirect('/cadastros?sucesso=Oficina excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar oficina:', error);
      return res.redirect('/cadastros?erro=Não foi possível excluir a oficina: existem registros vinculados.');
    }
  }

  // POST /servicos (CRUD - Criar Serviço)
  static async criarServico(req, res) {
    const { nome, descricao, categoria, preco_padrao } = req.body;
    if (!nome) return res.redirect('/cadastros?erro=Nome do serviço é obrigatório.');
    try {
      await Servico.create({
        nome,
        descricao: descricao || null,
        categoria: categoria || 'Geral',
        preco_padrao: preco_padrao ? parseFloat(preco_padrao) : null
      });
      cache.del(cache.keys.SERVICOS);
      return res.redirect('/cadastros?sucesso=Serviço cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      return res.redirect('/cadastros?erro=Erro ao cadastrar serviço (pode ser nome duplicado).');
    }
  }

  // PUT /servicos/:id (CRUD - Editar Serviço)
  static async editarServico(req, res) {
    const { id } = req.params;
    const { nome, descricao, categoria, preco_padrao } = req.body;
    try {
      const s = await Servico.findByPk(id);
      if (!s) return res.redirect('/cadastros?erro=Serviço não encontrado.');

      await s.update({
        nome: nome || s.nome,
        descricao: descricao !== undefined ? descricao : s.descricao,
        categoria: categoria || s.categoria,
        preco_padrao: preco_padrao ? parseFloat(preco_padrao) : null
      });

      cache.del(cache.keys.SERVICOS);
      return res.redirect('/cadastros?sucesso=Serviço atualizado!');
    } catch (error) {
      console.error('Erro ao editar serviço:', error);
      return res.redirect('/cadastros?erro=Erro ao atualizar serviço.');
    }
  }

  // DELETE /servicos/:id (CRUD - Excluir Serviço com verificação de integridade)
  static async deletarServico(req, res) {
    const { id } = req.params;
    try {
      const s = await Servico.findByPk(id);
      if (!s) return res.redirect('/cadastros?erro=Serviço não encontrado.');

      const [totalRegServicos, totalAgendamentos] = await Promise.all([
        RegistroServico.count({ where: { servico_id: id } }),
        Agendamento.count({ where: { servico_id: id } })
      ]);

      if (totalRegServicos > 0 || totalAgendamentos > 0) {
        const motivos = [];
        if (totalRegServicos > 0) motivos.push(`${totalRegServicos} registro(s) de serviço`);
        if (totalAgendamentos > 0) motivos.push(`${totalAgendamentos} agendamento(s)`);
        return res.redirect(`/cadastros?erro=Não é possível excluir o serviço "${s.nome}" pois existem ${motivos.join(' e ')} vinculados a ele.`);
      }

      await s.destroy();
      cache.del(cache.keys.SERVICOS);
      return res.redirect('/cadastros?sucesso=Serviço excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      return res.redirect('/cadastros?erro=Não é possível excluir serviço associado a históricos.');
    }
  }
}

module.exports = CadastroBaseController;
