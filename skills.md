# Habilidades e Guias Tecnológicos (Skills) - RevSys

Este documento descreve as capacidades operacionais, padrões de código e procedimentos de manutenção recomendados para os agentes que atuarem no projeto **RevSys**.

---

## 1. Padrão de Controladores e Rotas

### Estrutura Base de Controller
Todos os controllers seguem o padrão de métodos estáticos assíncronos. Tratamento de exceções com `try/catch` e logs descritivos no console são obrigatórios.

```javascript
// Exemplo de Controller no RevSys
const { Modelo, sequelize } = require('../../models');

class ExemploController {
  static async listar(req, res) {
    try {
      const dados = await Modelo.findAll({
        order: [['nome', 'ASC']]
      });
      return res.render('modulo/index', { dados });
    } catch (error) {
      console.error('Erro em ExemploController.listar:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }
}

module.exports = ExemploController;
```

### Proteção de Rotas e Middlewares RBAC
O sistema de controle de acesso utiliza o middleware `estaAutenticado` e `temPapel`:

```javascript
const { estaAutenticado, temPapel } = require('../middlewares/autenticacao');

// Exemplo de rota restrita para perfil administrativo e operacional
router.post('/troca', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), TrocaController.registrar);
```

---

## 2. Manipulação de Criptografia e LGPD (CPF de Clientes)

Para garantir o cumprimento da LGPD, os campos sensíveis (como o CPF) **nunca** devem ser lidos ou gravados em texto claro no banco de dados.

### Gravação de Cliente com Criptografia e Blind Index
```javascript
const { encrypt, generateBlindIndex } = require('../utils/criptografia');

const cpfLimpo = cpf.replace(/\D/g, '');
const cpfCriptografado = encrypt(cpfLimpo);
const cpfHash = generateBlindIndex(cpfLimpo);

await Cliente.create({
  usuario_id: usuario.id,
  cpf: cpfCriptografado,
  cpf_hash: cpfHash,
  // ...outros campos
});
```

### Busca por CPF (Blind Index)
```javascript
const { generateBlindIndex, decrypt } = require('../utils/criptografia');

const cpfHash = generateBlindIndex(cpfBusca.replace(/\D/g, ''));
const cliente = await Cliente.findOne({ where: { cpf_hash: cpfHash } });
if (cliente) {
  const cpfDecriptografado = decrypt(cliente.cpf);
}
```

---

## 3. Gestão de Transações de Banco de Dados (`sequelize.transaction`)

Sempre que uma operação envolver mais de uma gravação/atualização (ex: inserção de registro de troca/serviço + atualização do KM do veículo), utilize **obrigatoriamente** transações do Sequelize para garantir atomicidade.

```javascript
const { sequelize, RegistroTroca, Veiculo } = require('../../models');

const t = await sequelize.transaction();
try {
  const novaTroca = await RegistroTroca.create({
    veiculo_id,
    peca_id,
    km_na_troca,
    // ...
  }, { transaction: t });

  if (atualizar_km_veiculo) {
    await Veiculo.update(
      { km_atual: parseInt(km_na_troca) },
      { where: { id: veiculo_id }, transaction: t }
    );
  }

  await t.commit();
  return res.redirect(`/veiculos/${veiculo_id}?sucesso=Registro concluído`);
} catch (error) {
  await t.rollback();
  console.error('Erro na transação:', error);
  return res.status(500).send('Erro interno');
}
```

---

## 4. Estratégia de Caching (`src/utils/cache.js`)

Para otimizar o desempenho, o sistema utiliza o `node-cache` para armazenar em memória dados cadastrais auxiliares (marcas, modelos, peças, serviços, oficinas).

### Consulta com Cache
```javascript
const cache = require('../utils/cache');

// Busca do cache ou carrega do banco se expirado/vazio
let servicos = cache.get(cache.KEYS.SERVICOS);
if (!servicos) {
  servicos = await Servico.findAll({ order: [['nome', 'ASC']] });
  cache.set(cache.KEYS.SERVICOS, servicos);
}
```

### Invalidação Obrigatória no Mutate
Sempre que um item for **criado, alterado ou excluído**, deve-se chamar `cache.del()` para a chave correspondente:

```javascript
await Servico.create({ nome, categoria, preco_padrao });
cache.del(cache.KEYS.SERVICOS); // Invalida o cache para recarregar na próxima leitura
```

---

## 5. Sincronização e Manutenção do Banco de Dados

### Atualizando Schemas
Ao criar ou alterar campos em um modelo Sequelize:
1. Atualize a classe correspondente em `models/`.
2. Adicione/ajuste a instrução DDL equivalente no arquivo `banco.sql`.
3. Atualize o seeder em `seeders/20260717000001-dados-iniciais.js`.
4. Se o banco MySQL local já estiver em execução, execute um script scratch via `sequelize.query()` ou `ALTER TABLE` para aplicar a alteração no banco ativo sem perder dados.
