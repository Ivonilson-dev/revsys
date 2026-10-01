import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { Usuario } from './Usuario';
import type { IDatabaseContext } from './index';
import { PapelUsuario } from '../src/types';

export interface NivelAcessoAttributes {
  id: number;
  nome: PapelUsuario;
  titulo: string;
  descricao?: string | null;
  nivel_hierarquia: number;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface NivelAcessoCreationAttributes extends Optional<NivelAcessoAttributes, 'id' | 'descricao' | 'criado_em' | 'atualizado_em'> {}

export class NivelAcesso extends Model<NivelAcessoAttributes, NivelAcessoCreationAttributes> implements NivelAcessoAttributes {
  declare id: number;
  declare nome: PapelUsuario;
  declare titulo: string;
  declare descricao: string | null;
  declare nivel_hierarquia: number;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare usuarios?: Usuario[];

  public static associate(models: IDatabaseContext): void {
    NivelAcesso.hasMany(models.Usuario, {
      foreignKey: 'nivel_acesso_id',
      as: 'usuarios',
      onDelete: 'RESTRICT'
    });
  }
}

export function initNivelAcesso(sequelize: Sequelize): typeof NivelAcesso {
  NivelAcesso.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nome: {
      type: DataTypes.ENUM('admin', 'gerente', 'atendente', 'mecanico', 'cliente'),
      allowNull: false,
      unique: true
    },
    titulo: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    nivel_hierarquia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5
    }
  }, {
    sequelize,
    modelName: 'NivelAcesso',
    tableName: 'niveis_acesso',
    underscored: true,
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return NivelAcesso;
}
