import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { Cliente } from './Cliente';
import type { ModeloVeiculo } from './ModeloVeiculo';
import type { RegistroTroca } from './RegistroTroca';
import type { RegistroServico } from './RegistroServico';
import type { Agendamento } from './Agendamento';
import type { IDatabaseContext } from './index';

export interface VeiculoAttributes {
  id: number;
  placa: string;
  modelo_id: number;
  cliente_id: number;
  ano: number;
  cor: string;
  km_atual: number;
  condicao: 'novo' | 'usado';
  ativo: boolean;
  motivo_inativacao?: string | null;
  inativado_em?: Date | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface VeiculoCreationAttributes extends Optional<VeiculoAttributes, 'id' | 'condicao' | 'ativo' | 'motivo_inativacao' | 'inativado_em' | 'criado_em' | 'atualizado_em'> {}

export class Veiculo extends Model<VeiculoAttributes, VeiculoCreationAttributes> implements VeiculoAttributes {
  declare id: number;
  declare placa: string;
  declare modelo_id: number;
  declare cliente_id: number;
  declare ano: number;
  declare cor: string;
  declare km_atual: number;
  declare condicao: 'novo' | 'usado';
  declare ativo: boolean;
  declare motivo_inativacao: string | null;
  declare inativado_em: Date | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare cliente?: Cliente;
  declare modelo?: ModeloVeiculo;
  declare registros_troca?: RegistroTroca[];
  declare registros_servico?: RegistroServico[];
  declare agendamentos?: Agendamento[];

  public static associate(models: IDatabaseContext): void {
    Veiculo.belongsTo(models.Cliente, {
      foreignKey: 'cliente_id',
      as: 'cliente',
      onDelete: 'RESTRICT'
    });
    Veiculo.belongsTo(models.ModeloVeiculo, {
      foreignKey: 'modelo_id',
      as: 'modelo',
      onDelete: 'RESTRICT'
    });
    Veiculo.hasMany(models.RegistroTroca, {
      foreignKey: 'veiculo_id',
      as: 'registros_troca',
      onDelete: 'RESTRICT'
    });
    Veiculo.hasMany(models.RegistroServico, {
      foreignKey: 'veiculo_id',
      as: 'registros_servico',
      onDelete: 'RESTRICT'
    });
    Veiculo.hasMany(models.Agendamento, {
      foreignKey: 'veiculo_id',
      as: 'agendamentos',
      onDelete: 'RESTRICT'
    });
  }
}

export function initVeiculo(sequelize: Sequelize): typeof Veiculo {
  Veiculo.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    placa: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    modelo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ano: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 1900
      }
    },
    cor: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    km_atual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    condicao: {
      type: DataTypes.ENUM('novo', 'usado'),
      allowNull: false,
      defaultValue: 'usado'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    motivo_inativacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    inativado_em: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Veiculo',
    tableName: 'veiculos',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Veiculo;
}

export default (sequelize: Sequelize) => initVeiculo(sequelize);
