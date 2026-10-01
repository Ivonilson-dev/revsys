import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { MarcaPeca } from './MarcaPeca';
import type { RegistroTroca } from './RegistroTroca';
import type { IDatabaseContext } from './index';

export interface PecaAttributes {
  id: number;
  nome: string;
  marca_peca_id: number;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface PecaCreationAttributes extends Optional<PecaAttributes, 'id' | 'criado_em' | 'atualizado_em'> {}

export class Peca extends Model<PecaAttributes, PecaCreationAttributes> implements PecaAttributes {
  declare id: number;
  declare nome: string;
  declare marca_peca_id: number;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare marca?: MarcaPeca;
  declare registros_troca?: RegistroTroca[];

  public static associate(models: IDatabaseContext): void {
    Peca.belongsTo(models.MarcaPeca, {
      foreignKey: 'marca_peca_id',
      as: 'marca',
      onDelete: 'RESTRICT'
    });
    Peca.hasMany(models.RegistroTroca, {
      foreignKey: 'peca_id',
      as: 'registros_troca',
      onDelete: 'RESTRICT'
    });
  }
}

export function initPeca(sequelize: Sequelize): typeof Peca {
  Peca.init({
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
    marca_peca_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Peca',
    tableName: 'pecas',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Peca;
}

export default (sequelize: Sequelize) => initPeca(sequelize);
