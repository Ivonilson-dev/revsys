import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { ModeloVeiculo } from './ModeloVeiculo';
import type { IDatabaseContext } from './index';

export interface MarcaVeiculoAttributes {
  id: number;
  nome: string;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface MarcaVeiculoCreationAttributes extends Optional<MarcaVeiculoAttributes, 'id' | 'criado_em' | 'atualizado_em'> {}

export class MarcaVeiculo extends Model<MarcaVeiculoAttributes, MarcaVeiculoCreationAttributes> implements MarcaVeiculoAttributes {
  declare id: number;
  declare nome: string;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare modelos?: ModeloVeiculo[];

  public static associate(models: IDatabaseContext): void {
    MarcaVeiculo.hasMany(models.ModeloVeiculo, {
      foreignKey: 'marca_veiculo_id',
      as: 'modelos',
      onDelete: 'RESTRICT'
    });
  }
}

export function initMarcaVeiculo(sequelize: Sequelize): typeof MarcaVeiculo {
  MarcaVeiculo.init({
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
    modelName: 'MarcaVeiculo',
    tableName: 'marcas_veiculo',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return MarcaVeiculo;
}

export default (sequelize: Sequelize) => initMarcaVeiculo(sequelize);
