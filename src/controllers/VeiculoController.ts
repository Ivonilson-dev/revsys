import { Request, Response } from 'express';
import { WhereOptions } from 'sequelize';
import { 
  Veiculo, 
  Cliente, 
  Usuario, 
  ModeloVeiculo, 
  MarcaVeiculo, 
  RegistroTroca, 
  Peca, 
  MarcaPeca, 
  Agendamento, 
  Oficina, 
  RegistroServico, 
  Servico 
} from '../../models';
import { VeiculoAttributes } from '../../models/Veiculo';
import { calcularStatusAlerta } from '../utils/alertas';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';

export interface ICadastroVeiculoBody {
  placa?: string;
  modelo_id?: string | number;
  cliente_id?: string | number;
  ano?: string | number;
  cor?: string;
  km_atual?: string | number;
  condicao?: 'novo' | 'usado';
}

export interface IEdicaoVeiculoBody {
  placa?: string;
  modelo_id?: string | number;
  ano?: string | number;
  cor?: string;
  km_atual?: string | number;
  condicao?: 'novo' | 'usado';
}

export class VeiculoController {
  /**
   * GET /veiculos
   * Lista veículos com busca opcional por placa
   */
  public static async listar(req: Request<{}, {}, {}, { busca?: string; erro?: string; sucesso?: string }>, res: Response): Promise<void> {
    const { busca } = req.query;
    let whereClause: WhereOptions<VeiculoAttributes> = {};

    try {
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

      if (busca && veiculos.length === 1) {
        res.redirect(`/veiculos/${veiculos[0].id}`);
        return;
      }

      res.render('veiculos/index', {
        titulo: 'Gerenciamento de Veículos',
        veiculos,
        busca: busca || '',
        erro: req.query.erro || null,
        sucessoMsg: req.query.sucesso || null
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /veiculos/novo
   * Exibe formulário de cadastro de veículo
   */
  public static async exibirCadastro(req: Request<{}, {}, {}, { cliente_id?: string }>, res: Response): Promise<void> {
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

      res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        clientes,
        marcas,
        modelos,
        clienteId: clienteId || '',
        erro: null,
        dados: {}
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * POST /veiculos
   * Cadastra um novo veículo
   */
  public static async cadastrar(req: Request<{}, {}, ICadastroVeiculoBody>, res: Response): Promise<void> {
    const { placa, modelo_id, cliente_id, ano, cor, km_atual, condicao } = req.body;
    
    const dadosForm = { placa, modelo_id, cliente_id, ano, cor, km_atual, condicao };

    if (!placa || !modelo_id || !cliente_id || ano === undefined || !cor || km_atual === undefined || !condicao) {
      res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        erro: 'Por favor, preencha todos os campos obrigatórios.',
        dados: dadosForm,
        clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
        marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
        modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
        clienteId: cliente_id
      });
      return;
    }

    // Validação da Placa
    const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

    if (!placaRegex.test(placaLimpa)) {
      res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        erro: 'Formato de placa inválido (deve ser padrão antigo AAA-9999 ou Mercosul AAA9A99).',
        dados: dadosForm,
        clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
        marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
        modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
        clienteId: cliente_id
      });
      return;
    }

    const anoInt = parseInt(String(ano), 10);
    const anoMax = new Date().getFullYear() + 1;
    if (isNaN(anoInt) || anoInt < 1900 || anoInt > anoMax) {
      res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        erro: `O ano de fabricação deve estar entre 1900 e ${anoMax}.`,
        dados: dadosForm,
        clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
        marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
        modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
        clienteId: cliente_id
      });
      return;
    }

    const kmInt = parseInt(String(km_atual), 10);
    if (isNaN(kmInt) || kmInt < 0) {
      res.render('veiculos/novo', {
        titulo: 'Cadastrar Veículo',
        erro: 'A quilometragem atual não pode ser negativa.',
        dados: dadosForm,
        clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
        marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
        modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
        clienteId: cliente_id
      });
      return;
    }

