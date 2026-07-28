'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('clientes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cpf: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      cpf_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      logradouro: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      numero: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      bairro: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cidade: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      estado: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cep: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      telefone_whatsapp: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      consentimento_lgpd: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      data_consentimento_lgpd: {
        type: Sequelize.DATE,
        allowNull: true
      },
      criado_em: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      atualizado_em: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('clientes');
  }
};
