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
      Agendamento.belongsTo(models.Servico, {
        foreignKey: 'servico_id',
        as: 'servico'
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
    servico_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    data_agendada: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    horario_agendado: {
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    duracao_minutos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60
    },
    horario_fim: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('agendado', 'concluido', 'cancelado'),
      allowNull: false,
      defaultValue: 'agendado'
    },
    confirmacao_presenca: {
      type: DataTypes.ENUM('pendente', 'solicitada', 'confirmada'),
      allowNull: false,
      defaultValue: 'pendente'
    },
    confirmacao_solicitada_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmacao_adiada_ate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmado_em: {
      type: DataTypes.DATE,
      allowNull: true
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
    motivo_cancelamento: {
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
