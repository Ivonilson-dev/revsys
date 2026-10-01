import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { Veiculo } from './Veiculo';
import type { Servico } from './Servico';
import type { Oficina } from './Oficina';
import type { IDatabaseContext } from './index';

export interface RegistroServicoAttributes {
  id: number;
  veiculo_id: number;
  servico_id: number;
  oficina_id?: number | null;
  nome_oficina_manual?: string | null;
  km_no_servico: number;
  data_servico: string | Date;
  km_previsto_proximo?: number | null;
  data_prevista_proximo?: string | Date | null;
  executado_por: string;
  observacoes?: string | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface RegistroServicoCreationAttributes extends Optional<RegistroServicoAttributes, 'id' | 'oficina_id' | 'nome_oficina_manual' | 'data_servico' | 'km_previsto_proximo' | 'data_prevista_proximo' | 'observacoes' | 'criado_em' | 'atualizado_em'> {}

export class RegistroServico extends Model<RegistroServicoAttributes, RegistroServicoCreationAttributes> implements RegistroServicoAttributes {
  declare id: number;
  declare veiculo_id: number;
  declare servico_id: number;
  declare oficina_id: number | null;
  declare nome_oficina_manual: string | null;
  declare km_no_servico: number;
  declare data_servico: string | Date;
  declare km_previsto_proximo: number | null;
  declare data_prevista_proximo: string | Date | null;
  declare executado_por: string;
  declare observacoes: string | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare veiculo?: Veiculo;
  declare servico?: Servico;
  declare oficina?: Oficina;

  public static associate(models: IDatabaseContext): void {
    RegistroServico.belongsTo(models.Veiculo, {
      foreignKey: 'veiculo_id',
      as: 'veiculo',
      onDelete: 'RESTRICT'
    });
    RegistroServico.belongsTo(models.Servico, {
      foreignKey: 'servico_id',
      as: 'servico',
      onDelete: 'RESTRICT'
    });
    RegistroServico.belongsTo(models.Oficina, {
      foreignKey: 'oficina_id',
      as: 'oficina',
      onDelete: 'RESTRICT'
    });
  }
}

export function initRegistroServico(sequelize: Sequelize): typeof RegistroServico {
  RegistroServico.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    veiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    servico_id: {
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
    km_no_servico: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    data_servico: {
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
    modelName: 'RegistroServico',
    tableName: 'registros_servico',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return RegistroServico;
}

export default (sequelize: Sequelize) => initRegistroServico(sequelize);
