'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Peca extends Model {
    static associate(models) {
      Peca.belongsTo(models.MarcaPeca, {
        foreignKey: 'marca_peca_id',
        as: 'marca',
        onDelete: 'RESTRICT'
      });
      Peca.hasMany(models.RegistroTroca, {
        foreignKey: 'peca_id',
        as: 'registros_troca',
        onDelete: 'RESTRICT'
      });
    }
  }

  Peca.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    marca_peca_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Peca',
    tableName: 'pecas',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Peca;
};
