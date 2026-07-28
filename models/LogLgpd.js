'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LogLgpd extends Model {
    static associate(models) {
      LogLgpd.belongsTo(models.Cliente, {
        foreignKey: 'cliente_id',
        as: 'cliente'
      });
    }
  }

  LogLgpd.init({
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    consentimento_dado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ip_origem: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LogLgpd',
    tableName: 'logs_lgpd',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return LogLgpd;
};
