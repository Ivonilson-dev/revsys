const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
const { Sequelize } = require('sequelize');
const { encrypt } = require('../dist/src/utils/crypto');
const crypto = require('crypto');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'revsys',
  process.env.DB_USER || 'root',
  process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

function gerarHash(cpfLimpo) {
  return crypto.createHash('sha256').update(cpfLimpo).digest('hex');
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado ao MySQL local.');
    console.log('Chave AES utilizada:', process.env.AES_KEY);

    const clientes = [
      {
        id: 1,
        cpf: '12345678900',
        logradouro: 'Rua das Flores',
        numero: '123',
        bairro: 'Jardim Primavera',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234567',
        telefone_whatsapp: '11988887777'
      },
      {
        id: 2,
        cpf: '98765432111',
        logradouro: 'Avenida Paulista',
        numero: '1500',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01310100',
        telefone_whatsapp: '11977776666'
      },
      {
        id: 3,
        cpf: '45678901222',
        logradouro: 'Rua XV de Novembro',
        numero: '450',
        bairro: 'Centro',
        cidade: 'Curitiba',
        estado: 'PR',
        cep: '80020310',
        telefone_whatsapp: '11966665555'
      }
    ];

    for (const c of clientes) {
      const cpfEnc = encrypt(c.cpf);
      const cpfHash = gerarHash(c.cpf);
      const logrEnc = encrypt(c.logradouro);
      const numEnc = encrypt(c.numero);
      const bairroEnc = encrypt(c.bairro);
      const cidEnc = encrypt(c.cidade);
      const estEnc = encrypt(c.estado);
      const cepEnc = encrypt(c.cep);
      const telEnc = encrypt(c.telefone_whatsapp);

      await sequelize.query(`
        UPDATE clientes 
        SET cpf = ?, cpf_hash = ?, logradouro = ?, numero = ?, bairro = ?, cidade = ?, estado = ?, cep = ?, telefone_whatsapp = ?
        WHERE id = ?
      `, {
        replacements: [cpfEnc, cpfHash, logrEnc, numEnc, bairroEnc, cidEnc, estEnc, cepEnc, telEnc, c.id]
      });

      console.log(`Cliente ${c.id} atualizado com sucesso!`);
    }

    console.log('🎉 Todos os clientes de teste foram re-criptografados com a chave atual!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

run();
