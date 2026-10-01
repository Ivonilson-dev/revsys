# Regras do Projeto RevSys (.agents/rules/regras_projeto.md)

Este documento contém as diretrizes e regras invioláveis aplicáveis a todas as sessões e agentes de IA que operam no repositório **RevSys**.

---

## 🛑 Regra 1: Idioma das Interações e Documentação
- Comunicação estritamente em **Português do Brasil (pt-br)**.
- Todos os comentários de código, documentações e explicações devem ser redigidos em pt-br.

---

## 🛑 Regra 2: Restrição Estrita e Proibição de Comandos Git por Agentes
- **APENAS o programador humano executa comandos Git**.
- O agente de IA **JAMAIS** deve executar comandos do Git no terminal (`git status`, `git commit`, `git add`, `git push`, etc.). Apenas oriente o usuário quando necessário.

---

## 🛑 Regra 3: Ordenação Alfabética Obrigatória em Listas e Selects (RF-02)
- **TODOS** os selects, dropdowns, tabelas e listagens de dados cadastrais (Marcas de Veículo, Modelos de Veículo, Marcas de Peça, Peças, Serviços, Clientes, Oficinas) **DEVEM** ser retornados obrigatoriamente ordenados por nome em ordem alfabética (`order: [['nome', 'ASC']]`).
- Na consulta de Peças, ordene prioritariamente pelo nome da marca e secundariamente pelo nome da peça.

---

## 🛑 Regra 4: Uso Obrigatório de Transações SQL para Gravações Múltiplas
- Qualquer operação que altere mais de uma tabela no mesmo fluxo (ex: registro de troca/serviço + atualização de KM do veículo) **DEVE** utilizar transações (`sequelize.transaction()`) com rollback no `catch`.

---

## 🛑 Regra 5: Invalidação Imediata de Cache
- Sempre que houver mutação (`CREATE`, `UPDATE`, `DELETE`) em tabelas mestre, a respectiva chave de cache em `src/utils/cache.ts` **DEVE** ser invalidada imediatamente (`cache.del(...)`).

---

## 🛑 Regra 6: Conformidade e Criptografia LGPD
- Nunca grave CPF em texto claro. Utilize `encrypt` e `generateBlindIndex` presentes em `src/utils/crypto.ts`.

---

## 🛑 Regra 7: Sincronização entre Modelos, `banco.sql` e Seeders
- Qualquer alteração estrutural no banco exige a atualização simultânea do modelo TypeScript em `models/`, de `banco.sql`, de `scripts_bd_producao.md` e dos seeders.

---

## 🛑 Regra 8: Preservação da Estética UI/UX e Feedback Amigável
- Respeitar o padrão visual TailwindCSS e ícones Lucide Icons, garantindo responsividade mobile first e interface limpa.
- **Proibição de Páginas em Branco e Jargões Técnicos**: Nunca retorne mensagens técnicas cruas (`res.status(400).send(...)`). Utilize redirecionamentos amigáveis (`?erro=...`) com modais **SweetAlert2** e banners visuais.
- **Resiliência Global de Dados**: Falhas de conexão com o banco devem renderizar a tela humanizada `views/erros/banco.ejs`, sem vazar stack trace ou códigos de socket.

---

## 🛑 Regra 9: Proibição de Acesso ao Navegador (Browser) por Agentes
- O agente de IA **JAMAIS** deve utilizar ferramentas de navegador (browser subagents, scripts headless). Testes visuais e de tela cabem exclusivamente ao usuário humano.

---

## 🛑 Regra 10: Atualização Contínua e Obrigatória de Todos os Arquivos `.md` de Documentação
- **À medida que o desenvolvimento for avançando, TODOS os arquivos `.md` do projeto (como `README.md`, `deploy_hostgator.md`, `scripts_bd_producao.md`, `requisitos.md`, `specifications.md`, `rules.md`, `skills.md`, etc.) DEVEM ser rigorosamente atualizados para acompanhar e refletir as implementações realizadas**.
- **Sincronização Imediata com o Código**: Sempre que houver inclusão, refatoração, exclusão de funcionalidades, rotas, tabelas, comandos ou alterações de deploy, os arquivos `.md` pertinentes devem ser atualizados antes do encerramento da tarefa.
- **Proibição de Documentação Obsoleta**: É terminantemente proibido deixar documentações defasadas em relação ao estado atual do software (TypeScript, rotas, banco MySQL e deploy).
