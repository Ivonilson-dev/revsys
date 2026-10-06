import session from 'express-session';
import { Sequelize } from 'sequelize';

interface ISessaoRegistro {
  dados: string;
  expira_em: Date | string;
}

/**
 * Store de Sessão customizado e persistente utilizando Sequelize / MySQL
 * Mantém os dados da sessão gravados no banco de dados na tabela 'sessoes'.
 * Benefícios:
 * 1. A sessão NÃO é perdida quando o servidor reinicia (ex: hot reload do nodemon/tsx).
 * 2. O usuário permanece conectado até que clique deliberadamente em 'Sair'.
 */
export class DatabaseSessionStore extends session.Store {
  private sequelize: Sequelize;

  constructor(sequelize: Sequelize) {
    super();
    this.sequelize = sequelize;
    this.inicializarTabela();
  }

  public async inicializarTabela(): Promise<void> {
    try {
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`sessoes\` (
          \`sid\` VARCHAR(128) NOT NULL PRIMARY KEY,
          \`dados\` MEDIUMTEXT NOT NULL,
          \`expira_em\` DATETIME NOT NULL,
          \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`atualizado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_sessoes_expira_em\` (\`expira_em\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch (err: unknown) {
      console.error('Erro ao inicializar tabela de sessões:', err instanceof Error ? err.message : err);
    }
  }

  public override async get(sid: string, callback: (err?: unknown, session?: session.SessionData | null) => void): Promise<void> {
    try {
      const [rows] = await this.sequelize.query(
        'SELECT dados, expira_em FROM `sessoes` WHERE `sid` = ? LIMIT 1',
        { replacements: [sid] }
      ) as unknown as [ISessaoRegistro[]];

      if (!rows || rows.length === 0) {
        return callback(null, null);
      }

      const registro = rows[0];
      if (registro && registro.expira_em && new Date(registro.expira_em) < new Date()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }

      if (!registro || !registro.dados) {
        return callback(null, null);
      }

      const sessao: session.SessionData = JSON.parse(registro.dados);
      return callback(null, sessao);
    } catch (err) {
      return callback(err);
    }
  }

  public override async set(
    sid: string,
    sessao: session.SessionData,
    callback?: (err?: unknown) => void
  ): Promise<void> {
    try {
      // Se a sessão não contiver usuário autenticado, não deve ser persistida
      if (!sessao || !sessao.usuario) {
        if (callback) callback(null);
        return;
      }

      // Duração de 1 ano para durar até o usuário deslogar deliberadamente
      let expiraEm: Date;
      if (sessao && sessao.cookie && sessao.cookie.expires) {
        expiraEm = new Date(sessao.cookie.expires);
      } else {
        expiraEm = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      const dados = JSON.stringify(sessao);

      await this.sequelize.query(
        `INSERT INTO \`sessoes\` (\`sid\`, \`dados\`, \`expira_em\`) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE \`dados\` = VALUES(\`dados\`), \`expira_em\` = VALUES(\`expira_em\`)`,
        { replacements: [sid, dados, expiraEm] }
      );

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  public override async destroy(sid: string, callback?: (err?: unknown) => void): Promise<void> {
    try {
      await this.sequelize.query(
        'DELETE FROM `sessoes` WHERE `sid` = ?',
        { replacements: [sid] }
      );
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  public override async touch(
    sid: string,
    sessao: session.SessionData,
    callback?: (err?: unknown) => void
  ): Promise<void> {
    try {
      // Se a sessão não possui usuário autenticado, ignora a renovação
      if (!sessao || !sessao.usuario) {
        if (callback) callback(null);
        return;
      }

      let expiraEm: Date;
      if (sessao.cookie && sessao.cookie.expires) {
        expiraEm = new Date(sessao.cookie.expires);
      } else {
        expiraEm = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      // CRÍTICO: Touch deve apenas ATUALIZAR registros existentes.
      // Jamais faz INSERT, para não ressuscitar sessões destruídas pelo logout.
      await this.sequelize.query(
        'UPDATE `sessoes` SET `expira_em` = ? WHERE `sid` = ?',
        { replacements: [expiraEm, sid] }
      );

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}

export default DatabaseSessionStore;

// Compatibilidade CommonJS
module.exports = DatabaseSessionStore;
