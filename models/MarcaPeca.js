'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MarcaPeca extends Model {
    static associate(models) {
      MarcaPeca.hasMany(models.Peca, {
        foreignKey: 'marca_peca_id',
        as: 'pecas',
        onDelete: 'RESTRICT'
      });
    }
  }

  MarcaPeca.init({
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
    modelName: 'MarcaPeca',
    tableName: 'marcas_peca',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return MarcaPeca;
};
