import { Request, Response } from 'express';
import { 
  MarcaVeiculo, 
  ModeloVeiculo, 
  MarcaPeca, 
  Peca, 
  Oficina, 
  Servico, 
  RegistroTroca, 
  RegistroServico, 
  Veiculo, 
  Agendamento 
} from '../../models';
import AppCache from '../utils/cache';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';

export class CadastroBaseController {
  /**
   * GET /cadastros
   * Exibe visão unificada das tabelas auxiliares
   */
  public static async exibirPainelCadastros(req: Request, res: Response): Promise<void> {
    try {
      // Obter Marcas de Veículo (com cache)
      let marcasVeiculo = AppCache.get(AppCache.keys.MARCAS_VEICULO);
      if (!marcasVeiculo) {
        marcasVeiculo = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        AppCache.set(AppCache.keys.MARCAS_VEICULO, marcasVeiculo);
      }

      // Obter Modelos de Veículo (com cache)
      let modelosVeiculo = AppCache.get(AppCache.keys.MODELOS_VEICULO);
      if (!modelosVeiculo) {
        modelosVeiculo = await ModeloVeiculo.findAll({
          include: [{ model: MarcaVeiculo, as: 'marca' }],
          order: [['nome', 'ASC']]
        });
        AppCache.set(AppCache.keys.MODELOS_VEICULO, modelosVeiculo);
      }

      // Obter Marcas de Peça (com cache)
      let marcasPeca = AppCache.get(AppCache.keys.MARCAS_PECA);
      if (!marcasPeca) {
        marcasPeca = await MarcaPeca.findAll({ order: [['nome', 'ASC']] });
        AppCache.set(AppCache.keys.MARCAS_PECA, marcasPeca);
      }

      // Obter Peças (com cache)
      let pecas = AppCache.get(AppCache.keys.PECAS);
      if (!pecas) {
        pecas = await Peca.findAll({
          include: [{ model: MarcaPeca, as: 'marca' }],
          order: [
            [{ model: MarcaPeca, as: 'marca' }, 'nome', 'ASC'],
            ['nome', 'ASC']
          ]
        });
        AppCache.set(AppCache.keys.PECAS, pecas);
      }

      // Obter Oficinas (com cache)
      let oficinas = AppCache.get(AppCache.keys.OFICINAS);
      if (!oficinas) {
        oficinas = await Oficina.findAll({ order: [['nome', 'ASC']] });
        AppCache.set(AppCache.keys.OFICINAS, oficinas);
      }

      // Obter Serviços (com cache)
      let servicos = AppCache.get(AppCache.keys.SERVICOS);
      if (!servicos) {
        servicos = await Servico.findAll({ order: [['nome', 'ASC']] });
        AppCache.set(AppCache.keys.SERVICOS, servicos);
      }

      res.render('cadastros/index', {
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
      tratarErroRequisicao(error, req, res);
    }
  }

  // POST /marcas-veiculo
  public static async criarMarcaVeiculo(req: Request<{}, {}, { nome?: string }>, res: Response): Promise<void> {
    const { nome } = req.body;
    if (!nome) {
      res.redirect('/cadastros?erro=Nome da marca é obrigatório.');
      return;
    }
    try {
      await MarcaVeiculo.create({ nome });
      AppCache.del(AppCache.keys.MARCAS_VEICULO);
      res.redirect('/cadastros?sucesso=Marca de veículo cadastrada!');
    } catch (error) {
      res.redirect('/cadastros?erro=Erro ao cadastrar marca de veículo (pode ser duplicada).');
    }
  }

  // DELETE /marcas-veiculo/:id
  public static async deletarMarcaVeiculo(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const m = await MarcaVeiculo.findByPk(Number(id));
      if (!m) {
        res.redirect('/cadastros?erro=Marca de veículo não encontrada.');
        return;
      }

      const totalModelos = await ModeloVeiculo.count({ where: { marca_veiculo_id: Number(id) } });
      if (totalModelos > 0) {
        res.redirect(`/cadastros?erro=Não é possível excluir a marca "${m.nome}" pois existem ${totalModelos} modelo(s) de veículos vinculados a ela.`);
        return;
      }

      await m.destroy();
      AppCache.del(AppCache.keys.MARCAS_VEICULO);
      res.redirect('/cadastros?sucesso=Marca de veículo excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar marca de veículo:', error);
      res.redirect('/cadastros?erro=Não foi possível excluir a marca: existem registros vinculados.');
    }
  }

  // POST /modelos-veiculo
  public static async criarModeloVeiculo(req: Request<{}, {}, { nome?: string; marca_veiculo_id?: string | number }>, res: Response): Promise<void> {
    const { nome, marca_veiculo_id } = req.body;
    if (!nome || !marca_veiculo_id) {
      res.redirect('/cadastros?erro=Nome e Marca são obrigatórios.');
      return;
    }
    try {
      await ModeloVeiculo.create({ nome, marca_veiculo_id: Number(marca_veiculo_id) });
      AppCache.del(AppCache.keys.MODELOS_VEICULO);
      res.redirect('/cadastros?sucesso=Modelo de veículo cadastrado!');
    } catch (error) {
      res.redirect('/cadastros?erro=Erro ao cadastrar modelo.');
    }
  }

  // DELETE /modelos-veiculo/:id
  public static async deletarModeloVeiculo(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const mod = await ModeloVeiculo.findByPk(Number(id));
      if (!mod) {
        res.redirect('/cadastros?erro=Modelo de veículo não encontrado.');
        return;
      }

      const totalVeiculos = await Veiculo.count({ where: { modelo_id: Number(id) } });
      if (totalVeiculos > 0) {
        res.redirect(`/cadastros?erro=Não é possível excluir o modelo "${mod.nome}" pois existem ${totalVeiculos} veículo(s) cadastrados com este modelo.`);
        return;
      }

      await mod.destroy();
      AppCache.del(AppCache.keys.MODELOS_VEICULO);
      res.redirect('/cadastros?sucesso=Modelo de veículo excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar modelo de veículo:', error);
      res.redirect('/cadastros?erro=Não foi possível excluir o modelo: existem veículos vinculados.');
    }
  }

