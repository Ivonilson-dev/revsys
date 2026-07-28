'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('registros_troca', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      veiculo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'veiculos',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      peca_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'pecas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      oficina_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'oficinas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      nome_oficina_manual: {
        type: Sequelize.STRING,
        allowNull: true
      },
      km_na_troca: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      data_troca: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      km_previsto_proximo: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      data_prevista_proximo: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      executado_por: {
        type: Sequelize.STRING,
        allowNull: false
      },
      observacoes: {
        type: Sequelize.TEXT,
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
    await queryInterface.dropTable('registros_troca');
  }
};
