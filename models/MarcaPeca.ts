import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { Peca } from './Peca';
import type { IDatabaseContext } from './index';

export interface MarcaPecaAttributes {
  id: number;
  nome: string;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface MarcaPecaCreationAttributes extends Optional<MarcaPecaAttributes, 'id' | 'criado_em' | 'atualizado_em'> {}

export class MarcaPeca extends Model<MarcaPecaAttributes, MarcaPecaCreationAttributes> implements MarcaPecaAttributes {
  declare id: number;
  declare nome: string;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare pecas?: Peca[];

  public static associate(models: IDatabaseContext): void {
    MarcaPeca.hasMany(models.Peca, {
      foreignKey: 'marca_peca_id',
      as: 'pecas',
      onDelete: 'RESTRICT'
    });
  }
}

export function initMarcaPeca(sequelize: Sequelize): typeof MarcaPeca {
  MarcaPeca.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    }
  }, {
    sequelize,
    modelName: 'MarcaPeca',
    tableName: 'marcas_peca',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return MarcaPeca;
}

export default (sequelize: Sequelize) => initMarcaPeca(sequelize);
