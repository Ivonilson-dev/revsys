import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { Usuario } from './Usuario';
import type { IDatabaseContext } from './index';

export interface NotificacaoAttributes {
  id: number;
  tipo: 'solicitacao_cliente' | 'alerta_troca' | 'lembrete_agendamento';
  mensagem: string;
  lida: boolean;
  usuario_id: number;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface NotificacaoCreationAttributes extends Optional<NotificacaoAttributes, 'id' | 'lida' | 'criado_em' | 'atualizado_em'> {}

export class Notificacao extends Model<NotificacaoAttributes, NotificacaoCreationAttributes> implements NotificacaoAttributes {
  declare id: number;
  declare tipo: 'solicitacao_cliente' | 'alerta_troca' | 'lembrete_agendamento';
  declare mensagem: string;
  declare lida: boolean;
  declare usuario_id: number;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare usuario?: Usuario;

  public static associate(models: IDatabaseContext): void {
    Notificacao.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario'
    });
  }
}

export function initNotificacao(sequelize: Sequelize): typeof Notificacao {
  Notificacao.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    tipo: {
      type: DataTypes.ENUM('solicitacao_cliente', 'alerta_troca', 'lembrete_agendamento'),
      allowNull: false
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    lida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Notificacao',
    tableName: 'notificacoes',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Notificacao;
}

export default (sequelize: Sequelize) => initNotificacao(sequelize);
