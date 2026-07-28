'use strict';
const { Model } = require('sequelize');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../src/utils/crypto');

module.exports = (sequelize, DataTypes) => {
  class Cliente extends Model {
    static associate(models) {
      Cliente.belongsTo(models.Usuario, {
        foreignKey: 'usuario_id',
        as: 'usuario'
      });
      Cliente.hasMany(models.Veiculo, {
        foreignKey: 'cliente_id',
        as: 'veiculos'
      });
      Cliente.hasMany(models.Agendamento, {
        foreignKey: 'cliente_id',
        as: 'agendamentos'
      });
      Cliente.hasMany(models.LogLgpd, {
        foreignKey: 'cliente_id',
        as: 'logs_lgpd'
      });
    }
  }

  Cliente.init({
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cpf: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('cpf');
        return value ? decrypt(value) : value;
      },
      set(value) {
        this.setDataValue('cpf', value ? encrypt(value) : value);
      }
    },
    cpf_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    logradouro: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('logradouro');
        return value ? decrypt(value) : value;
      },
      set(value) {
        this.setDataValue('logradouro', value ? encrypt(value) : value);
      }
    },
    numero: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('numero');
        return value ? decrypt(value) : value;
      },
      set(value) {
        this.setDataValue('numero', value ? encrypt(value) : value);
      }
    },
    bairro: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('bairro');
        return value ? decrypt(value) : value;
      },
      set(value) {
        this.setDataValue('bairro', value ? encrypt(value) : value);
      }
    },
    cidade: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('cidade');
        return value ? decrypt(value) : value;
      },
      set(value) {
        this.setDataValue('cidade', value ? encrypt(value) : value);
      }
    },
    estado: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('estado');
        return value ? decrypt(value) : value;
      },
      set(value) {
        this.setDataValue('estado', value ? encrypt(value) : value);
      }
    },
    cep: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('cep');
        return value ? decrypt(value) : value;
      },
      set(value) {
        this.setDataValue('cep', value ? encrypt(value) : value);
      }
    },
    telefone_whatsapp: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('telefone_whatsapp');
        return value ? decrypt(value) : value;
      },
      set(value) {
        this.setDataValue('telefone_whatsapp', value ? encrypt(value) : value);
      }
    },
    consentimento_lgpd: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    data_consentimento_lgpd: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Cliente',
    tableName: 'clientes',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    hooks: {
      beforeValidate: (cliente) => {
        if (cliente.cpf) {
          // O getter retorna o CPF limpo/original.
          // Se for a primeira vez ou estiver sendo alterado, calculamos o blind index
          const rawCpf = cliente.cpf; // usa o getter que descriptografa
          const cleanCpf = String(rawCpf).replace(/\D/g, '');
          cliente.cpf_hash = crypto.createHash('sha256').update(cleanCpf).digest('hex');
        }
      }
    }
  });

  return Cliente;
};
