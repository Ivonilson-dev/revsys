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
  Agendamento,
  Usuario,
  NivelAcesso
} from '../../models';
import bcrypt from 'bcryptjs';
import AppCache from '../utils/cache';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';
import AuditoriaService from '../services/AuditoriaService';

export class CadastroBaseController {
  /**
   * GET /cadastros
   * Exibe visão unificada das tabelas auxiliares
   */
  public static async exibirPainelCadastros(req: Request, res: Response): Promise<void> {
    try {
      // Obter Marcas de Veículo (com cache)
      let marcasVeiculo = AppCache.get<MarcaVeiculo[]>(AppCache.keys.MARCAS_VEICULO);
      if (!marcasVeiculo) {
        marcasVeiculo = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        AppCache.set(AppCache.keys.MARCAS_VEICULO, marcasVeiculo);
      }

      // Obter Modelos de Veículo (com cache)
      let modelosVeiculo = AppCache.get<ModeloVeiculo[]>(AppCache.keys.MODELOS_VEICULO);
      if (!modelosVeiculo) {
        modelosVeiculo = await ModeloVeiculo.findAll({
          include: [{ model: MarcaVeiculo, as: 'marca' }],
          order: [['nome', 'ASC']]
        });
        AppCache.set(AppCache.keys.MODELOS_VEICULO, modelosVeiculo);
      }

      // Obter Marcas de Peça (com cache)
      let marcasPeca = AppCache.get<MarcaPeca[]>(AppCache.keys.MARCAS_PECA);
      if (!marcasPeca) {
        marcasPeca = await MarcaPeca.findAll({ order: [['nome', 'ASC']] });
        AppCache.set(AppCache.keys.MARCAS_PECA, marcasPeca);
      }

      // Obter Peças (com cache)
      let pecas = AppCache.get<Peca[]>(AppCache.keys.PECAS);
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
      let oficinas = AppCache.get<Oficina[]>(AppCache.keys.OFICINAS);
      if (!oficinas) {
        oficinas = await Oficina.findAll({ order: [['nome', 'ASC']] });
        AppCache.set(AppCache.keys.OFICINAS, oficinas);
      }

      // Obter Serviços (com cache)
      let servicos = AppCache.get<Servico[]>(AppCache.keys.SERVICOS);
      if (!servicos) {
        servicos = await Servico.findAll({ order: [['nome', 'ASC']] });
        AppCache.set(AppCache.keys.SERVICOS, servicos);
      }

      // Se for administrador, obter lista de níveis de acesso e usuários do sistema
      let niveisAcesso: NivelAcesso[] = [];
      let usuariosSistema: Usuario[] = [];
      const ehAdmin = req.session.usuario && req.session.usuario.papel === 'admin';

      if (ehAdmin) {
        niveisAcesso = await NivelAcesso.findAll({
          order: [['titulo', 'ASC']]
        });

        usuariosSistema = await Usuario.findAll({
          include: [{ model: NivelAcesso, as: 'nivel_acesso' }],
          order: [['nome', 'ASC']]
        });
      }

      // Ordenação alfabética natural (pt-BR) garantida para todas as seções (Regra 3 / RF-02)
      marcasVeiculo = [...marcasVeiculo].sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      );

      modelosVeiculo = [...modelosVeiculo].sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      );

