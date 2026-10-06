# Diretrizes e Regras do Projeto RevSys (AGENTS.md)

Este documento define as regras obrigatórias e invioláveis para todos os agentes de IA, janelas de contexto e desenvolvedores atuando no repositório **RevSys**.

---

## 🛑 Regra 1: Idioma das Interações e Documentação
- **Comunicação estritamente em Português do Brasil (pt-br)**.
- Todos os comentários de código, mensagens, resumos técnicos e documentações devem ser escritos em pt-br.

---

## 🛑 Regra 2: Restrição Estrita e Proibição de Comandos Git por Agentes
- **APENAS o programador humano pode executar comandos no Git** (criação de branches, commits, stashes, checkout, push, pull, status, etc.).
- **Os agentes de IA JAMAIS devem executar qualquer tipo de comando Git no terminal** (`git status`, `git commit`, `git add`, `git branch`, etc. são terminantemente proibidos).
- Caso sejam necessárias ações no versionamento, o agente deve apenas instruir amigavelmente o usuário para que ele execute os comandos no terminal.

---

## 🛑 Regra 3: Ordenação Alfabética Obrigatória em Listas e Selects (RF-02)
- **TODOS** os selects, dropdowns, tabelas e listagens de dados cadastrais (Marcas de Veículo, Modelos de Veículo, Marcas de Peça, Peças, Serviços, Clientes, Oficinas) **DEVEM** ser retornados obrigatoriamente ordenados por nome em ordem alfabética (`order: [['nome', 'ASC']]`).
- Na consulta de **Peças**, ordene prioritariamente pelo nome do fabricante/marca e secundariamente pelo nome da peça:
  ```typescript
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
- Sempre que houver uma inserção (`CREATE`), atualização (`UPDATE`) ou exclusão (`DELETE`) em tabelas de dados mestre/auxiliares, a chave correspondente no `src/utils/cache.ts` **DEVE** ser invalidada imediatamente (`cache.del(...)`).

---

## 🛑 Regra 6: Conformidade e Criptografia LGPD
- **NUNCA** grave CPF ou outros dados pessoais sensíveis em texto claro no banco de dados.
- Utilize sempre as funções utilitárias `encrypt` e `generateBlindIndex` presentes em `src/utils/crypto.ts`.
- O CPF criptografado deve ir para a coluna `cpf`, e o hash derivado do HMAC para a coluna `cpf_hash`.

---

## 🛑 Regra 7: Sincronização entre Modelos, `banco.sql` e Seeders
- Qualquer alteração na estrutura das tabelas ou criação de novos modelos Sequelize exige a atualização imediata e correspondente dos seguintes arquivos:
  1. O modelo TypeScript em `models/`
  2. O script DDL/DML em `banco.sql` e `scripts_bd_producao.md`
  3. O seeder principal em `seeders/`
  4. Execução de script de migração no banco ativo para manter o MySQL em paridade.

---

## 🛑 Regra 8: Preservação da Estética UI/UX e Feedback Amigável
- As telas do RevSys foram desenhadas para proporcionar uma experiência visual moderna e fluida.
- Ao criar ou modificar views EJS:
  - Utilize as classes do **TailwindCSS** pré-configuradas no projeto (cards `bg-white rounded-2xl border border-slate-200 shadow-sm`, badges coloridos com legibilidade).
  - Inclua ícones descritivos da biblioteca **Lucide Icons**.
  - Mantenha responsividade total para telas mobiles e desktops.
  - **Proibição de Páginas em Branco e Jargões Técnicos**: Nunca retorne mensagens técnicas cruas (`res.status(400).send("Inconsistência lógica:...")`) que quebrem a experiência do usuário. Utilize redirecionamentos informativos (`?erro=...`) que acionem modais amigáveis (**SweetAlert2**) e banners visuais estilizados no padrão do sistema.
  - **Resiliência de Infraestrutura**: Em caso de perda de conexão de dados/banco, renderize a tela humanizada `views/erros/banco.ejs`, orientando a checagem de internet e o contato com o suporte.

---

## 🛑 Regra 9: Proibição de Acesso ao Navegador (Browser) por Agentes
- **APENAS o usuário humano acessa o navegador/browser para navegar, verificar e testar as alterações no sistema**.
- **Os agentes de IA JAMAIS devem acionar ferramentas de automação de navegador (browser subagents, scripts headless ou similares)** para abrir páginas, fazer login ou interagir com o sistema no navegador.
- Toda validação visual, conferência de layout e testes funcionais em tela pertencem estritamente ao usuário humano.

---

## 🛑 Regra 10: Atualização Contínua e Obrigatória de Todos os Arquivos `.md` de Documentação
- **À medida que o desenvolvimento for avançando, TODOS os arquivos `.md` do projeto (como `README.md`, `deploy_render.md`, `scripts_bd_producao.md`, `requisitos.md`, `specifications.md`, `rules.md`, `skills.md`, etc.) DEVEM ser rigorosamente atualizados para acompanhar e refletir as implementações realizadas**.
- **Sincronização Imediata com o Código**: Sempre que houver inclusão, refatoração, exclusão de funcionalidades, criação/alteração de rotas e controllers, alterações em esquemas de banco de dados, migrações, novas variáveis de ambiente ou alterações nos procedimentos de build e deploy (Render / HostGator MySQL), os agentes de IA e desenvolvedores devem atualizar a documentação nos respectivos arquivos Markdown antes de considerar o ciclo de desenvolvimento concluído.
- **Proibição de Documentação Obsoleta**: É expressamente proibido deixar documentações antigas, desatualizadas ou em desacordo com o código atual (TypeScript, Sequelize, EJS, rotinas de deploy, etc.). Toda janela de contexto e agente de IA deve inspecionar e manter a paridade documental com o estado atual do software.
