import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { RegistroTroca } from './RegistroTroca';
import type { RegistroServico } from './RegistroServico';
import type { IDatabaseContext } from './index';

export interface OficinaAttributes {
  id: number;
  nome: string;
  cnpj: string;
  telefone?: string | null;
  endereco?: string | null;
  email?: string | null;
  whatsapp_numero?: string | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface OficinaCreationAttributes extends Optional<OficinaAttributes, 'id' | 'telefone' | 'endereco' | 'email' | 'whatsapp_numero' | 'criado_em' | 'atualizado_em'> {}

export class Oficina extends Model<OficinaAttributes, OficinaCreationAttributes> implements OficinaAttributes {
  declare id: number;
  declare nome: string;
  declare cnpj: string;
  declare telefone: string | null;
  declare endereco: string | null;
  declare email: string | null;
  declare whatsapp_numero: string | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare registros_troca?: RegistroTroca[];
  declare registros_servico?: RegistroServico[];

  public static associate(models: IDatabaseContext): void {
    Oficina.hasMany(models.RegistroTroca, {
      foreignKey: 'oficina_id',
      as: 'registros_troca',
      onDelete: 'RESTRICT'
    });
    Oficina.hasMany(models.RegistroServico, {
      foreignKey: 'oficina_id',
      as: 'registros_servico',
      onDelete: 'RESTRICT'
    });
  }
}

export function initOficina(sequelize: Sequelize): typeof Oficina {
  Oficina.init({
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
}

export default (sequelize: Sequelize) => initOficina(sequelize);
