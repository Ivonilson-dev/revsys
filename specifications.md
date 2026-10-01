# Especificações do Sistema - RevSys

## 1. Visão Geral do Projeto
O **RevSys** é um sistema web de gestão automotiva e manutenção preventiva para oficinas mecânicas e proprietários de veículos. O sistema permite o cadastro de clientes, veículos, peças, serviços e oficinas parceiras, além de gerenciar a linha do tempo de trocas de componentes, execução de serviços avulsos, cálculo de alertas de vencimento por quilometragem/tempo, e agendamento de revisões em boxes de atendimento.

---

## 2. Arquitetura e Stack Tecnológica

- **Runtime & Ambiente**: Node.js (v18+ / v20+)
- **Linguagem Principal**: **TypeScript (Strict Mode)** compilando para JavaScript ES2022 / CommonJS
- **Framework Web**: Express.js (com tipagem completa `@types/express`)
- **View Engine**: EJS (Server-Side Rendering com componentes e layouts modulares)
- **ORM & Banco de Dados**:
  - **Sequelize ORM** (v6) com tipagem estrita de Modelos via classes TypeScript (`declare` attributes)
  - **MySQL 8.0+** (Ambiente local via XAMPP/MySQL e produção via cPanel/HostGator)
- **Servidor de Produção**:
  - **HostGator cPanel** com Phusion Passenger (inicializador `app.js` apontando para `dist/src/app.js`)
- **Estilização, UI & Navegação SPA**:
  - TailwindCSS (com design moderno em dark/light contrast, cards com cantos arredondados `rounded-2xl`, micro-interações)
  - **Turbo Drive (@hotwired/turbo)**: Aceleração de navegação estilo SPA sem recarregamento de página (*Zero Refresh*), servido localmente (`/js/turbo.js`) com barra de progresso personalizada AUTEC
  - **Lucide Icons** (ícones vetoriais dinâmicos)
  - **FullCalendar v6** (interface interativa de agendamento em calendário)
- **Segurança & Privacidade**:
  - **Criptografia AES-256-CBC** para dados pessoais sensíveis (CPF de clientes)
  - **Blind Index (HMAC-SHA256)** para buscas exatas e unicidade sem descriptografar dados
  - **bcryptjs** (Hash salgado para senhas de usuários)
  - **express-session** (Gerenciamento de sessões com controle de acesso por papéis/RBAC)
- **Desempenho & Caching**:
  - **node-cache** (In-memory TTL 3600s) para aceleração de dados mestre/auxiliares.
- **Tipagem Estrita e Zero `any`**:
  - Toda a base de código (`src/`, `models/`) opera em `strict: true` sem o uso de `any`.
  - Interfaces estruturais dedicadas para DTOs, filtros, retornos e associações Sequelize garantem refatoração segura, autocomplete completo e detecção estática de erros de compilação.
- **Resiliência e Tratamento Amigável de Erros de Conexão**:
  - Interceptação global de falhas de banco de dados (`SequelizeConnectionRefusedError`, `ECONNREFUSED`, `ETIMEDOUT`, etc.) tanto em ambiente de desenvolvimento quanto em produção.
  - Exibição de tela amigável (`views/erros/banco.ejs`) com orientações de checagem de internet e contato com suporte, sem vazar stack trace ou jargões técnicos para o usuário final.

---

## 3. Estrutura de Arquivos e Diretórios

