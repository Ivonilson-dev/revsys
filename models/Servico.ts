import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { RegistroServico } from './RegistroServico';
import type { Agendamento } from './Agendamento';
import type { IDatabaseContext } from './index';

export interface ServicoAttributes {
  id: number;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  preco_padrao?: number | string | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface ServicoCreationAttributes extends Optional<ServicoAttributes, 'id' | 'descricao' | 'categoria' | 'preco_padrao' | 'criado_em' | 'atualizado_em'> {}

export class Servico extends Model<ServicoAttributes, ServicoCreationAttributes> implements ServicoAttributes {
  declare id: number;
  declare nome: string;
  declare descricao: string | null;
  declare categoria: string | null;
  declare preco_padrao: number | string | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare registros_servico?: RegistroServico[];
  declare agendamentos?: Agendamento[];

  public static associate(models: IDatabaseContext): void {
    Servico.hasMany(models.RegistroServico, {
      foreignKey: 'servico_id',
      as: 'registros_servico',
      onDelete: 'RESTRICT'
    });
    Servico.hasMany(models.Agendamento, {
      foreignKey: 'servico_id',
      as: 'agendamentos',
      onDelete: 'RESTRICT'
    });
  }
}

export function initServico(sequelize: Sequelize): typeof Servico {
  Servico.init({
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
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: true
    },
    preco_padrao: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Servico',
    tableName: 'servicos',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Servico;
}

export default (sequelize: Sequelize) => initServico(sequelize);
