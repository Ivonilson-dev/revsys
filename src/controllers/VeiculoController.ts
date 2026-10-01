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
import { TipoAcaoAuditoria } from '../../models/LogAuditoria';
import { calcularStatusAlerta } from '../utils/alertas';
import { isDatabaseConnectionError, tratarErroRequisicao } from '../utils/erros';
import AuditoriaService from '../services/AuditoriaService';

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
  ativo?: string | boolean;
  motivo_inativacao_opcao?: string;
  motivo_inativacao_outro?: string;
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

      // Registro de Auditoria
      await AuditoriaService.registrar({
        req,
        acao: 'CRIAR',
        recurso: 'Veículos',
        registro_id: novoVeiculo.id,
        descricao: `Cadastrou o veículo placa ${novoVeiculo.placa} (Ano ${novoVeiculo.ano}, Cor ${novoVeiculo.cor}, ${novoVeiculo.km_atual.toLocaleString('pt-BR')} km).`,
        dados_novos: { placa: novoVeiculo.placa, modelo_id, cliente_id, ano: anoInt, cor, km_atual: kmInt, condicao }
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
          { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }
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
    const { 
      placa, modelo_id, ano, cor, km_atual, condicao,
      ativo, motivo_inativacao_opcao, motivo_inativacao_outro 
    } = req.body;

    const placaLimpa = (placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

    try {
      const veiculo = await Veiculo.findByPk(Number(id), {
        include: [
          { model: Cliente, as: 'cliente', include: [{ model: Usuario, as: 'usuario' }] },
          { model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }
        ]
      });
      if (!veiculo) {
        res.status(404).send('Veículo não encontrado');
        return;
      }

      const veiculoParaExibir = {
        ...veiculo.toJSON(),
        cliente: veiculo.cliente,
        modelo: veiculo.modelo,
        modelo_id: modelo_id ? Number(modelo_id) : veiculo.modelo_id,
        placa: placaLimpa || veiculo.placa,
        ano: ano !== undefined && !isNaN(Number(ano)) ? Number(ano) : veiculo.ano,
        cor: cor || veiculo.cor,
        km_atual: km_atual !== undefined && !isNaN(Number(km_atual)) ? Number(km_atual) : veiculo.km_atual,
        condicao: (condicao as any) || veiculo.condicao,
        ativo: ativo !== undefined ? (ativo === '1' || ativo === 'true' || ativo === true) : veiculo.ativo,
        motivo_inativacao: motivo_inativacao_opcao === 'Outros' 
          ? `Outros: ${motivo_inativacao_outro || ''}` 
          : (motivo_inativacao_opcao || veiculo.motivo_inativacao)
      };

      const anoInt = parseInt(String(ano), 10);
      const anoMax = new Date().getFullYear() + 1;
      if (isNaN(anoInt) || anoInt < 1900 || anoInt > anoMax) {
        const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
        const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
        res.status(422).render('veiculos/editar', {
          titulo: `Editar Veículo: ${veiculo.placa}`,
          veiculo: veiculoParaExibir,
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
        res.status(422).render('veiculos/editar', {
          titulo: `Editar Veículo: ${veiculo.placa}`,
          veiculo: veiculoParaExibir,
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
        res.status(422).render('veiculos/editar', {
          titulo: `Editar Veículo: ${veiculo.placa}`,
          veiculo: veiculoParaExibir,
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
          res.status(422).render('veiculos/editar', {
            titulo: `Editar Veículo: ${veiculo.placa}`,
            veiculo: veiculoParaExibir,
            marcas,
            modelos,
            erro: 'Esta placa já está cadastrada em outro veículo.'
          });
          return;
        }
      }

      // Processar Status Ativo / Inativo
      const querInativar = ativo !== undefined && (ativo === '0' || ativo === false || ativo === 'false' || ativo === 'inativo');
      const querReativar = ativo !== undefined && (ativo === '1' || ativo === true || ativo === 'true' || ativo === 'ativo');

      let novoAtivo = veiculo.ativo;
      let novoMotivoInativacao = veiculo.motivo_inativacao;
      let novoInativadoEm = veiculo.inativado_em;
      let acaoAuditoria: TipoAcaoAuditoria = 'ATUALIZAR';
      let descricaoAuditoria = `Atualizou os dados do veículo placa ${veiculo.placa} (Hodômetro: ${veiculo.km_atual.toLocaleString('pt-BR')} km).`;

      if (querInativar && veiculo.ativo) {
        // REGRA DE OURO: Só é possível inativar se não houver agendamentos pendentes
        const agendamentosPendentes = await Agendamento.findAll({
          where: {
            veiculo_id: veiculo.id,
            status: 'agendado'
          },
          order: [['data_agendada', 'ASC'], ['horario_agendado', 'ASC']]
        });

        if (agendamentosPendentes.length > 0) {
          const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
          const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
          const pendenciasFormatadas = agendamentosPendentes.map(a => ({
            id: a.id,
            data: a.data_agendada ? new Date(a.data_agendada).toLocaleDateString('pt-BR') : '',
            horario: a.horario_agendado || '',
            motivo: a.motivo_revisao || 'Revisão / Manutenção Geral'
          }));

          res.status(422).render('veiculos/editar', {
            titulo: `Editar Veículo: ${veiculo.placa}`,
            veiculo: veiculoParaExibir,
            marcas,
            modelos,
            pendenciasAgendamentos: pendenciasFormatadas,
            erro: `Não é possível inativar este veículo: existe(m) ${agendamentosPendentes.length} agendamento(s) com status "Agendado" marcado(s) para ele. Conclua ou cancele todos os agendamentos antes de inativar.`
          });
          return;
        }

        // Validação estrita do motivo da inativação
        const opcao = (motivo_inativacao_opcao || '').trim();
        if (!opcao) {
          const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
          const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
          res.status(422).render('veiculos/editar', {
            titulo: `Editar Veículo: ${veiculo.placa}`,
            veiculo: veiculoParaExibir,
            marcas,
            modelos,
            erro: 'Para inativar o veículo, é obrigatório selecionar o motivo da inativação.'
          });
          return;
        }

        let motivoFinal = opcao;
        if (opcao === 'Outros') {
          const outroTexto = (motivo_inativacao_outro || '').trim();
          if (!outroTexto) {
            const marcas = await MarcaVeiculo.findAll({ order: [['nome', 'ASC']] });
            const modelos = await ModeloVeiculo.findAll({ include: [{ model: MarcaVeiculo, as: 'marca' }], order: [['nome', 'ASC']] });
            res.status(422).render('veiculos/editar', {
              titulo: `Editar Veículo: ${veiculo.placa}`,
              veiculo: veiculoParaExibir,
              marcas,
              modelos,
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
        descricaoAuditoria = `Inativou o veículo placa ${veiculo.placa} (Motivo: ${motivoFinal}).`;
      } else if (querReativar && !veiculo.ativo) {
        novoAtivo = true;
        novoMotivoInativacao = null;
        novoInativadoEm = null;
        acaoAuditoria = 'REATIVAR';
        descricaoAuditoria = `Reativou o veículo placa ${veiculo.placa}.`;
      }

      const dadosAnt = {
        placa: veiculo.placa,
        modelo_id: veiculo.modelo_id,
        ano: veiculo.ano,
        cor: veiculo.cor,
        km_atual: veiculo.km_atual,
        condicao: veiculo.condicao,
        ativo: veiculo.ativo,
        motivo_inativacao: veiculo.motivo_inativacao
      };

      await veiculo.update({
        placa: placaLimpa || veiculo.placa,
        modelo_id: modelo_id ? Number(modelo_id) : veiculo.modelo_id,
        ano: anoInt,
        cor: cor || veiculo.cor,
        km_atual: kmInt,
        condicao: condicao ? (condicao as 'novo' | 'usado') : veiculo.condicao,
        ativo: novoAtivo,
        motivo_inativacao: novoMotivoInativacao,
        inativado_em: novoInativadoEm
      });

      // Registro de Auditoria
      await AuditoriaService.registrar({
        req,
        acao: acaoAuditoria,
        recurso: 'Veículos',
        registro_id: veiculo.id,
        descricao: descricaoAuditoria,
        dados_anteriores: dadosAnt,
        dados_novos: { 
          placa: veiculo.placa, modelo_id: veiculo.modelo_id, ano: anoInt, cor: veiculo.cor, 
          km_atual: kmInt, condicao: veiculo.condicao, ativo: novoAtivo, motivo_inativacao: novoMotivoInativacao 
        }
      });

      const msgSucesso = acaoAuditoria === 'INATIVAR' 
        ? 'Veículo inativado com sucesso!' 
        : acaoAuditoria === 'REATIVAR' 
          ? 'Veículo reativado com sucesso!' 
          : 'Veículo atualizado com sucesso!';

      res.redirect(`/veiculos/${veiculo.id}?sucesso=${encodeURIComponent(msgSucesso)}`);
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
      const placaVeiculo = veiculo.placa;

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

      // Registro de Auditoria
      await AuditoriaService.registrar({
        req,
        acao: 'EXCLUIR',
        recurso: 'Veículos',
        registro_id: id,
        descricao: `Excluiu o veículo de placa ${placaVeiculo} (ID: ${id}) do cliente ID ${clienteId}.`
      });

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

  /**
   * GET /veiculos/:id/pendencias-inativacao
   * Consulta assíncrona para checagem preventiva de pendências antes da inativação
   */
  public static async verificarPendenciasInativacao(req: Request<{ id: string }>, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      const agendamentos = await Agendamento.findAll({
        where: {
          veiculo_id: Number(id),
          status: 'agendado'
        },
        order: [['data_agendada', 'ASC'], ['horario_agendado', 'ASC']]
      });

      res.json({
        sucesso: true,
        temPendencias: agendamentos.length > 0,
        totalPendencias: agendamentos.length,
        pendencias: agendamentos.map(a => ({
          id: a.id,
          data: a.data_agendada ? new Date(a.data_agendada).toLocaleDateString('pt-BR') : '',
          horario: a.horario_agendado || '',
          motivo: a.motivo_revisao || 'Revisão / Manutenção Geral',
          status: a.status
        }))
      });
    } catch (error) {
      console.error('Erro ao verificar pendencias de veiculo:', error);
      res.status(500).json({ sucesso: false, erro: 'Falha ao consultar pendências do veículo.' });
    }
  }
}

export default VeiculoController;

// Compatibilidade CommonJS
module.exports = VeiculoController;