  // POST /marcas-peca
  public static async criarMarcaPeca(req: Request<{}, {}, { nome?: string }>, res: Response): Promise<void> {
    const { nome } = req.body;
    if (!nome) {
      res.redirect('/cadastros?erro=Nome da marca da peça é obrigatório.');
      return;
    }
    try {
      await MarcaPeca.create({ nome });
      AppCache.del(AppCache.keys.MARCAS_PECA);
      res.redirect('/cadastros?sucesso=Marca de peça cadastrada!');
    } catch (error) {
      res.redirect('/cadastros?erro=Erro ao cadastrar marca de peça.');
    }
  }

  // DELETE /marcas-peca/:id
  public static async deletarMarcaPeca(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const mp = await MarcaPeca.findByPk(Number(id));
      if (!mp) {
        res.redirect('/cadastros?erro=Marca/fabricante de peça não encontrada.');
        return;
      }

      const totalPecas = await Peca.count({ where: { marca_peca_id: Number(id) } });
      if (totalPecas > 0) {
        res.redirect(`/cadastros?erro=Não é possível excluir a fabricante "${mp.nome}" pois existem ${totalPecas} peça(s) cadastradas sob esta marca.`);
        return;
      }

      await mp.destroy();
      AppCache.del(AppCache.keys.MARCAS_PECA);
      res.redirect('/cadastros?sucesso=Marca de peça excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar marca de peça:', error);
      res.redirect('/cadastros?erro=Não foi possível excluir a fabricante: existem peças vinculadas.');
    }
  }

  // POST /pecas
  public static async criarPeca(req: Request<{}, {}, { nome?: string; marca_peca_id?: string | number }>, res: Response): Promise<void> {
    const { nome, marca_peca_id } = req.body;
    if (!nome || !marca_peca_id) {
      res.redirect('/cadastros?erro=Nome e Marca da peça são obrigatórios.');
      return;
    }
    try {
      await Peca.create({ nome, marca_peca_id: Number(marca_peca_id) });
      AppCache.del(AppCache.keys.PECAS);
      res.redirect('/cadastros?sucesso=Peça cadastrada!');
    } catch (error) {
      res.redirect('/cadastros?erro=Erro ao cadastrar peça.');
    }
  }

  // DELETE /pecas/:id
  public static async deletarPeca(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const p = await Peca.findByPk(Number(id));
      if (!p) {
        res.redirect('/cadastros?erro=Peça não encontrada.');
        return;
      }

      const totalTrocas = await RegistroTroca.count({ where: { peca_id: Number(id) } });
      if (totalTrocas > 0) {
        res.redirect(`/cadastros?erro=Não é possível excluir a peça "${p.nome}" pois ela já está vinculada a ${totalTrocas} registro(s) de troca em veículos.`);
        return;
      }

      await p.destroy();
      AppCache.del(AppCache.keys.PECAS);
      res.redirect('/cadastros?sucesso=Peça excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar peça:', error);
      res.redirect('/cadastros?erro=Não foi possível excluir a peça: restrição de integridade no banco de dados.');
    }
  }

  // POST /oficinas
  public static async criarOficina(req: Request<{}, {}, { nome?: string; cnpj?: string; telefone?: string; endereco?: string; email?: string; whatsapp_numero?: string }>, res: Response): Promise<void> {
    const { nome, cnpj, telefone, endereco, email, whatsapp_numero } = req.body;
    if (!nome || !cnpj) {
      res.redirect('/cadastros?erro=Nome e CNPJ da oficina são obrigatórios.');
      return;
    }
    try {
      await Oficina.create({ nome, cnpj, telefone, endereco, email, whatsapp_numero });
      AppCache.del(AppCache.keys.OFICINAS);
      res.redirect('/cadastros?sucesso=Oficina cadastrada!');
    } catch (error) {
      res.redirect('/cadastros?erro=Erro ao cadastrar oficina (CNPJ duplicado).');
    }
  }

  // DELETE /oficinas/:id
  public static async deletarOficina(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const o = await Oficina.findByPk(Number(id));
      if (!o) {
        res.redirect('/cadastros?erro=Oficina não encontrada.');
        return;
      }

      const [totalTrocas, totalServicos] = await Promise.all([
        RegistroTroca.count({ where: { oficina_id: Number(id) } }),
        RegistroServico.count({ where: { oficina_id: Number(id) } })
      ]);

      if (totalTrocas > 0 || totalServicos > 0) {
        res.redirect(`/cadastros?erro=Não é possível excluir a oficina "${o.nome}" pois existem serviços ou trocas de peças vinculados a ela.`);
        return;
      }

      await o.destroy();
      AppCache.del(AppCache.keys.OFICINAS);
      res.redirect('/cadastros?sucesso=Oficina excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar oficina:', error);
      res.redirect('/cadastros?erro=Não foi possível excluir a oficina: existem registros vinculados.');
    }
  }

  // POST /servicos
  public static async criarServico(req: Request<{}, {}, { nome?: string; descricao?: string; categoria?: string; preco_padrao?: string | number }>, res: Response): Promise<void> {
    const { nome, descricao, categoria, preco_padrao } = req.body;
    if (!nome) {
      res.redirect('/cadastros?erro=Nome do serviço é obrigatório.');
      return;
    }
    try {
      await Servico.create({
        nome,
        descricao: descricao || null,
        categoria: categoria || 'Geral',
        preco_padrao: preco_padrao ? parseFloat(String(preco_padrao)) : null
      });
      AppCache.del(AppCache.keys.SERVICOS);
      res.redirect('/cadastros?sucesso=Serviço cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar serviço:', error);
      res.redirect('/cadastros?erro=Erro ao cadastrar serviço (pode ser nome duplicado).');
    }
  }

  // PUT /servicos/:id
  public static async editarServico(req: Request<{ id: string }, {}, { nome?: string; descricao?: string; categoria?: string; preco_padrao?: string | number }>, res: Response): Promise<void> {
    const { id } = req.params;
    const { nome, descricao, categoria, preco_padrao } = req.body;
    try {
      const s = await Servico.findByPk(Number(id));
      if (!s) {
        res.redirect('/cadastros?erro=Serviço não encontrado.');
        return;
      }

      await s.update({
        nome: nome || s.nome,
        descricao: descricao !== undefined ? descricao : s.descricao,
        categoria: categoria || s.categoria,
        preco_padrao: preco_padrao ? parseFloat(String(preco_padrao)) : null
      });

      AppCache.del(AppCache.keys.SERVICOS);
      res.redirect('/cadastros?sucesso=Serviço atualizado!');
    } catch (error) {
      console.error('Erro ao editar serviço:', error);
      res.redirect('/cadastros?erro=Erro ao atualizar serviço.');
    }
  }

  // DELETE /servicos/:id
  public static async deletarServico(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const s = await Servico.findByPk(Number(id));
      if (!s) {
        res.redirect('/cadastros?erro=Serviço não encontrado.');
        return;
      }

      const [totalRegServicos, totalAgendamentos] = await Promise.all([
        RegistroServico.count({ where: { servico_id: Number(id) } }),
        Agendamento.count({ where: { servico_id: Number(id) } })
      ]);

      if (totalRegServicos > 0 || totalAgendamentos > 0) {
        const motivos = [];
        if (totalRegServicos > 0) motivos.push(`${totalRegServicos} registro(s) de serviço`);
        if (totalAgendamentos > 0) motivos.push(`${totalAgendamentos} agendamento(s)`);
        res.redirect(`/cadastros?erro=Não é possível excluir o serviço "${s.nome}" pois existem ${motivos.join(' e ')} vinculados a ele.`);
        return;
      }

      await s.destroy();
      AppCache.del(AppCache.keys.SERVICOS);
      res.redirect('/cadastros?sucesso=Serviço excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      res.redirect('/cadastros?erro=Não é possível excluir serviço associado a históricos.');
    }
  }
}

export default CadastroBaseController;

// Compatibilidade CommonJS
module.exports = CadastroBaseController;
