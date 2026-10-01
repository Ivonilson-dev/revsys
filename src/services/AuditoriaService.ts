import { Request } from 'express';
import { LogAuditoria } from '../../models';
import { TipoAcaoAuditoria } from '../../models/LogAuditoria';

export interface IRegistrarAuditoriaParams {
  req?: Request;
  usuario?: {
    id?: number | null;
    nome?: string | null;
    email?: string | null;
    papel?: string | null;
  };
  acao: TipoAcaoAuditoria;
  recurso: string;
  registro_id?: string | number | null;
  descricao: string;
  dados_anteriores?: unknown;
  dados_novos?: unknown;
}

export class AuditoriaService {
  /**
   * Sanitiza objetos removendo ou mascarando dados sensíveis antes de persistir no log (Conformidade LGPD)
   */
  private static sanitizarDados(dados: unknown): Record<string, unknown> | null {
    if (!dados || typeof dados !== 'object') {
      return null;
    }

    try {
      // Clona o objeto de forma simples
      const jsonStr = JSON.stringify(dados, (_key, value) => {
        // Omite propriedades de instâncias do Sequelize ou referências circulares
        if (value && typeof value === 'object' && ('_modelOptions' in value || 'dataValues' in value)) {
          return value.dataValues || '[Objeto Sequelize]';
        }
        return value;
      });

      const obj = JSON.parse(jsonStr);

      const sanitizarRecursivo = (alvo: Record<string, unknown>): void => {
        for (const chave of Object.keys(alvo)) {
          const chaveLower = chave.toLowerCase();
          const valor = alvo[chave];

          // Campos de senha e credenciais
          if (
            chaveLower.includes('senha') ||
            chaveLower.includes('password') ||
            chaveLower.includes('secret') ||
            chaveLower.includes('token') ||
            chaveLower.includes('aes') ||
            chaveLower.includes('hash')
          ) {
            alvo[chave] = '[DADO_RESTRITO_OMITIDO]';
          }
          // Mascara CPF em conformidade com a LGPD
          else if (chaveLower === 'cpf' && typeof valor === 'string') {
            alvo[chave] = valor.length > 5 ? `${valor.substring(0, 3)}.***.***-**` : '***.***.***-**';
          }
          // Recursão para objetos aninhados
          else if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
            sanitizarRecursivo(valor as Record<string, unknown>);
          }
        }
      };

      if (typeof obj === 'object' && obj !== null) {
        sanitizarRecursivo(obj as Record<string, unknown>);
        return obj as Record<string, unknown>;
      }

      return null;
    } catch {
      return { info: '[Dados serializados de forma restrita]' };
    }
  }

  /**
   * Extrai o IP real do cliente da requisição Express
   */
  private static extrairIp(req?: Request): string {
    if (!req) return '127.0.0.1';

    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const primeiroIp = forwarded.split(',')[0].trim();
      if (primeiroIp) return primeiroIp;
    }

    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    // Remove prefixo ::ffff: do IPv6 em conexões IPv4 mapeadas
    return ip.replace(/^::ffff:/, '');
  }

  /**
   * Extrai o User-Agent simplificado
   */
  private static extrairUserAgent(req?: Request): string {
    if (!req) return 'Sistema Interno';
    const ua = req.headers['user-agent'] || 'Desconhecido';
    return ua.length > 250 ? ua.substring(0, 250) : ua;
  }

  /**
   * Registra um evento de auditoria de forma segura e resiliente
   */
  public static async registrar(params: IRegistrarAuditoriaParams): Promise<void> {
    try {
      const { req, usuario: usuarioFornecido, acao, recurso, registro_id, descricao, dados_anteriores, dados_novos } = params;

      // Obtém usuário da sessão ou do parâmetro fornecido
      const usuarioSessao = req?.session?.usuario;
      const usuarioFinal = {
        id: usuarioFornecido?.id ?? usuarioSessao?.id ?? null,
        nome: usuarioFornecido?.nome ?? usuarioSessao?.nome ?? (usuarioSessao ? 'Usuário Autenticado' : 'Sistema / Anônimo'),
        email: usuarioFornecido?.email ?? usuarioSessao?.email ?? null,
        papel: usuarioFornecido?.papel ?? usuarioSessao?.papel ?? null
      };

      const ip = this.extrairIp(req);
      const userAgent = this.extrairUserAgent(req);
      const dadosAnt = this.sanitizarDados(dados_anteriores);
      const dadosNov = this.sanitizarDados(dados_novos);

      await LogAuditoria.create({
        usuario_id: usuarioFinal.id,
        usuario_nome: usuarioFinal.nome,
        usuario_email: usuarioFinal.email,
        usuario_papel: usuarioFinal.papel,
        acao,
        recurso,
        registro_id: registro_id ? String(registro_id) : null,
        descricao,
        dados_anteriores: dadosAnt,
        dados_novos: dadosNov,
        ip,
        user_agent: userAgent
      });
    } catch (error) {
      // Falhas no log de auditoria nunca devem quebrar a ação principal do usuário
      console.error('⚠️ [AuditoriaService] Erro ao registrar log de auditoria:', error);
    }
  }
}

export default AuditoriaService;
