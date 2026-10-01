# Habilidades e Guias Tecnológicos (Skills) - RevSys

Este documento descreve as capacidades operacionais, padrões de código e procedimentos de manutenção recomendados para os agentes que atuarem no projeto **RevSys** em **TypeScript**.

---

## 1. Padrão de Controladores e Rotas (TypeScript)

### Estrutura Base de Controller
Todos os controllers seguem o padrão de métodos estáticos assíncronos fortemente tipados com `Request` e `Response` do Express. Tratamento de exceções com `try/catch` e logs descritivos no console são obrigatórios.

```typescript
// Exemplo de Controller no RevSys (TypeScript)
import { Request, Response } from 'express';
import { Modelo, sequelize } from '../../models';

export class ExemploController {
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const dados = await Modelo.findAll({
        order: [['nome', 'ASC']]
      });
      res.render('modulo/index', { dados });
    } catch (error) {
      console.error('Erro em ExemploController.listar:', error);
      res.status(500).send('Erro interno do servidor');
    }
  }
}
```

### Proteção de Rotas e Middlewares RBAC
O sistema de controle de acesso utiliza o middleware `estaAutenticado` e `temPapel` localizado em `src/middlewares/autorizacao.ts`:

```typescript
import { estaAutenticado, temPapel } from '../middlewares/autorizacao';
import { TrocaController } from '../controllers/TrocaController';

// Exemplo de rota restrita para perfil administrativo e operacional
router.post('/troca', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), TrocaController.registrar);
```

---

## 2. Manipulação de Criptografia e LGPD (CPF de Clientes)

Para garantir o cumprimento da LGPD, os campos sensíveis (como o CPF) **nunca** devem ser lidos ou gravados em texto claro no banco de dados.

### Gravação de Cliente com Criptografia e Blind Index
```typescript
import { encrypt, generateBlindIndex } from '../utils/crypto';
import { Cliente } from '../../models';

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
```typescript
import { generateBlindIndex, decrypt } from '../utils/crypto';
import { Cliente } from '../../models';

const cpfHash = generateBlindIndex(cpfBusca.replace(/\D/g, ''));
const cliente = await Cliente.findOne({ where: { cpf_hash: cpfHash } });
if (cliente && cliente.cpf) {
  const cpfDecriptografado = decrypt(cliente.cpf);
}
```

---

## 3. Gestão de Transações de Banco de Dados (`sequelize.transaction`)

Sempre que uma operação envolver mais de uma gravação/atualização (ex: inserção de registro de troca/serviço + atualização do KM do veículo), utilize **obrigatoriamente** transações do Sequelize para garantir atomicidade.

```typescript
import { sequelize, RegistroTroca, Veiculo } from '../../models';

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

## 4. Estratégia de Caching (`src/utils/cache.ts`)

Para otimizar o desempenho, o sistema utiliza o `node-cache` para armazenar em memória dados cadastrais auxiliares (marcas, modelos, peças, serviços, oficinas).

### Consulta com Cache
```typescript
import cache from '../utils/cache';
import { Servico } from '../../models';

// Busca do cache ou carrega do banco se expirado/vazio
let servicos = cache.get(cache.KEYS.SERVICOS);
if (!servicos) {
  servicos = await Servico.findAll({ order: [['nome', 'ASC']] });
  cache.set(cache.KEYS.SERVICOS, servicos);
}
```

### Invalidação Obrigatória no Mutate
Sempre que um item for **criado, alterado ou excluído**, deve-se chamar `cache.del()` para a chave correspondente:

```typescript
await Servico.create({ nome, categoria, preco_padrao });
cache.del(cache.KEYS.SERVICOS); // Invalida o cache para recarregar na próxima leitura
```

---

## 5. Sincronização e Manutenção do Banco de Dados

### Atualizando Schemas
Ao criar ou alterar campos em um modelo Sequelize:
1. Atualize a classe correspondente em `models/` usando tipagem estrita (`declare` attributes).
2. Adicione/ajuste a instrução DDL equivalente no arquivo `banco.sql` e em `scripts_bd_producao.md`.
3. Atualize o seeder em `seeders/20260717000001-dados-iniciais.js` ou seeders equivalentes.
4. Se o banco MySQL local já estiver em execução, execute um script scratch via `sequelize.query()` ou `ALTER TABLE` para aplicar a alteração no banco ativo sem perder dados.
5. Execute `npm run build && npm run typecheck` para assegurar que nenhum tipo foi corrompido.

---

## 6. Tratamento de Erros, Resiliência e Feedback Visual Amigável

### 6.1 Resiliência de Conexão com o Banco (`src/utils/erros.ts`)
Para evitar que o usuário veja mensagens técnicas de conexão ou páginas de crash ao desligar ou reiniciar o banco de dados:
```typescript
import { isDbConnectionError, renderDbError } from '../utils/erros';

try {
  // Operações com o banco
} catch (error) {
  if (isDbConnectionError(error)) {
    return renderDbError(req, res, error);
  }
  // Outros tratamentos
}
```
*Em requisições HTML normais, é renderizada a tela `views/erros/banco.ejs` (com CSS offline autônomo), instruindo a conferência da internet e o contato com o suporte técnico.*

### 6.2 Validações de Formulário sem Telas Brancas
Nunca envie respostas cruas como `res.status(400).send("Texto técnico...")`. Sempre redirecione com parâmetros amigáveis ou renderize a view com o layout preservado:
```typescript
if (kmInformado < veiculo.km_atual) {
  const mensagem = `A quilometragem informada (${kmInformado} km) não pode ser inferior ao último registro do veículo (${veiculo.km_atual} km). Por favor, verifique o hodômetro do veículo.`;
  return res.redirect(`/veiculos/${veiculo_id}?erro=${encodeURIComponent(mensagem)}`);
}
```
*Na view, utilize modais SweetAlert2 e banners Tailwind CSS com ícones do Lucide Icons.*

### 6.3 Disparo Dinâmico de Notificações Internas
Ao registrar ações críticas (como a confirmação de presença em agendamentos), crie notificações completas que facilitem a identificação rápida pela oficina:
```typescript
await Notificacao.create({
  tipo: 'lembrete_agendamento',
  mensagem: `Agendamento de revisão confirmado para o veículo ${modelo} (${placa}) - Cliente: ${nomeCliente} no dia ${dataFmt} às ${hora}.`,
  usuario_id: usuarioDestinoId,
  lida: false
});
```
