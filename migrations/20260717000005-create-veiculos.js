'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('veiculos', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      placa: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      modelo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'modelos_veiculo',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'clientes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ano: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      cor: {
        type: Sequelize.STRING,
        allowNull: false
      },
      km_atual: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      condicao: {
        type: Sequelize.ENUM('novo', 'usado'),
        allowNull: false,
        defaultValue: 'usado'
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

    // Adicionar índice explicitamente na placa (embora unique já crie)
    await queryInterface.addIndex('veiculos', ['placa']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('veiculos');
  }
};
