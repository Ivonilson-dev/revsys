'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ModeloVeiculo extends Model {
    static associate(models) {
      ModeloVeiculo.belongsTo(models.MarcaVeiculo, {
        foreignKey: 'marca_veiculo_id',
        as: 'marca'
      });
      ModeloVeiculo.hasMany(models.Veiculo, {
        foreignKey: 'modelo_id',
        as: 'veiculos'
      });
    }
  }

  ModeloVeiculo.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    marca_veiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ModeloVeiculo',
    tableName: 'modelos_veiculo',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return ModeloVeiculo;
};
