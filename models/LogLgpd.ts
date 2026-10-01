import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { Cliente } from './Cliente';
import type { IDatabaseContext } from './index';

export interface LogLgpdAttributes {
  id: number;
  cliente_id: number;
  consentimento_dado: boolean;
  ip_origem?: string | null;
  user_agent?: string | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface LogLgpdCreationAttributes extends Optional<LogLgpdAttributes, 'id' | 'consentimento_dado' | 'ip_origem' | 'user_agent' | 'criado_em' | 'atualizado_em'> {}

export class LogLgpd extends Model<LogLgpdAttributes, LogLgpdCreationAttributes> implements LogLgpdAttributes {
  declare id: number;
  declare cliente_id: number;
  declare consentimento_dado: boolean;
  declare ip_origem: string | null;
  declare user_agent: string | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare cliente?: Cliente;

  public static associate(models: IDatabaseContext): void {
    LogLgpd.belongsTo(models.Cliente, {
      foreignKey: 'cliente_id',
      as: 'cliente'
    });
  }
}

export function initLogLgpd(sequelize: Sequelize): typeof LogLgpd {
  LogLgpd.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    consentimento_dado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ip_origem: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LogLgpd',
    tableName: 'logs_lgpd',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return LogLgpd;
}

export default (sequelize: Sequelize) => initLogLgpd(sequelize);
