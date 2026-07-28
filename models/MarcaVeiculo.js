'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MarcaVeiculo extends Model {
    static associate(models) {
      MarcaVeiculo.hasMany(models.ModeloVeiculo, {
        foreignKey: 'marca_veiculo_id',
        as: 'modelos'
      });
    }
  }

  MarcaVeiculo.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    }
  }, {
    sequelize,
    modelName: 'MarcaVeiculo',
    tableName: 'marcas_veiculo',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return MarcaVeiculo;
};