```
c:\Projetos\RevSys\
├── app.js                          # Startup file para Phusion Passenger (HostGator)
├── banco.sql                       # DDL/DML para MySQL de desenvolvimento
├── config/
│   ├── config.json                 # Configurações do Sequelize (desenvolvimento/produção)
│   └── database.ts                 # Instância centralizada do Sequelize (TypeScript)
├── dist/                           # Saída compilada do TypeScript (gerada por npm run build)
├── models/                         # Modelos TypeScript do Sequelize e associações
│   ├── index.ts                    # Registrador central de modelos e associações
│   ├── NivelAcesso.ts              # Classificação formal de papéis e níveis de acesso
│   ├── Usuario.ts                  # Autenticação e associação ao nível de acesso
│   ├── Cliente.ts
│   ├── MarcaVeiculo.ts
│   ├── ModeloVeiculo.ts
│   ├── Veiculo.ts
│   ├── MarcaPeca.ts
│   ├── Peca.ts
│   ├── Servico.ts                  # Catálogo de serviços da oficina
│   ├── RegistroTroca.ts            # Histórico de trocas de peças
│   ├── RegistroServico.ts          # Histórico de serviços prestados
│   ├── Oficina.ts
│   ├── Agendamento.ts
│   ├── LogLgpd.ts
│   ├── LogAuditoria.ts             # Trilha de auditoria e operações de usuários
│   └── Notificacao.ts
├── seeders/
│   └── 20260717000001-dados-iniciais.js # Seeder inicial completo (níveis de acesso, usuários, marcas, modelos, peças, serviços)
├── src/
│   ├── app.ts                      # Entrada principal da aplicação Express (TypeScript)
│   ├── controllers/                # Lógica de controle das requisições (TypeScript)
│   │   ├── AutenticacaoController.ts
│   │   ├── PainelController.ts
│   │   ├── ClienteController.ts
│   │   ├── VeiculoController.ts
│   │   ├── TrocaController.ts
│   │   ├── ServicoController.ts    # Controle de registros de serviços nos veículos
│   │   ├── AgendamentoController.ts
│   │   ├── CadastroBaseController.ts # CRUD de tabelas auxiliares (Marcas, Peças, Serviços, etc.)
│   │   ├── RelatorioController.ts
│   │   ├── AuditoriaController.ts  # Gestão de auditoria, filtros e relatórios PDF/impressão
│   │   ├── LgpdController.ts       # Declaração e termos de conformidade e governança LGPD
│   │   ├── NotificacaoController.ts
│   │   └── ClienteAreaController.ts
│   ├── services/
│   │   └── AuditoriaService.ts     # Serviço de gravação de logs de auditoria e sanitização LGPD
│   ├── middlewares/                # Middlewares de autenticação e RBAC
│   │   └── autorizacao.ts
│   ├── routes/
│   │   └── web.ts                  # Mapeamento de rotas web e endpoints REST/AJAX
│   ├── types/
│   │   ├── express-session.d.ts    # Declaração de tipos para sessões de usuário
│   │   └── index.ts                # Interfaces de DTOs e entidades
│   └── utils/
│       ├── alertas.ts              # Algoritmo de cálculo de status de substituição (KM / Tempo)
│       ├── cache.ts                # Utilitário de gerenciamento e invalidação de cache
│       ├── crypto.ts               # AES-256 e Blind Index para conformidade LGPD
│       ├── formatadores.ts         # Formatadores de moeda, datas e placas
│       ├── erros.ts                # Interceptador e resiliência de conexão ao banco de dados
│       └── sessionStore.ts         # Armazenamento de sessões
├── views/                          # Templates EJS por módulo
│   ├── autenticacao/
│   ├── clientes/
│   ├── veiculos/
│   ├── agendamentos/
│   ├── cadastros/
│   ├── relatorios/
│   ├── auditoria/                  # Views de auditoria (index.ejs e relatorio.ejs para impressão/PDF)
│   ├── lgpd/                       # View do termo e conformidade LGPD com botões de impressão e PDF
│   ├── parciais/
│   └── erros/                      # Telas amigáveis (banco.ejs, 500.ejs, 404.ejs, 403.ejs)
├── public/                         # Arquivos estáticos servidos pelo Express
│   └── js/
│       └── turbo.js                # Turbo Drive UMD compilado para aceleração SPA local
├── deploy_hostgator.md             # Guia de implantação completo no cPanel da HostGator
├── scripts_bd_producao.md          # Scripts DDL/DML prontos para execução em produção
├── tsconfig.json                   # Configurações do compilador TypeScript
└── package.json                    # Scripts npm (dev, build, typecheck, start) e dependências
```

---

## 4. Modelos e Relacionamentos de Dados

