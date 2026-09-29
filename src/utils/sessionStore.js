const session = require('express-session');

/**
 * Store de Sessão customizado e persistente utilizando Sequelize / MySQL
 * Mantém os dados da sessão gravados no banco de dados na tabela 'sessoes'.
 * Benefícios:
 * 1. A sessão NÃO é perdida quando o servidor reinicia (ex: hot reload do nodemon).
 * 2. O usuário permanece conectado até que clique deliberadamente em 'Sair'.
 */
class DatabaseSessionStore extends session.Store {
  constructor(sequelize) {
    super();
    this.sequelize = sequelize;
    this.inicializarTabela();
  }

  async inicializarTabela() {
    try {
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`sessoes\` (
          \`sid\` VARCHAR(128) NOT NULL PRIMARY KEY,
          \`dados\` MEDIUMTEXT NOT NULL,
          \`expira_em\` DATETIME NOT NULL,
          \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`atualizado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
      `);
    } catch (err) {
      console.error('Erro ao inicializar tabela de sessões:', err.message);
    }
  }

  async get(sid, callback) {
    try {
      const [rows] = await this.sequelize.query(
        'SELECT dados, expira_em FROM `sessoes` WHERE `sid` = ? LIMIT 1',
        { replacements: [sid] }
      );

      if (!rows || rows.length === 0) {
        return callback(null, null);
      }

      const registro = rows[0];
      if (registro.expira_em && new Date(registro.expira_em) < new Date()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }

      const sessao = JSON.parse(registro.dados);
      return callback(null, sessao);
    } catch (err) {
      return callback(err);
    }
  }

  async set(sid, sessao, callback) {
    try {
      // Duração de 1 ano para durar até o usuário deslogar deliberadamente
      let expiraEm;
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

      return callback && callback(null);
    } catch (err) {
      return callback && callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.sequelize.query(
        'DELETE FROM `sessoes` WHERE `sid` = ?',
        { replacements: [sid] }
      );
      return callback && callback(null);
    } catch (err) {
      return callback && callback(err);
    }
  }

  async touch(sid, sessao, callback) {
    return this.set(sid, sessao, callback);
  }
}

module.exports = DatabaseSessionStore;
