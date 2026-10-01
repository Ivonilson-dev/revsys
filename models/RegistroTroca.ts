import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { Veiculo } from './Veiculo';
import type { Peca } from './Peca';
import type { Oficina } from './Oficina';
import type { IDatabaseContext } from './index';

export interface RegistroTrocaAttributes {
  id: number;
  veiculo_id: number;
  peca_id: number;
  oficina_id?: number | null;
  nome_oficina_manual?: string | null;
  km_na_troca: number;
  data_troca: string | Date;
  km_previsto_proximo?: number | null;
  data_prevista_proximo?: string | Date | null;
  executado_por: string;
  observacoes?: string | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface RegistroTrocaCreationAttributes extends Optional<RegistroTrocaAttributes, 'id' | 'oficina_id' | 'nome_oficina_manual' | 'data_troca' | 'km_previsto_proximo' | 'data_prevista_proximo' | 'observacoes' | 'criado_em' | 'atualizado_em'> {}

export class RegistroTroca extends Model<RegistroTrocaAttributes, RegistroTrocaCreationAttributes> implements RegistroTrocaAttributes {
  declare id: number;
  declare veiculo_id: number;
  declare peca_id: number;
  declare oficina_id: number | null;
  declare nome_oficina_manual: string | null;
  declare km_na_troca: number;
  declare data_troca: string | Date;
  declare km_previsto_proximo: number | null;
  declare data_prevista_proximo: string | Date | null;
  declare executado_por: string;
  declare observacoes: string | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare veiculo?: Veiculo;
  declare peca?: Peca;
  declare oficina?: Oficina;

  public static associate(models: IDatabaseContext): void {
    RegistroTroca.belongsTo(models.Veiculo, {
      foreignKey: 'veiculo_id',
      as: 'veiculo',
      onDelete: 'RESTRICT'
    });
    RegistroTroca.belongsTo(models.Peca, {
      foreignKey: 'peca_id',
      as: 'peca',
      onDelete: 'RESTRICT'
    });
    RegistroTroca.belongsTo(models.Oficina, {
      foreignKey: 'oficina_id',
      as: 'oficina',
      onDelete: 'RESTRICT'
    });
  }
}

export function initRegistroTroca(sequelize: Sequelize): typeof RegistroTroca {
  RegistroTroca.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    veiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    peca_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    oficina_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    nome_oficina_manual: {
      type: DataTypes.STRING,
      allowNull: true
    },
    km_na_troca: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    data_troca: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    km_previsto_proximo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    data_prevista_proximo: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    executado_por: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'RegistroTroca',
    tableName: 'registros_troca',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return RegistroTroca;
}

export default (sequelize: Sequelize) => initRegistroTroca(sequelize);
