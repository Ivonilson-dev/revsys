import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { MarcaVeiculo } from './MarcaVeiculo';
import type { Veiculo } from './Veiculo';
import type { IDatabaseContext } from './index';

export interface ModeloVeiculoAttributes {
  id: number;
  nome: string;
  marca_veiculo_id: number;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface ModeloVeiculoCreationAttributes extends Optional<ModeloVeiculoAttributes, 'id' | 'criado_em' | 'atualizado_em'> {}

export class ModeloVeiculo extends Model<ModeloVeiculoAttributes, ModeloVeiculoCreationAttributes> implements ModeloVeiculoAttributes {
  declare id: number;
  declare nome: string;
  declare marca_veiculo_id: number;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare marca?: MarcaVeiculo;
  declare veiculos?: Veiculo[];

  public static associate(models: IDatabaseContext): void {
    ModeloVeiculo.belongsTo(models.MarcaVeiculo, {
      foreignKey: 'marca_veiculo_id',
      as: 'marca',
      onDelete: 'RESTRICT'
    });
    ModeloVeiculo.hasMany(models.Veiculo, {
      foreignKey: 'modelo_id',
      as: 'veiculos',
      onDelete: 'RESTRICT'
    });
  }
}

export function initModeloVeiculo(sequelize: Sequelize): typeof ModeloVeiculo {
  ModeloVeiculo.init({
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
    marca_veiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'ModeloVeiculo',
    tableName: 'modelos_veiculo',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return ModeloVeiculo;
}

export default (sequelize: Sequelize) => initModeloVeiculo(sequelize);
