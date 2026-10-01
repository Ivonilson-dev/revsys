const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'revsys',
  process.env.DB_USER || 'root',
  process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log
  }
);

async function migrar() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão estabelecida com sucesso com o banco de dados MySQL local.');

    // 1. Criar tabela niveis_acesso
    console.log('1. Criando tabela niveis_acesso...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`niveis_acesso\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nome\` ENUM('admin', 'gerente', 'atendente', 'mecanico', 'cliente') NOT NULL UNIQUE,
        \`titulo\` VARCHAR(100) NOT NULL,
        \`descricao\` TEXT NULL,
        \`nivel_hierarquia\` INT NOT NULL DEFAULT 5,
        \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`atualizado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Popular niveis_acesso
    console.log('2. Inserindo dados iniciais em niveis_acesso...');
    await sequelize.query(`
      INSERT INTO \`niveis_acesso\` (\`id\`, \`nome\`, \`titulo\`, \`descricao\`, \`nivel_hierarquia\`) VALUES
      (1, 'admin', 'Administrador', 'Acesso irrestrito a todas as funcionalidades do sistema, relatórios gerenciais e módulo de auditoria.', 1),
      (2, 'gerente', 'Gerente', 'Gerenciamento operacional completo, clientes, veículos, revisões e relatórios analíticos.', 2),
      (3, 'atendente', 'Atendente', 'Cadastro de clientes, veículos, gestão da agenda de revisões e confirmação de presença.', 3),
      (4, 'mecanico', 'Mecânico', 'Execução e registro técnico de trocas de peças, serviços avulsos e histórico de veículos.', 4),
      (5, 'cliente', 'Cliente', 'Acesso exclusivo de visualização aos próprios veículos, agendamentos e histórico.', 5)
      ON DUPLICATE KEY UPDATE \`titulo\` = VALUES(\`titulo\`), \`descricao\` = VALUES(\`descricao\`), \`nivel_hierarquia\` = VALUES(\`nivel_hierarquia\`);
    `);

    // 3. Adicionar coluna nivel_acesso_id em usuarios se não existir
    console.log('3. Verificando coluna nivel_acesso_id em usuarios...');
    const [colunas] = await sequelize.query(`
      SHOW COLUMNS FROM \`usuarios\` LIKE 'nivel_acesso_id';
    `);

    if (colunas.length === 0) {
      console.log('Adicionando coluna nivel_acesso_id e foreign key...');
      await sequelize.query(`
        ALTER TABLE \`usuarios\` 
        ADD COLUMN \`nivel_acesso_id\` INT NULL AFTER \`papel\`,
        ADD CONSTRAINT \`fk_usuarios_nivel_acesso\` FOREIGN KEY (\`nivel_acesso_id\`) REFERENCES \`niveis_acesso\` (\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
      `);
    } else {
      console.log('Coluna nivel_acesso_id já existe em usuarios.');
    }

    // 4. Sincronizar nivel_acesso_id com base no papel
    console.log('4. Sincronizando nivel_acesso_id dos usuários existentes...');
    await sequelize.query(`
      UPDATE \`usuarios\` u
      JOIN \`niveis_acesso\` na ON na.nome = u.papel
      SET u.nivel_acesso_id = na.id
      WHERE u.nivel_acesso_id IS NULL;
    `);

    // 5. Criar tabela logs_auditoria
    console.log('5. Criando tabela logs_auditoria...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`logs_auditoria\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`usuario_id\` INT NULL,
        \`usuario_nome\` VARCHAR(255) NULL,
        \`usuario_email\` VARCHAR(255) NULL,
        \`usuario_papel\` VARCHAR(50) NULL,
        \`acao\` VARCHAR(50) NOT NULL,
        \`recurso\` VARCHAR(100) NOT NULL,
        \`registro_id\` VARCHAR(100) NULL,
        \`descricao\` TEXT NOT NULL,
        \`dados_anteriores\` JSON NULL,
        \`dados_novos\` JSON NULL,
        \`ip\` VARCHAR(45) NULL,
        \`user_agent\` VARCHAR(255) NULL,
        \`criado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`atualizado_em\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_auditoria_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX \`idx_auditoria_criado_em\` (\`criado_em\`),
        INDEX \`idx_auditoria_usuario\` (\`usuario_id\`),
        INDEX \`idx_auditoria_acao\` (\`acao\`),
        INDEX \`idx_auditoria_recurso\` (\`recurso\`)
      ) ENGINE=InnoDB;
    `);

    // 6. Inserir log inicial de auditoria
    console.log('6. Inserindo evento inicial de auditoria...');
    await sequelize.query(`
      INSERT INTO \`logs_auditoria\` (\`usuario_id\`, \`usuario_nome\`, \`usuario_email\`, \`usuario_papel\`, \`acao\`, \`recurso\`, \`descricao\`, \`ip\`, \`user_agent\`)
      VALUES (1, 'Administrador', 'admin@revsys.com', 'admin', 'CRIAR', 'Autenticação', 'Módulo de auditoria e rastreabilidade inicializado no sistema RevSys.', '127.0.0.1', 'Migração de Sistema');
    `);

    console.log('🚀 Migração de auditoria concluída com sucesso absoluto!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

migrar();
