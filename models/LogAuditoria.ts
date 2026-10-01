import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { Usuario } from './Usuario';
import type { IDatabaseContext } from './index';

export type TipoAcaoAuditoria = 
  | 'LOGIN'
  | 'LOGIN_FALHA'
  | 'LOGOUT'
  | 'CRIAR'
  | 'ATUALIZAR'
  | 'EXCLUIR'
  | 'CONSULTAR'
  | 'CANCELAR'
  | 'CONFIRMAR_PRESENCA'
  | 'ADIAR_PRESENCA'
  | 'INATIVAR'
  | 'REATIVAR';

export interface LogAuditoriaAttributes {
  id: number;
  usuario_id?: number | null;
  usuario_nome?: string | null;
  usuario_email?: string | null;
  usuario_papel?: string | null;
  acao: TipoAcaoAuditoria;
  recurso: string;
  registro_id?: string | null;
  descricao: string;
  dados_anteriores?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
  ip?: string | null;
  user_agent?: string | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface LogAuditoriaCreationAttributes extends Optional<
  LogAuditoriaAttributes,
  | 'id'
  | 'usuario_id'
  | 'usuario_nome'
  | 'usuario_email'
  | 'usuario_papel'
  | 'registro_id'
  | 'dados_anteriores'
  | 'dados_novos'
  | 'ip'
  | 'user_agent'
  | 'criado_em'
  | 'atualizado_em'
> {}

export class LogAuditoria extends Model<LogAuditoriaAttributes, LogAuditoriaCreationAttributes> implements LogAuditoriaAttributes {
  declare id: number;
  declare usuario_id: number | null;
  declare usuario_nome: string | null;
  declare usuario_email: string | null;
  declare usuario_papel: string | null;
  declare acao: TipoAcaoAuditoria;
  declare recurso: string;
  declare registro_id: string | null;
  declare descricao: string;
  declare dados_anteriores: Record<string, unknown> | null;
  declare dados_novos: Record<string, unknown> | null;
  declare ip: string | null;
  declare user_agent: string | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare usuario?: Usuario;

  public static associate(models: IDatabaseContext): void {
    LogAuditoria.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
      onDelete: 'SET NULL'
    });
  }
}

export function initLogAuditoria(sequelize: Sequelize): typeof LogAuditoria {
  LogAuditoria.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    usuario_nome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    usuario_email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    usuario_papel: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    acao: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    recurso: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    registro_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    dados_anteriores: {
      type: DataTypes.JSON,
      allowNull: true
    },
    dados_novos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LogAuditoria',
    tableName: 'logs_auditoria',
    underscored: true,
    timestamps: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    indexes: [
      { fields: ['criado_em'] },
      { fields: ['usuario_id'] },
      { fields: ['acao'] },
      { fields: ['recurso'] }
    ]
  });

  return LogAuditoria;
}
