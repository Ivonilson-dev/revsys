import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { LogAuditoria, Usuario, NivelAcesso } from '../../models';
import { TipoAcaoAuditoria } from '../../models/LogAuditoria';

export class AuditoriaController {
  /**
   * Constrói a cláusula WHERE do Sequelize baseada nos parâmetros da requisição
   */
  private static construirWhereFiltros(query: Request['query']): WhereOptions {
    const where: Record<string, unknown> = {};
    const { data_inicio, data_fim, usuario_id, acao, recurso, busca } = query;

    // Filtro por período de datas
    if (data_inicio && data_fim) {
      where.criado_em = {
        [Op.between]: [
          new Date(`${data_inicio}T00:00:00.000`),
          new Date(`${data_fim}T23:59:59.999`)
        ]
      };
    } else if (data_inicio) {
      where.criado_em = {
        [Op.gte]: new Date(`${data_inicio}T00:00:00.000`)
      };
    } else if (data_fim) {
      where.criado_em = {
        [Op.lte]: new Date(`${data_fim}T23:59:59.999`)
      };
    }

    // Filtro por usuário específico
    if (usuario_id && usuario_id !== 'todos') {
      where.usuario_id = Number(usuario_id);
    }

    // Filtro por tipo de ação
    if (acao && acao !== 'todas') {
      where.acao = acao as TipoAcaoAuditoria;
    }

    // Filtro por módulo / recurso
    if (recurso && recurso !== 'todos') {
      where.recurso = recurso;
    }

    // Filtro textual livre (busca por descrição, nome, email, IP ou ID)
    if (busca && typeof busca === 'string' && busca.trim() !== '') {
      const termo = `%${busca.trim()}%`;
      where[Op.or as unknown as string] = [
        { descricao: { [Op.like]: termo } },
        { usuario_nome: { [Op.like]: termo } },
        { usuario_email: { [Op.like]: termo } },
        { ip: { [Op.like]: termo } },
        { registro_id: { [Op.like]: termo } }
      ];
    }

    return where as WhereOptions;
  }

  /**
   * Listagem principal da Auditoria com filtros e paginação
   */
  public static async listar(req: Request, res: Response): Promise<void> {
    try {
      const itensPorPagina = 20;
      const paginaAtual = Math.max(1, parseInt(req.query.pagina as string) || 1);
      const offset = (paginaAtual - 1) * itensPorPagina;

      const where = AuditoriaController.construirWhereFiltros(req.query);

      // Consulta paginada dos logs com ordenação descendente por data
      const { count: totalItens, rows: logs } = await LogAuditoria.findAndCountAll({
        where,
        order: [['criado_em', 'DESC']],
        limit: itensPorPagina,
        offset,
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nome', 'email', 'papel']
          }
        ]
      });

      const totalPaginas = Math.ceil(totalItens / itensPorPagina) || 1;

      // Lista de usuários para o dropdown (Ordenada alfabeticamente conforme RF-02)
      const usuarios = await Usuario.findAll({
        attributes: ['id', 'nome', 'email', 'papel'],
        order: [['nome', 'ASC']]
      });

      // Estatísticas rápidas do conjunto filtrado
      const totalLogins = await LogAuditoria.count({
        where: { ...where, acao: { [Op.in]: ['LOGIN', 'LOGIN_FALHA', 'LOGOUT'] } }
      });

      const totalCriacoes = await LogAuditoria.count({
        where: { ...where, acao: 'CRIAR' }
      });

      const totalAlteracoesExclusoes = await LogAuditoria.count({
        where: { ...where, acao: { [Op.in]: ['ATUALIZAR', 'EXCLUIR', 'CANCELAR'] } }
      });

      // Lista consolidada de recursos existentes no sistema para o filtro
      const recursosPredefinidos = [
        'Autenticação',
        'Clientes',
        'Veículos',
        'Peças',
        'Serviços em Veículos',
        'Catálogo de Serviços',
        'Trocas de Peças',
        'Agendamentos',
        'Oficinas',
        'Usuários',
        'Marcas de Veículo',
        'Modelos de Veículo',
        'Marcas de Peça'
      ];

      res.render('auditoria/index', {
        titulo: 'Auditoria e Rastreabilidade do Sistema',
        urlAtiva: '/auditoria',
        logs,
        usuarios,
        recursosPredefinidos,
        filtros: {
          data_inicio: req.query.data_inicio || '',
          data_fim: req.query.data_fim || '',
          usuario_id: req.query.usuario_id || 'todos',
          acao: req.query.acao || 'todas',
          recurso: req.query.recurso || 'todos',
          busca: req.query.busca || ''
        },
        paginacao: {
          paginaAtual,
          totalPaginas,
          totalItens,
          itensPorPagina
        },
        estatisticas: {
          totalItens,
          totalLogins,
          totalCriacoes,
          totalAlteracoesExclusoes
        }
      });
    } catch (error) {
      console.error('Erro em AuditoriaController.listar:', error);
      res.status(500).render('erros/500', {
        titulo: 'Erro ao carregar auditoria',
        mensagem: 'Ocorreu um erro ao carregar os registros de auditoria.'
      });
    }
  }

  /**
   * Endpoint AJAX para obter os detalhes completos de um registro (JSON formatado)
   */
  public static async detalhes(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const log = await LogAuditoria.findByPk(id, {
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nome', 'email', 'papel']
          }
        ]
      });

      if (!log) {
        res.status(404).json({ sucesso: false, mensagem: 'Registro de auditoria não encontrado.' });
        return;
      }

      res.json({ sucesso: true, log });
    } catch (error) {
      console.error('Erro em AuditoriaController.detalhes:', error);
      res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao buscar detalhes do log.' });
    }
  }

  /**
   * Tela de Relatório Otimizada para Impressão e Exportação em PDF
   */
  public static async relatorio(req: Request, res: Response): Promise<void> {
    try {
      const where = AuditoriaController.construirWhereFiltros(req.query);

      // Carrega até 500 registros para o relatório de impressão
      const logs = await LogAuditoria.findAll({
        where,
        order: [['criado_em', 'DESC']],
        limit: 500,
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id', 'nome', 'email', 'papel']
          }
        ]
      });

      // Identifica o nome do usuário filtrado (se houver)
      let nomeUsuarioFiltrado = 'Todos';
      if (req.query.usuario_id && req.query.usuario_id !== 'todos') {
        const u = await Usuario.findByPk(Number(req.query.usuario_id));
        if (u) nomeUsuarioFiltrado = u.nome;
      }

      res.render('auditoria/relatorio', {
        titulo: 'Relatório de Auditoria - AUTEC / RevSys',
        logs,
        dataEmissao: new Date(),
        usuarioEmissor: req.session.usuario,
        filtros: {
          data_inicio: req.query.data_inicio || '',
          data_fim: req.query.data_fim || '',
          usuario_id: req.query.usuario_id || 'todos',
          usuario_nome: nomeUsuarioFiltrado,
          acao: req.query.acao || 'todas',
          recurso: req.query.recurso || 'todos',
          busca: req.query.busca || ''
        }
      });
    } catch (error) {
      console.error('Erro em AuditoriaController.relatorio:', error);
      res.status(500).render('erros/500', {
        titulo: 'Erro ao gerar relatório',
        mensagem: 'Não foi possível gerar o relatório de auditoria.'
      });
    }
  }
}

export default AuditoriaController;
