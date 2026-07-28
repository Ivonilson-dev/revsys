'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RegistroServico extends Model {
    static associate(models) {
      RegistroServico.belongsTo(models.Veiculo, {
        foreignKey: 'veiculo_id',
        as: 'veiculo'
      });
      RegistroServico.belongsTo(models.Servico, {
        foreignKey: 'servico_id',
        as: 'servico'
      });
      RegistroServico.belongsTo(models.Oficina, {
        foreignKey: 'oficina_id',
        as: 'oficina'
      });
    }
  }

  RegistroServico.init({
    veiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    servico_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    oficina_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    nome_oficina_manual: {
      type: DataTypes.STRING,
      allowNull: true
    },
    km_no_servico: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    data_servico: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    km_previsto_proximo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    data_prevista_proximo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    executado_por: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'RegistroServico',
    tableName: 'registros_servico',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return RegistroServico;
};
