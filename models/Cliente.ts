import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import crypto from 'crypto';
import { encrypt, decrypt } from '../src/utils/crypto';
import type { Usuario } from './Usuario';
import type { Veiculo } from './Veiculo';
import type { Agendamento } from './Agendamento';
import type { LogLgpd } from './LogLgpd';
import type { IDatabaseContext } from './index';

export interface ClienteAttributes {
  id: number;
  usuario_id: number;
  cpf: string;
  cpf_hash: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone_whatsapp?: string | null;
  consentimento_lgpd: boolean;
  data_consentimento_lgpd?: Date | null;
  ativo: boolean;
  motivo_inativacao?: string | null;
  inativado_em?: Date | null;
  criado_em?: Date;
  atualizado_em?: Date;
}

export interface ClienteCreationAttributes extends Optional<ClienteAttributes, 'id' | 'cpf_hash' | 'logradouro' | 'numero' | 'bairro' | 'cidade' | 'estado' | 'cep' | 'telefone_whatsapp' | 'consentimento_lgpd' | 'data_consentimento_lgpd' | 'ativo' | 'motivo_inativacao' | 'inativado_em' | 'criado_em' | 'atualizado_em'> {}

export class Cliente extends Model<ClienteAttributes, ClienteCreationAttributes> implements ClienteAttributes {
  declare id: number;
  declare usuario_id: number;
  declare cpf: string;
  declare cpf_hash: string;
  declare logradouro: string | null;
  declare numero: string | null;
  declare bairro: string | null;
  declare cidade: string | null;
  declare estado: string | null;
  declare cep: string | null;
  declare telefone_whatsapp: string | null;
  declare consentimento_lgpd: boolean;
  declare data_consentimento_lgpd: Date | null;
  declare ativo: boolean;
  declare motivo_inativacao: string | null;
  declare inativado_em: Date | null;
  declare readonly criado_em: Date;
  declare readonly atualizado_em: Date;

  // Associações
  declare usuario?: Usuario;
  declare veiculos?: Veiculo[];
  declare agendamentos?: Agendamento[];
  declare logs_lgpd?: LogLgpd[];

  public static associate(models: IDatabaseContext): void {
    Cliente.belongsTo(models.Usuario, {
      foreignKey: 'usuario_id',
      as: 'usuario',
      onDelete: 'RESTRICT'
    });
    Cliente.hasMany(models.Veiculo, {
      foreignKey: 'cliente_id',
      as: 'veiculos',
      onDelete: 'RESTRICT'
    });
    Cliente.hasMany(models.Agendamento, {
      foreignKey: 'cliente_id',
      as: 'agendamentos',
      onDelete: 'RESTRICT'
    });
    Cliente.hasMany(models.LogLgpd, {
      foreignKey: 'cliente_id',
      as: 'logs_lgpd',
      onDelete: 'CASCADE'
    });
  }
}

export function initCliente(sequelize: Sequelize): typeof Cliente {
  Cliente.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cpf: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const value = this.getDataValue('cpf');
        return value ? decrypt(value) : value;
      },
      set(value: string) {
        this.setDataValue('cpf', value ? encrypt(value) : value);
      }
    },
    cpf_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    logradouro: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('logradouro');
        return value ? decrypt(value) : value;
      },
      set(value: string | null) {
        this.setDataValue('logradouro', value ? encrypt(value) : value);
      }
    },
    numero: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('numero');
        return value ? decrypt(value) : value;
      },
      set(value: string | null) {
        this.setDataValue('numero', value ? encrypt(value) : value);
      }
    },
    bairro: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('bairro');
        return value ? decrypt(value) : value;
      },
      set(value: string | null) {
        this.setDataValue('bairro', value ? encrypt(value) : value);
      }
    },
    cidade: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('cidade');
        return value ? decrypt(value) : value;
      },
      set(value: string | null) {
        this.setDataValue('cidade', value ? encrypt(value) : value);
      }
    },
    estado: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('estado');
        return value ? decrypt(value) : value;
      },
      set(value: string | null) {
        this.setDataValue('estado', value ? encrypt(value) : value);
      }
    },
    cep: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('cep');
        return value ? decrypt(value) : value;
      },
      set(value: string | null) {
        this.setDataValue('cep', value ? encrypt(value) : value);
      }
    },
    telefone_whatsapp: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('telefone_whatsapp');
        return value ? decrypt(value) : value;
      },
      set(value: string | null) {
        this.setDataValue('telefone_whatsapp', value ? encrypt(value) : value);
      }
    },
    consentimento_lgpd: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    data_consentimento_lgpd: {
      type: DataTypes.DATE,
      allowNull: true
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
    modelName: 'Cliente',
    tableName: 'clientes',
    underscored: true,
    createdAt: 'criado_em',
    updatedAt: 'atualizado_em',
    hooks: {
      beforeValidate: (cliente: Cliente) => {
        if (cliente.cpf) {
          const rawCpf = cliente.cpf;
          const cleanCpf = String(rawCpf).replace(/\D/g, '');
          cliente.cpf_hash = crypto.createHash('sha256').update(cleanCpf).digest('hex');
        }
      }
    }
  });

  return Cliente;
}

export default (sequelize: Sequelize) => initCliente(sequelize);