1. **`NivelAcesso` 1:N `Usuario`**: Classificação formal dos papéis de acesso do sistema (Admin, Gerente, Atendente, Mecânico e Cliente).
2. **`Usuario` 1:1 `Cliente`** (opcional: clientes possuem conta de usuário no papel `cliente`).
3. **`MarcaVeiculo` 1:N `ModeloVeiculo`**: Marcas automotivas (ex: Fiat, Volkswagen, Toyota).
4. **`ModeloVeiculo` 1:N `Veiculo`**: Modelos específicos vinculados à marca.
5. **`Cliente` 1:N `Veiculo`**: Proprietário do veículo.
6. **`MarcaPeca` 1:N `Peca`**: Fabricantes de peças (ex: Bosch, NGK, Cofap).
7. **`Veiculo` 1:N `RegistroTroca` 1:N `Peca`**: Histórico de trocas de componentes com previsão de próxima manutenção por KM e Data.
8. **`Veiculo` 1:N `RegistroServico` 1:N `Servico`**: Histórico de execução de serviços que não dependem de troca de peças (ex: Alinhamento 3D, Sangria de Freio, Higienização).
9. **`Agendamento`**: Vincula `Cliente`, `Veiculo` e opcionalmente `Servico` para reserva de box em horário comercial (08:00 às 17:00).
10. **`Oficina`**: Cadastro de matriz/filiais e oficinas externas executoras.
11. **`Usuario` 1:N `LogAuditoria`**: Trilha de auditoria das ações e operações realizadas pelos usuários.

---

## 5. Regras Funcionais Chave (RFs)

- **RF-01 (Separação Marca/Modelo)**: Formulários de seleção de veículo devem separar explicitamente a Marca do Modelo.
- **RF-02 (Ordenação Alfabética)**: Todos os selects/dropdowns de cadastros mestre (Marcas, Modelos, Peças, Serviços, Clientes, Oficinas) DEVEM ser exibidos em ordem alfabética (`ASC`).
- **RF-11 / RF-15 (Histórico e Alertas)**: As trocas de peças e serviços são organizados da mais recente para a mais antiga na linha do tempo. O sistema calcula status:
  - `Vencido` (KM excedido ou data ultrapassada)
  - `Próximo` (faltando <= 1000 km ou <= 30 dias)
  - `Em dia`
- **RF-20 / RF-34 (Agendamento Comercial e Regras AUTEC)**:
  - Horários permitidos de segunda a sexta entre 08:00 e 17:30 (expediente encerra às 18:00).
  - Intervalo de almoço bloqueado entre 12:00 e 14:00.
  - Aos sábados, atendimento das 08:00 às 12:00, com horário limite de início até as 10:00 (para comportar o tempo alocado).
  - Aos domingos, a oficina permanece fechada e os agendamentos são 100% bloqueados.
  - Bloqueio estrito de agendamentos no passado.
  - Duração configurável em blocos de 30 min, 1h, 1h30, 2h, etc. O sistema impede sobreposição de horários e exige justificativa obrigatória para cancelamento. Agendamentos cancelados liberam a vaga imediatamente.
- **RF-33 (Atualização Dinâmica e Proteção Anti-Regressão de KM)**:
  - Ao registrar qualquer troca de peça ou serviço com opção de atualização marcada, o último KM registrado do veículo é validado e atualizado atomicamente na mesma transação.
  - O sistema impede registro com KM inferior ao atual do veículo. Caso ocorra tentativa de regressão, a transação sofre `ROLLBACK` e o usuário é redirecionado com mensagem amigável via parâmetro `?erro=`, disparando um modal informativo (**SweetAlert2**) e banner visual (**TailwindCSS + Lucide Icons**) orientando a conferência do hodômetro real do veículo, sem jamais exibir páginas em branco com erro HTTP ou jargões como "Inconsistência lógica:".
