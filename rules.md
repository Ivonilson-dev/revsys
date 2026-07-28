# Regras Invioláveis de Desenvolvimento (Rules) - RevSys

Este documento estabelece as **regras obrigatórias e invioláveis** que qualquer agente de IA ou desenvolvedor deve seguir rigorosamente ao dar manutenção ou expandir o sistema **RevSys**.

---

## 🛑 Regra 1: Idioma das Interações e Documentação
- **Comunicação estritamente em Português do Brasil (pt-br)**.
- Todos os comentários de código, mensagens de commit/resumo e documentações devem ser escritos em pt-br.

---

## 🛑 Regra 2: Restrição Estrita e Proibição de Comandos Git por Agentes
- **APENAS o programador humano pode executar comandos no Git** (criação de branchs, commits, stashes, checkout, push, pull, status, etc.).
- **Os agentes de IA JAMAIS devem executar qualquer tipo de ação ou comando Git** no terminal.
- Caso sejam necessárias ações no versionamento, o agente deve apenas instruir ou avisar o usuário para que o mesmo execute os comandos manualmente na pasta do projeto (`c:\Projetos\RevSys\`).

---

## 🛑 Regra 3: Ordenação Alfabética Obrigatória em Listas e Selects (RF-02)
- **TODOS** os selects, dropdowns, tabelas e listagens de dados cadastrais (Marcas de Veículo, Modelos de Veículo, Marcas de Peça, Peças, Serviços, Clientes, Oficinas) **DEVEM** ser retornados obrigatoriamente ordenados por nome em ordem alfabética (`order: [['nome', 'ASC']]`).
- Na consulta de **Peças**, ordene prioritariamente pelo nome do fabricante/marca e secundariamente pelo nome da peça:
  ```javascript
  order: [
    [{ model: MarcaPeca, as: 'marca' }, 'nome', 'ASC'],
    ['nome', 'ASC']
  ]
  ```

---

## 🛑 Regra 4: Uso Obrigatório de Transações SQL para Gravações Múltiplas
- Qualquer rota ou serviço que modifique mais de uma tabela no mesmo fluxo (ex: criar `RegistroTroca` ou `RegistroServico` e atualizar o `km_atual` em `Veiculo`) **DEVE** utilizar transações (`sequelize.transaction()`).
- O rollback deve ser executado obrigatoriamente no bloco `catch`.

---

## 🛑 Regra 5: Invalidação Imediata de Cache
- Sempre que houver uma inserção (`CREATE`), atualização (`UPDATE`) ou exclusão (`DELETE`) em tabelas de dados mestre/auxiliares, a chave correspondente no `src/utils/cache.js` **DEVE** ser invalidada imediatamente (`cache.del(...)`).

---

## 🛑 Regra 6: Conformidade e Criptografia LGPD
- **NUNCA** grave CPF ou outros dados pessoais sensíveis em texto claro no banco de dados.
- Utilize sempre as funções utilitárias `encrypt` e `generateBlindIndex` presentes em `src/utils/criptografia.js`.
- O CPF criptografado deve ir para a coluna `cpf`, e o hash derivado do HMAC para a coluna `cpf_hash`.

---

## 🛑 Regra 7: Sincronização entre Modelos, `banco.sql` e Seeders
- Qualquer alteração na estrutura das tabelas ou criação de novos modelos Sequelize exige a atualização imediata e correspondente dos seguintes arquivos:
  1. O modelo em `models/`
  2. O script DDL/DML em `banco.sql`
  3. O seeder principal em `seeders/20260717000001-dados-iniciais.js`
  4. Execução de script de migração no banco ativo para manter o MySQL em paridade.

---

## 🛑 Regra 8: Preservação da Estética UI/UX
- As telas do RevSys foram desenhadas para proporcionar uma experiência visual moderna e fluida.
- Ao criar ou modificar views EJS:
  - Utilize as classes do **TailwindCSS** pré-configuradas no projeto (cards `bg-white rounded-2xl border border-slate-200 shadow-sm`, badges coloridos com legibilidade).
  - Inclua ícones descritivos da biblioteca **Lucide Icons**.
  - Mantenha responsividade total para telas móbiles e desktops.
