import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import { StatusAgendamento, ConfirmacaoPresenca } from '../src/types';
import type { Cliente } from './Cliente';
import type { Veiculo } from './Veiculo';
import type { Usuario } from './Usuario';
import type { Servico } from './Servico';
import type { IDatabaseContext } from './index';

export interface AgendamentoAttributes {
  id: number;
  cliente_id: number;
  veiculo_id: number;
  servico_id?: number | null;
  data_agendada: string | Date;
  horario_agendado: string;
  duracao_minutos: number;
  horario_fim?: string | null;
  status: StatusAgendamento;
  confirmacao_presenca: ConfirmacaoPresenca;
  confirmacao_solicitada_em?: Date | null;
  confirmacao_adiada_ate?: Date | null;
  confirmado_em?: Date | null;
  motivo_revisao: string;
  observacoes?: string | null;
  motivo_cancelamento?: string | null;
  criado_por: number;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface AgendamentoCreationAttributes extends Optional<AgendamentoAttributes, 'id' | 'servico_id' | 'duracao_minutos' | 'horario_fim' | 'status' | 'confirmacao_presenca' | 'confirmacao_solicitada_em' | 'confirmacao_adiada_ate' | 'confirmado_em' | 'observacoes' | 'motivo_cancelamento' | 'criado_em' | 'atualizado_em'> {}

export class Agendamento extends Model<AgendamentoAttributes, AgendamentoCreationAttributes> implements AgendamentoAttributes {
  declare id: number;
  declare cliente_id: number;
  declare veiculo_id: number;
  declare servico_id: number | null;
  declare data_agendada: string | Date;
  declare horario_agendado: string;
  declare duracao_minutos: number;
  declare horario_fim: string | null;
  declare status: StatusAgendamento;
  declare confirmacao_presenca: ConfirmacaoPresenca;
  declare confirmacao_solicitada_em: Date | null;
  declare confirmacao_adiada_ate: Date | null;
  declare confirmado_em: Date | null;
  declare motivo_revisao: string;
  declare observacoes: string | null;
  declare motivo_cancelamento: string | null;
  declare criado_por: number;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare cliente?: Cliente;
  declare veiculo?: Veiculo;
  declare criador?: Usuario;
  declare servico?: Servico;

  public static associate(models: IDatabaseContext): void {
    Agendamento.belongsTo(models.Cliente, {
      foreignKey: 'cliente_id',
      as: 'cliente',
      onDelete: 'RESTRICT'
    });
    Agendamento.belongsTo(models.Veiculo, {
      foreignKey: 'veiculo_id',
      as: 'veiculo',
      onDelete: 'RESTRICT'
    });
    Agendamento.belongsTo(models.Usuario, {
      foreignKey: 'criado_por',
      as: 'criador',
      onDelete: 'RESTRICT'
    });
    Agendamento.belongsTo(models.Servico, {
      foreignKey: 'servico_id',
      as: 'servico',
      onDelete: 'RESTRICT'
    });
  }
}

export function initAgendamento(sequelize: Sequelize): typeof Agendamento {
  Agendamento.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    veiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    servico_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    data_agendada: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    horario_agendado: {
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    duracao_minutos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60
    },
    horario_fim: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('agendado', 'concluido', 'cancelado'),
      allowNull: false,
      defaultValue: 'agendado'
    },
    confirmacao_presenca: {
      type: DataTypes.ENUM('pendente', 'solicitada', 'confirmada'),
      allowNull: false,
      defaultValue: 'pendente'
    },
    confirmacao_solicitada_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmacao_adiada_ate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    motivo_revisao: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    motivo_cancelamento: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Agendamento',
    tableName: 'agendamentos',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em'
  });

  return Agendamento;
}

export default (sequelize: Sequelize) => initAgendamento(sequelize);