    try {
      const veiculoExistente = await Veiculo.findOne({ where: { placa: placaLimpa } });
      if (veiculoExistente) {
        res.render('veiculos/novo', {
          titulo: 'Cadastrar Veículo',
          erro: 'Este veículo (placa) já está cadastrado no sistema.',
          dados: dadosForm,
          clientes: await Cliente.findAll({ include: [{ model: Usuario, as: 'usuario' }] }),
          marcas: await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] }),
          modelos: await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] }),
          clienteId: cliente_id
        });
        return;
      }

      const novoVeiculo = await Veiculo.create({
        placa: placaLimpa,
        modelo_id: Number(modelo_id),
        cliente_id: Number(cliente_id),
        ano: anoInt,
        cor,
        km_atual: kmInt,
        condicao: condicao as 'novo' | 'usado'
      });

      res.redirect(`/veiculos/${novoVeiculo.id}?sucesso=Veículo cadastrado com sucesso!`);
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /veiculos/:id
   * Exibe ficha do veículo com histórico de trocas e revisões
   */
  public static async exibirDetalhes(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    const sucesso = req.query.sucesso;

    try {
      const veiculo = await Veiculo.findByPk(Number(id), {
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
        res.status(404).send('Veículo não encontrado');
        return;
      }

      const historicoTrocas = await RegistroTroca.findAll({
        where: { veiculo_id: Number(id) },
        include: [
          { model: Peca, as: 'peca', include: [{ model: MarcaPeca, as: 'marca' }] },
          { model: Oficina, as: 'oficina' }
        ],
        order: [['data_troca', 'DESC'], ['id', 'DESC']]
      });

      const historicoServicos = await RegistroServico.findAll({
        where: { veiculo_id: Number(id) },
        include: [
          { model: Servico, as: 'servico' },
          { model: Oficina, as: 'oficina' }
        ],
        order: [['data_servico', 'DESC'], ['id', 'DESC']]
      });

      const ultimasTrocas: Record<number, RegistroTroca> = {};
      historicoTrocas.forEach((troca: RegistroTroca) => {
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

      const agendamentos = await Agendamento.findAll({
        where: { veiculo_id: Number(id) },
        include: [{ model: Usuario, as: 'criador' }, { model: Servico, as: 'servico' }],
        order: [['data_agendada', 'DESC'], ['horario_agendado', 'DESC']]
      });

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

      res.render('veiculos/detalhes', {
        titulo: `Veículo: ${veiculo.placa}`,
        veiculo,
        historicoTrocas,
        historicoServicos,
        alertasPecas,
        agendamentos,
        pecas,
        servicos,
        oficinas,
        erro: req.query.erro || null,
        sucesso
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * GET /veiculos/:id/editar
   * Exibe formulário para editar dados do veículo
   */
  public static async exibirEdicao(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const veiculo = await Veiculo.findByPk(Number(id), {
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: ModeloVeiculo, as: 'modelo' }
        ]
      });

      if (!veiculo) {
        res.status(404).send('Veículo não encontrado');
        return;
      }

      const marcas = await MarcaVeiculo.findAll({
        order: [['nome', 'ASC']]
      });

      const modelos = await ModeloVeiculo.findAll({
        include: [{ model: MarcaVeiculo, as: 'marca' }],
        order: [['nome', 'ASC']]
      });

      res.render('veiculos/editar', {
        titulo: `Editar Veículo: ${veiculo.placa}`,
        veiculo,
        marcas,
        modelos,
        erro: null
      });
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * PUT /veiculos/:id
   * Atualiza dados do veículo com validação anti-regressão de KM
   */
  public static async editar(req: Request<{ id: string }, {}, IEdicaoVeiculoBody>, res: Response): Promise<void> {
    const { id } = req.params;
    const { placa, modelo_id, ano, cor, km_atual, condicao } = req.body;

    const placaLimpa = (placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

    try {
      const veiculo = await Veiculo.findByPk(Number(id));
      if (!veiculo) {
        res.status(404).send('Veículo não encontrado');
        return;
      }

      const anoInt = parseInt(String(ano), 10);
      const anoMax = new Date().getFullYear() + 1;
      if (isNaN(anoInt) || anoInt < 1900 || anoInt > anoMax) {
        const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
        res.render('veiculos/editar', {
          titulo: `Editar Veículo: ${veiculo.placa}`,
          veiculo,
          marcas,
          modelos,
          erro: `O ano de fabricação deve estar entre 1900 e ${anoMax}.`
        });
        return;
      }

      const kmInt = parseInt(String(km_atual), 10);
      if (isNaN(kmInt) || kmInt < 0) {
        const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
        res.render('veiculos/editar', {
          titulo: `Editar Veículo: ${veiculo.placa}`,
          veiculo,
          marcas,
          modelos,
          erro: 'A quilometragem atual não pode ser negativa.'
        });
        return;
      }

      // Validação anti-regressão de KM: Não permitir KM menor que o maior registro do histórico
      const [maxTroca, maxServico] = await Promise.all([
        RegistroTroca.max('km_na_troca', { where: { veiculo_id: Number(id) } }),
        RegistroServico.max('km_no_servico', { where: { veiculo_id: Number(id) } })
      ]);
      const maxHistoricoKm = Math.max(Number(maxTroca) || 0, Number(maxServico) || 0);

      if (kmInt < maxHistoricoKm) {
        const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
        res.render('veiculos/editar', {
          titulo: `Editar Veículo: ${veiculo.placa}`,
          veiculo,
          marcas,
          modelos,
          erro: `A quilometragem informada (${kmInt.toLocaleString('pt-BR')} km) não pode ser inferior ao maior registro histórico de manutenção deste veículo (${maxHistoricoKm.toLocaleString('pt-BR')} km).`
        });
        return;
      }

      // Validar placa única se mudou
      if (placaLimpa && placaLimpa !== veiculo.placa) {
        const veiculoExistente = await Veiculo.findOne({ where: { placa: placaLimpa } });
        if (veiculoExistente) {
          const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
          const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
          res.render('veiculos/editar', {
            titulo: `Editar Veículo: ${veiculo.placa}`,
            veiculo,
            marcas,
            modelos,
            erro: 'Esta placa já está cadastrada em outro veículo.'
          });
          return;
        }
      }

      await veiculo.update({
        placa: placaLimpa || veiculo.placa,
        modelo_id: modelo_id ? Number(modelo_id) : veiculo.modelo_id,
        ano: anoInt,
        cor: cor || veiculo.cor,
        km_atual: kmInt,
        condicao: condicao ? (condicao as 'novo' | 'usado') : veiculo.condicao
      });

      res.redirect(`/veiculos/${veiculo.id}?sucesso=Veículo atualizado com sucesso!`);
    } catch (error) {
      tratarErroRequisicao(error, req, res);
    }
  }

  /**
   * DELETE /veiculos/:id
   * Exclui veículo se não houver histórico de manutenção vinculado
   */
  public static async deletar(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const veiculo = await Veiculo.findByPk(Number(id));
      if (!veiculo) {
        res.redirect('/veiculos?erro=Veículo não encontrado.');
        return;
      }

      const clienteId = veiculo.cliente_id;

      const [totalTrocas, totalServicos, totalAgendamentos] = await Promise.all([
        RegistroTroca.count({ where: { veiculo_id: Number(id) } }),
        RegistroServico.count({ where: { veiculo_id: Number(id) } }),
        Agendamento.count({ where: { veiculo_id: Number(id) } })
      ]);

      if (totalTrocas > 0 || totalServicos > 0 || totalAgendamentos > 0) {
        const motivos = [];
        if (totalTrocas > 0) motivos.push(`${totalTrocas} registro(s) de troca de peça`);
        if (totalServicos > 0) motivos.push(`${totalServicos} serviço(s) executado(s)`);
        if (totalAgendamentos > 0) motivos.push(`${totalAgendamentos} agendamento(s)`);
        res.redirect(`/veiculos/${id}?erro=Não é possível excluir este veículo pois existem ${motivos.join(', ')} vinculados ao seu histórico.`);
        return;
      }

      await veiculo.destroy();

      res.redirect(`/clientes/${clienteId}?sucesso=Veículo removido com sucesso!`);
    } catch (error) {
      console.error('Erro ao deletar veículo:', error);
      if (isDatabaseConnectionError(error)) {
        tratarErroRequisicao(error, req, res);
        return;
      }
      res.redirect(`/veiculos/${id}?erro=Não foi possível excluir o veículo: restrição de integridade no banco de dados.`);
    }
  }
}

export default VeiculoController;

// Compatibilidade CommonJS
module.exports = VeiculoController;
