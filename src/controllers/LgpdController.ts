import { Request, Response } from 'express';
import AuditoriaService from '../services/AuditoriaService';

export class LgpdController {
  /**
   * GET /lgpd
   * Exibe a página com os termos e a declaração de conformidade do sistema à LGPD.
   */
  public static async exibirConformidade(req: Request, res: Response): Promise<void> {
    try {
      // Registra a visualização na trilha de auditoria
      await AuditoriaService.registrar({
        req,
        acao: 'CONSULTAR',
        recurso: 'lgpd',
        descricao: 'Visualizou os Termos e Declaração de Conformidade à LGPD do sistema RevSys.'
      });

      res.render('lgpd/index', {
        titulo: 'Conformidade LGPD - AUTEC / RevSys',
        urlAtiva: '/lgpd',
        dataVigencia: '01 de Outubro de 2026',
        versaoDocumento: '2.4 / 2026',
        dpoContato: {
          nome: 'Encarregado de Proteção de Dados (DPO)',
          email: 'privacidade@autec.com.br',
          oficina: 'AUTEC - Centro Automotivo Especializado'
        }
      });
    } catch (error) {
      console.error('Erro ao renderizar página de conformidade LGPD:', error);
      res.status(500).render('erros/500', {
        titulo: 'Erro Interno',
        urlAtiva: '/lgpd',
        erro: 'Não foi possível carregar os termos de conformidade LGPD no momento.'
      });
    }
  }
}

export default LgpdController;
