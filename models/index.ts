import { Sequelize, DataTypes } from 'sequelize';
import { Usuario, initUsuario } from './Usuario';
import { Cliente, initCliente } from './Cliente';
import { Veiculo, initVeiculo } from './Veiculo';
import { MarcaVeiculo, initMarcaVeiculo } from './MarcaVeiculo';
import { ModeloVeiculo, initModeloVeiculo } from './ModeloVeiculo';
import { MarcaPeca, initMarcaPeca } from './MarcaPeca';
import { Peca, initPeca } from './Peca';
import { Servico, initServico } from './Servico';
import { Oficina, initOficina } from './Oficina';
import { RegistroTroca, initRegistroTroca } from './RegistroTroca';
import { RegistroServico, initRegistroServico } from './RegistroServico';
import { Agendamento, initAgendamento } from './Agendamento';
import { Notificacao, initNotificacao } from './Notificacao';
import { LogLgpd, initLogLgpd } from './LogLgpd';
import { NivelAcesso, initNivelAcesso } from './NivelAcesso';
import { LogAuditoria, initLogAuditoria } from './LogAuditoria';

const env = process.env.NODE_ENV || 'development';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const configAll = require('../config/config.js');
const config = configAll[env];

let sequelize: Sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable] as string, config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Inicializar modelos
initNivelAcesso(sequelize);
initUsuario(sequelize);
initCliente(sequelize);
initMarcaVeiculo(sequelize);
initModeloVeiculo(sequelize);
initVeiculo(sequelize);
initMarcaPeca(sequelize);
initPeca(sequelize);
initServico(sequelize);
initOficina(sequelize);
initRegistroTroca(sequelize);
initRegistroServico(sequelize);
initAgendamento(sequelize);
initNotificacao(sequelize);
initLogLgpd(sequelize);
initLogAuditoria(sequelize);

export interface IDatabaseContext {
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
  NivelAcesso: typeof NivelAcesso;
  Usuario: typeof Usuario;
  Cliente: typeof Cliente;
  Veiculo: typeof Veiculo;
  MarcaVeiculo: typeof MarcaVeiculo;
  ModeloVeiculo: typeof ModeloVeiculo;
  MarcaPeca: typeof MarcaPeca;
  Peca: typeof Peca;
  Servico: typeof Servico;
  Oficina: typeof Oficina;
  RegistroTroca: typeof RegistroTroca;
  RegistroServico: typeof RegistroServico;
  Agendamento: typeof Agendamento;
  Notificacao: typeof Notificacao;
  LogLgpd: typeof LogLgpd;
  LogAuditoria: typeof LogAuditoria;
}

const db: IDatabaseContext = {
  sequelize,
  Sequelize,
  NivelAcesso,
  Usuario,
  Cliente,
  Veiculo,
  MarcaVeiculo,
  ModeloVeiculo,
  MarcaPeca,
  Peca,
  Servico,
  Oficina,
  RegistroTroca,
  RegistroServico,
  Agendamento,
  Notificacao,
  LogLgpd,
  LogAuditoria
};

// Executar associações com tipagem estrita
const modelList = [
  NivelAcesso, Usuario, Cliente, Veiculo, MarcaVeiculo, ModeloVeiculo,
  MarcaPeca, Peca, Servico, Oficina, RegistroTroca,
  RegistroServico, Agendamento, Notificacao, LogLgpd, LogAuditoria
];

modelList.forEach((model) => {
  const modelComAssociate = model as unknown as { associate?: (context: IDatabaseContext) => void };
  if (typeof modelComAssociate.associate === 'function') {
    modelComAssociate.associate(db);
  }
});

export {
  sequelize,
  Sequelize,
  NivelAcesso,
  Usuario,
  Cliente,
  Veiculo,
  MarcaVeiculo,
  ModeloVeiculo,
  MarcaPeca,
  Peca,
  Servico,
  Oficina,
  RegistroTroca,
  RegistroServico,
  Agendamento,
  Notificacao,
  LogLgpd,
  LogAuditoria,
  db
};

export default db;

// Compatibilidade CommonJS
module.exports = db;
module.exports.default = db;
