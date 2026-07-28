'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasOne(models.Cliente, {
        foreignKey: 'usuario_id',
        as: 'cliente'
      });
      Usuario.hasMany(models.Agendamento, {
        foreignKey: 'criado_por',
        as: 'agendamentos_criados'
      });
      Usuario.hasMany(models.Notificacao, {
        foreignKey: 'usuario_id',
        as: 'notificacoes'
      });
    }

    // Método auxiliar para verificar a senha
    async verificarSenha(senha) {
      return bcrypt.compare(senha, this.senha_hash);
    }
  }

  Usuario.init({
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    senha_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    papel: {
      type: DataTypes.ENUM('admin', 'gerente', 'atendente', 'mecanico', 'cliente'),
      allowNull: false,
      defaultValue: 'cliente'
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Usuario',
    tableName: 'usuarios',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    hooks: {
      beforeSave: async (usuario) => {
        if (usuario.changed('senha_hash')) {
          const salt = await bcrypt.genSalt(10);
          usuario.senha_hash = await bcrypt.hash(usuario.senha_hash, salt);
        }
      }
    }
  });

  return Usuario;
};
