'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Oficina extends Model {
    static associate(models) {
      Oficina.hasMany(models.RegistroTroca, {
        foreignKey: 'oficina_id',
        as: 'registros_troca'
      });
    }
  }

  Oficina.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    cnpj: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    endereco: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    whatsapp_numero: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Oficina',
    tableName: 'oficinas',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Oficina;
};
