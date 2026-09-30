'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RegistroTroca extends Model {
    static associate(models) {
      RegistroTroca.belongsTo(models.Veiculo, {
        foreignKey: 'veiculo_id',
        as: 'veiculo',
        onDelete: 'RESTRICT'
      });
      RegistroTroca.belongsTo(models.Peca, {
        foreignKey: 'peca_id',
        as: 'peca',
        onDelete: 'RESTRICT'
      });
      RegistroTroca.belongsTo(models.Oficina, {
        foreignKey: 'oficina_id',
        as: 'oficina',
        onDelete: 'RESTRICT'
      });
    }
  }

  RegistroTroca.init({
    veiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    peca_id: {
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
    km_na_troca: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    data_troca: {
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
    modelName: 'RegistroTroca',
    tableName: 'registros_troca',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return RegistroTroca;
};
