'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Servico extends Model {
    static associate(models) {
      Servico.hasMany(models.RegistroServico, {
        foreignKey: 'servico_id',
        as: 'registros_servico',
        onDelete: 'RESTRICT'
      });
      Servico.hasMany(models.Agendamento, {
        foreignKey: 'servico_id',
        as: 'agendamentos',
        onDelete: 'RESTRICT'
      });
    }
  }

  Servico.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: true
    },
    preco_padrao: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Servico',
    tableName: 'servicos',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Servico;
};