- **RF-35 (Alerta de 24 Horas, Confirmação de Presença via WhatsApp e Fila Sequencial com Recorrência de 60 Min)**:
  - Quando um agendamento atinge 24 horas anteriores ao prazo inicial (`<= 24h` restantes e `diffMs > 0`), um modal de alerta é disparado no Dashboard organizando uma fila sequencial (`1 de N`, `2 de N`...).
  - **Filtro Estrito**: A fila de confirmação e os modais processam **estritamente agendamentos com status `agendado`**. Agendamentos cancelados ou já concluídos são sumariamente excluídos da fila, não exibindo modais ou ações de confirmação/adiamento.
  - O operador pode:
    1. **Solicitar Confirmação via WhatsApp**: abre mensagem pré-configurada no WhatsApp do cliente e marca `confirmacao_presenca = 'solicitada'`. O lembrete se repete a cada 60 minutos caso a presença não seja confirmada.
    2. **Adiar por 60 Minutos**: adia a notificação no sistema por 60 minutos (`confirmacao_adiada_ate = +60 min`).
    3. **Dar Baixa (Presença Confirmada)**: registra que o cliente confirmou presença (`confirmacao_presenca = 'confirmada'`), retirando o compromisso da fila de alertas.
  - A confirmação de presença pode ser registrada no modal da fila, na Agenda de Hoje do Dashboard, na listagem geral de agendamentos e nos detalhes do calendário.
- **RF-36 (Notificações Internas Detalhadas com Veículo e Proprietário)**:
  - No momento da confirmação de presença de uma revisão (`confirmarPresenca`), o sistema cria dinamicamente uma notificação do tipo `lembrete_agendamento` para a equipe contendo identificação completa: modelo do veículo, placa, nome do proprietário, data e horário da revisão (exemplo: *"Agendamento de revisão confirmado para o veículo Corolla (BRA2E19) - Cliente: Carlos Souza no dia 05/10/2026 às 09:00.*").
- **RF-37 / RNF-26 (Resiliência e Tratamento Humanizado de Falha de Conexão de Dados)**:
  - Interceptador de exceções de banco em `src/utils/erros.ts` captura erros de socket e conexão (`SequelizeConnectionRefusedError`, `ECONNREFUSED`, `ETIMEDOUT`, etc.).
  - Em chamadas normais de navegação, renderiza `views/erros/banco.ejs` com TailwindCSS e CSS embutido autônomo (para manter a estética mesmo se a conexão externa falhar), instruindo a checagem de internet do dispositivo e o contato imediato com o suporte, sem expor mensagens técnicas ou de depuração tanto em dev quanto em prod. Em chamadas AJAX, retorna JSON estruturado com status HTTP 503.
- **RF-38 (Módulo de Auditoria e Rastreabilidade Completa - Exclusivo Administrador)**:
  - Todas as mutações e eventos de acesso (CRIAR, ATUALIZAR, EXCLUIR, CANCELAR, CONFIRMAR_PRESENCA, ADIAR_PRESENCA, LOGIN, LOGIN_FALHA, LOGOUT) são persistidos na tabela `logs_auditoria` via `AuditoriaService`.
  - Captura IP de origem, User-Agent, usuário autenticado e histórico de dados anteriores vs novos com mascaramento e conformidade LGPD.
  - Painel administrativo (`/auditoria`) com filtros combináveis por período, usuário, tipo de ação, módulo e termo de busca livre.
  - Visualização de relatórios limpos (`/auditoria/relatorio`) com cabeçalho institucional AUTEC, folha de estilo para impressão física/PDF nativo (`@media print`) e exportação em planilha CSV.
- **RF-39 (Tabela e Classificação Formal de Níveis de Acesso)**:
  - Tabela `niveis_acesso` com campos `id`, `nome` (admin, gerente, atendente, mecanico, cliente), `titulo`, `descricao` e `nivel_hierarquia`.
  - Relacionamento 1:N com `Usuario`, preservando total integridade referencial com os middlewares de autorização RBAC (`temPapel`).
- **RF-40 (Termo de Conformidade e Governança LGPD no Menu)**:
  - Rota `/lgpd` exibida como a última opção do menu lateral com o rótulo **LGPD**. Apresenta formalmente as bases legais de tratamento, o compromisso de não comercialização/compartilhamento externo de dados e botões para impressão física e exportação direta do documento para PDF (`html2pdf.js`).
