import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { PapelUsuario } from '../src/types';
import type { Cliente } from './Cliente';
import type { Agendamento } from './Agendamento';
import type { Notificacao } from './Notificacao';
import type { IDatabaseContext } from './index';

export interface UsuarioAttributes {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  papel: PapelUsuario;
  telefone?: string | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface UsuarioCreationAttributes extends Optional<UsuarioAttributes, 'id' | 'papel' | 'telefone' | 'criado_em' | 'atualizado_em'> {}

export class Usuario extends Model<UsuarioAttributes, UsuarioCreationAttributes> implements UsuarioAttributes {
  declare id: number;
  declare nome: string;
  declare email: string;
  declare senha_hash: string;
  declare papel: PapelUsuario;
  declare telefone: string | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare cliente?: Cliente;
  declare agendamentos_criados?: Agendamento[];
  declare notificacoes?: Notificacao[];

  // Método auxiliar para verificar a senha
  public async verificarSenha(senha: string): Promise<boolean> {
    return bcrypt.compare(senha, this.senha_hash);
  }

  public static associate(models: IDatabaseContext): void {
    Usuario.hasOne(models.Cliente, {
      foreignKey: 'usuario_id',
      as: 'cliente',
      onDelete: 'RESTRICT'
    });
    Usuario.hasMany(models.Agendamento, {
      foreignKey: 'criado_por',
      as: 'agendamentos_criados',
      onDelete: 'RESTRICT'
    });
    Usuario.hasMany(models.Notificacao, {
      foreignKey: 'usuario_id',
      as: 'notificacoes',
      onDelete: 'CASCADE'
    });
  }
}

export function initUsuario(sequelize: Sequelize): typeof Usuario {
  Usuario.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
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
      beforeSave: async (usuario: Usuario) => {
        if (usuario.changed('senha_hash')) {
          const salt = await bcrypt.genSalt(10);
          usuario.senha_hash = await bcrypt.hash(usuario.senha_hash, salt);
        }
      }
    }
  });

  return Usuario;
}

export default (sequelize: Sequelize) => initUsuario(sequelize);
