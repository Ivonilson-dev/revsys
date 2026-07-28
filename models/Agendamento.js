'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Agendamento extends Model {
    static associate(models) {
      Agendamento.belongsTo(models.Cliente, {
        foreignKey: 'cliente_id',
        as: 'cliente'
      });
      Agendamento.belongsTo(models.Veiculo, {
        foreignKey: 'veiculo_id',
        as: 'veiculo'
      });
      Agendamento.belongsTo(models.Usuario, {
        foreignKey: 'criado_por',
        as: 'criador'
      });
    }
  }

  Agendamento.init({
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    veiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    data_agendada: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    horario_agendado: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('agendado', 'concluido', 'cancelado'),
      allowNull: false,
      defaultValue: 'agendado'
    },
    motivo_revisao: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Agendamento',
    tableName: 'agendamentos',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Agendamento;
};