      marcasPeca = [...marcasPeca].sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      );

      pecas = [...pecas].sort((a, b) => {
        const marcaA = a.marca ? a.marca.nome : '';
        const marcaB = b.marca ? b.marca.nome : '';
        const compMarca = marcaA.localeCompare(marcaB, 'pt-BR', { sensitivity: 'base' });
        if (compMarca !== 0) return compMarca;
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' });
      });

      oficinas = [...oficinas].sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      );

      servicos = [...servicos].sort((a, b) => 
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      );

      if (ehAdmin) {
        niveisAcesso = [...niveisAcesso].sort((a, b) => 
          (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR', { sensitivity: 'base' })
        );

        usuariosSistema = [...usuariosSistema].sort((a, b) => 
          (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
        );
      }

      res.render('cadastros/index', {
        titulo: 'Tabelas Auxiliares',
        marcasVeiculo,
        modelosVeiculo,
        marcasPeca,
        pecas,
        oficinas,
        servicos,
        niveisAcesso,
        usuariosSistema,
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
      const novaMarca = await MarcaVeiculo.create({ nome });
      AppCache.del(AppCache.keys.MARCAS_VEICULO);

      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'Marcas de Veículo',
        registro_id: novaMarca.id,
        descricao: `Cadastrou a marca de veículo "${nome}".`,
        dados_novos: { nome }
      });

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

      const nomeMarca = m.nome;
      await m.destroy();
      AppCache.del(AppCache.keys.MARCAS_VEICULO);

      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'Marcas de Veículo',
        registro_id: id,
        descricao: `Excluiu a marca de veículo "${nomeMarca}" (ID: ${id}).`
      });

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
      const novoModelo = await ModeloVeiculo.create({ nome, marca_veiculo_id: Number(marca_veiculo_id) });
      AppCache.del(AppCache.keys.MODELOS_VEICULO);

      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'Modelos de Veículo',
        registro_id: novoModelo.id,
        descricao: `Cadastrou o modelo de veículo "${nome}".`,
        dados_novos: { nome, marca_veiculo_id }
      });

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

      const nomeModelo = mod.nome;
      await mod.destroy();
      AppCache.del(AppCache.keys.MODELOS_VEICULO);

      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'Modelos de Veículo',
        registro_id: id,
        descricao: `Excluiu o modelo de veículo "${nomeModelo}" (ID: ${id}).`
      });

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
      const novaMarcaPeca = await MarcaPeca.create({ nome });
      AppCache.del(AppCache.keys.MARCAS_PECA);

      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'Marcas de Peça',
        registro_id: novaMarcaPeca.id,
        descricao: `Cadastrou o fabricante/marca de peça "${nome}".`,
        dados_novos: { nome }
      });

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

      const nomeMarcaPeca = mp.nome;
      await mp.destroy();
      AppCache.del(AppCache.keys.MARCAS_PECA);

      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'Marcas de Peça',
        registro_id: id,
        descricao: `Excluiu a marca/fabricante de peça "${nomeMarcaPeca}" (ID: ${id}).`
      });

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
      const novaPeca = await Peca.create({ nome, marca_peca_id: Number(marca_peca_id) });
      AppCache.del(AppCache.keys.PECAS);

      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'Peças',
        registro_id: novaPeca.id,
        descricao: `Cadastrou a peça "${nome}".`,
        dados_novos: { nome, marca_peca_id }
      });

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

      const nomePeca = p.nome;
      await p.destroy();
      AppCache.del(AppCache.keys.PECAS);

      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'Peças',
        registro_id: id,
        descricao: `Excluiu a peça "${nomePeca}" (ID: ${id}).`
      });

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
      const novaOficina = await Oficina.create({ nome, cnpj, telefone, endereco, email, whatsapp_numero });
      AppCache.del(AppCache.keys.OFICINAS);

      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'Oficinas',
        registro_id: novaOficina.id,
        descricao: `Cadastrou a oficina "${nome}" (CNPJ: ${cnpj}).`,
        dados_novos: { nome, cnpj, telefone, endereco, email, whatsapp_numero }
      });

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

      const nomeOficina = o.nome;
      await o.destroy();
      AppCache.del(AppCache.keys.OFICINAS);

      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'Oficinas',
        registro_id: id,
        descricao: `Excluiu a oficina parceira "${nomeOficina}" (ID: ${id}).`
      });

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
      const novoServico = await Servico.create({
        nome,
        descricao: descricao || null,
        categoria: categoria || 'Geral',
        preco_padrao: preco_padrao ? parseFloat(String(preco_padrao)) : null
      });
      AppCache.del(AppCache.keys.SERVICOS);

      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'Catálogo de Serviços',
        registro_id: novoServico.id,
        descricao: `Cadastrou o serviço "${nome}" no catálogo (Categoria: ${categoria || 'Geral'}).`,
        dados_novos: { nome, descricao, categoria, preco_padrao }
      });

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

      const dadosAnt = {
        nome: s.nome,
        descricao: s.descricao,
        categoria: s.categoria,
        preco_padrao: s.preco_padrao
      };

      await s.update({
        nome: nome || s.nome,
        descricao: descricao !== undefined ? descricao : s.descricao,
        categoria: categoria || s.categoria,
        preco_padrao: preco_padrao ? parseFloat(String(preco_padrao)) : null
      });

      AppCache.del(AppCache.keys.SERVICOS);

      await AuditoriaService.registrar({
        req,
        acao: 'ATUALIZAR',
        recurso: 'Catálogo de Serviços',
        registro_id: s.id,
        descricao: `Atualizou os dados do serviço "${s.nome}" no catálogo.`,
        dados_anteriores: dadosAnt,
        dados_novos: { nome, descricao, categoria, preco_padrao }
      });

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

      const nomeServico = s.nome;
      await s.destroy();
      AppCache.del(AppCache.keys.SERVICOS);

      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'Catálogo de Serviços',
        registro_id: id,
        descricao: `Excluiu o serviço "${nomeServico}" (ID: ${id}) do catálogo.`
      });

      res.redirect('/cadastros?sucesso=Serviço excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      res.redirect('/cadastros?erro=Não é possível excluir serviço associado a históricos.');
    }
  }

  /**
   * POST /usuarios
   * Cria um novo usuário do sistema com nível de acesso customizado (Exclusivo Administrador)
   */
  public static async criarUsuario(
    req: Request<{}, {}, { 
      nome?: string; 
      email?: string; 
      senha?: string; 
      confirmar_senha?: string; 
      nivel_acesso_id?: string | number 
    }>, 
    res: Response
  ): Promise<void> {
    const { nome, email, senha, confirmar_senha, nivel_acesso_id } = req.body;

    if (!nome || !email || !senha || !confirmar_senha || !nivel_acesso_id) {
      res.redirect('/cadastros?erro=Todos os campos do usuário são obrigatórios.#usuarios-sistema');
      return;
    }

    if (senha.length < 6) {
      res.redirect('/cadastros?erro=A senha deve conter no mínimo 6 caracteres.#usuarios-sistema');
      return;
    }

    if (senha !== confirmar_senha) {
      res.redirect('/cadastros?erro=A confirmação de senha não confere com a senha informada.#usuarios-sistema');
      return;
    }

    try {
      const emailNormalizado = email.trim().toLowerCase();

      // 1. Verificar duplicidade de e-mail
      const usuarioExistente = await Usuario.findOne({ where: { email: emailNormalizado } });
      if (usuarioExistente) {
        res.redirect('/cadastros?erro=Este endereço de e-mail já está cadastrado no sistema.#usuarios-sistema');
        return;
      }

      // 2. Verificar nível de acesso selecionado
      const nivelAcesso = await NivelAcesso.findByPk(Number(nivel_acesso_id));
      if (!nivelAcesso) {
        res.redirect('/cadastros?erro=Nível de acesso selecionado é inválido.#usuarios-sistema');
        return;
      }

      // 3. Hashear a senha com bcrypt
      const senhaHasheada = await bcrypt.hash(senha, 10);

      // 4. Criar o usuário
      const novoUsuario = await Usuario.create({
        nome: nome.trim(),
        email: emailNormalizado,
        senha_hash: senhaHasheada,
        papel: nivelAcesso.nome,
        nivel_acesso_id: nivelAcesso.id
      });

      // 5. Registrar na trilha de auditoria
      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'usuarios',
        registro_id: novoUsuario.id,
        descricao: `Cadastrou o usuário do sistema "${novoUsuario.nome}" (${novoUsuario.email}) com o nível de acesso "${nivelAcesso.titulo}".`,
        dados_novos: {
          id: novoUsuario.id,
          nome: novoUsuario.nome,
          email: novoUsuario.email,
          papel: novoUsuario.papel,
          nivel_acesso_id: novoUsuario.nivel_acesso_id
        }
      });

      res.redirect(`/cadastros?sucesso=Usuário "${novoUsuario.nome}" cadastrado com sucesso como ${nivelAcesso.titulo}!#usuarios-sistema`);
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      res.redirect('/cadastros?erro=Ocorreu um erro ao cadastrar o usuário no sistema.#usuarios-sistema');
    }
  }

  /**
   * DELETE /usuarios/:id
   * Exclui um usuário do sistema (Exclusivo Administrador)
   */
  public static async deletarUsuario(req: Request<{ id: string }>, res: Response): Promise<void> {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.redirect('/cadastros?erro=ID de usuário inválido.#usuarios-sistema');
      return;
    }

    // Proteção contra auto-exclusão
    if (req.session.usuario && req.session.usuario.id === id) {
      res.redirect('/cadastros?erro=Não é permitido excluir o seu próprio usuário logado.#usuarios-sistema');
      return;
    }

    try {
      const usuario = await Usuario.findByPk(id, {
        include: [{ model: NivelAcesso, as: 'nivel_acesso' }]
      });

      if (!usuario) {
        res.redirect('/cadastros?erro=Usuário não localizado no sistema.#usuarios-sistema');
        return;
      }

      // Proteção para o usuário root/principal
      if (usuario.id === 1 && usuario.email === 'admin@revsys.com') {
        res.redirect('/cadastros?erro=O usuário administrador principal do sistema não pode ser removido.#usuarios-sistema');
        return;
      }

      // Verificar vínculos impeditivos (ex: agendamentos criados)
      const agendamentosVinculados = await Agendamento.count({ where: { criado_por: id } });
      if (agendamentosVinculados > 0) {
        res.redirect(`/cadastros?erro=Não é possível excluir o usuário "${usuario.nome}" pois existem ${agendamentosVinculados} agendamento(s) vinculados ao seu registro.#usuarios-sistema`);
        return;
      }

      const nomeExcluido = usuario.nome;
      const emailExcluido = usuario.email;
      const papelExcluido = usuario.papel;

      await usuario.destroy();

      // Registrar na trilha de auditoria
      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'usuarios',
        registro_id: id,
        descricao: `Excluiu o usuário do sistema "${nomeExcluido}" (${emailExcluido}) com perfil ${papelExcluido}.`,
        dados_anteriores: {
          id,
          nome: nomeExcluido,
          email: emailExcluido,
          papel: papelExcluido
        }
      });

      res.redirect(`/cadastros?sucesso=Usuário "${nomeExcluido}" excluído com sucesso!#usuarios-sistema`);
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.redirect('/cadastros?erro=Não foi possível excluir o usuário selecionado devido a dependências no banco de dados.#usuarios-sistema');
    }
  }
}

export default CadastroBaseController;

// Compatibilidade CommonJS
module.exports = CadastroBaseController;