- **RF-41 (Cadastro e Gestão de Usuários com Níveis de Acesso no Cadastro Base)**:
  - Bloco exclusivo para o perfil Administrador no painel `/cadastros` que permite cadastrar novos usuários com definição de nome, e-mail, senha criptografada (`bcryptjs`) e seleção do nível de acesso (`niveis_acesso`).
  - Lista de usuários ativos com identificação visual do perfil, data de cadastro e opção de exclusão protegida contra auto-exclusão e deleção do administrador raiz (`id: 1`).
  - Todas as inclusões e exclusões de usuários disparam automaticamente registros na trilha de auditoria (`logs_auditoria`).
- **RF-42 (Abertura Sob Demanda de Formulários em Cadastros Base)**:
  - Formulários de inserção das 7 seções de `/cadastros` recolhidos por padrão, liberados via botões gatilho interativos com alternância de ícones, barra de atalhos rápidos e suporte a deep-link via hash `#usuarios-sistema`.
- **RF-43 (Sanfona de Visualização de Itens e Filtro em Tempo Real por Palavra-Chave)**:
  - As listagens/tabelas de itens cadastrados em cada seção iniciam recolhidas por padrão dentro de elementos do tipo sanfona (`sanfona-box-...`), otimizando o carregamento visual da página.
  - Cada cabeçalho possui o botão gatilho **"Ver Itens (<qtd>)"** com chevron rotativo e transição fluida, alternando dinamicamente o texto para **"Ocultar Itens"** ao ser aberto.
  - Cada sanfona aberta apresenta um campo de busca por palavra-chave com ícone de lupa e botão de limpar imediato. O filtro em JavaScript opera em tempo real comparando termos sem distinção de acentos (`normalize('NFD')`) ou caixa alta/baixa contra o atributo `data-texto-busca` das linhas/cards, exibindo mensagens de estado vazio amigáveis caso a busca não retorne correspondências.
- **RF-44 (Inativação de Clientes e Veículos com Checagem Proativa de Pendências e Feedback Personalizado)**:
  - Nas telas de edição de cliente (`/clientes/:id/editar`) e veículo (`/veiculos/:id/editar`), o operador pode gerenciar o ciclo de vida do registro alternando entre os status `Ativo` e `Inativo`.
  - **Checagem Proativa e Rotas Dedicadas de Pendências**: Ao selecionar a opção `Inativo` no dropdown ou ao submeter o formulário, o frontend realiza consulta assíncrona imediata via `GET /veiculos/:id/pendencias-inativacao` ou `GET /clientes/:id/pendencias-inativacao`. Havendo agendamentos em aberto (status `agendado`), o sistema alerta proativamente o usuário através de um banner inline estilizado e de um modal SweetAlert2 detalhado com data, horário, motivo de cada pendência e botão de atalho para a ficha de detalhes.
  - **Compatibilidade com Turbo Drive e Status HTTP 422**: Caso a requisição de alteração chegue ao backend com pendências ou inconsistências cadastrais, a resposta é enviada com código HTTP 422 (Unprocessable Entity), garantindo que o Turbo Drive realize a troca de DOM perfeitamente e exiba as mensagens e modais informativos, eliminando sensações de travamento.
  - **Motivo Obrigatório com Opção "Outros"**: Para efetivar a inativação, é obrigatório selecionar uma justificativa pré-definida (*"Mudou para concorrente"*, *"Falecimento"*, *"Vendeu o veículo"*, *"Mudou de cidade"*, *"Perda total / Sinistro"*, etc.) ou selecionar *"Outros"*, que abre dinamicamente um campo de texto livre para detalhamento obrigatório.
  - **Bloqueio Operacional para Inativos**: Cadastros inativos são impedidos de criar novos agendamentos e solicitações de manutenção. Recebem badges coloridos nas listagens e banners de destaque em suas páginas de detalhes. Ações de inativação e reativação são auditadas em `logs_auditoria`.
- **LGPD Compliance**: CPF armazenado criptografado via AES-256-CBC + HMAC-SHA256 Blind Index. Registros de consentimento em `LogLgpd`. Dados sensíveis mascarados na auditoria.
