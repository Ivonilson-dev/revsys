'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Veiculo extends Model {
    static associate(models) {
      Veiculo.belongsTo(models.Cliente, {
        foreignKey: 'cliente_id',
        as: 'cliente',
        onDelete: 'RESTRICT'
      });
      Veiculo.belongsTo(models.ModeloVeiculo, {
        foreignKey: 'modelo_id',
        as: 'modelo',
        onDelete: 'RESTRICT'
      });
      Veiculo.hasMany(models.RegistroTroca, {
        foreignKey: 'veiculo_id',
        as: 'registros_troca',
        onDelete: 'RESTRICT'
      });
      Veiculo.hasMany(models.RegistroServico, {
        foreignKey: 'veiculo_id',
        as: 'registros_servico',
        onDelete: 'RESTRICT'
      });
      Veiculo.hasMany(models.Agendamento, {
        foreignKey: 'veiculo_id',
        as: 'agendamentos',
        onDelete: 'RESTRICT'
      });
    }
  }

  Veiculo.init({
    placa: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    modelo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ano: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1900
      }
    },
    cor: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    km_atual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    condicao: {
      type: DataTypes.ENUM('novo', 'usado'),
      allowNull: false,
      defaultValue: 'usado'
    }
  }, {
    sequelize,
    modelName: 'Veiculo',
    tableName: 'veiculos',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Veiculo;
};
