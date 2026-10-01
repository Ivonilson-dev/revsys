# RevSys - Sistema Especialista de Gestão de Revisões e Manutenções Preventivas (AUTEC)

O **RevSys** é uma plataforma completa e moderna voltada para a gestão preventiva de veículos, manutenções, trocas de peças, histórico automotivo e agendamentos de revisões exclusiva para a oficina mecânica **AUTEC**. O sistema conta com controle de acesso baseado em papéis (RBAC - Admin, Gerente, Atendente, Mecânico e Cliente), suporte à LGPD com blind index criptografado, interface administrativa, portal do cliente e integração de alertas preventivos via WhatsApp.

---

## 📑 Sumário

1. [Visão Geral da Arquitetura e Adoção do TypeScript](#1-visão-geral-da-arquitetura-e-adoção-do-typescript)
2. [Estrutura do Projeto](#2-estrutura-do-projeto)
3. [Como Rodar Localmente (Desenvolvimento)](#3-como-rodar-localmente-desenvolvimento)
4. [Compilação e Verificação de Tipos](#4-compilação-e-verificação-de-tipos)
5. [Execução e Validação dos Testes](#5-execução-e-validação-dos-testes)
6. [Passo a Passo Completo para Deploy na HostGator](#6-passo-a-passo-completo-para-deploy-na-hostgator)
7. [Regras de Negócio Críticas (AUTEC)](#7-regras-de-negócio-críticas-autec)
8. [Regras Invioláveis de Desenvolvimento e Governança](#8-regras-invioláveis-de-desenvolvimento-e-governança)

---

## 1. Visão Geral da Arquitetura e Adoção do TypeScript

O projeto foi integralmente migrado e padronizado em **TypeScript (TS)** com tipagem estrita (`strict: true`), adotando os seguintes princípios de engenharia de software:

* **Orientação a Objetos (POO)**: Classes controladoras bem delimitadas, métodos estáticos com assinaturas expressas, injeção de dependências e responsabilidade única.
* **DTOs e Interfaces Fortemente Tipadas**: Requisições de formulários (`body`), parâmetros de rota (`params`), filtros (`query`) e sessões de usuário foram padronizados através de interfaces TypeScript.
* **Sequelize v6 com Prevenção de Shadowing**: Modelos refatorados utilizando `Model<Attributes, CreationAttributes>` e a palavra-chave `declare` para propriedades de instância, eliminando o problema de sombreamento de *getters/setters* nativos do Sequelize v6 causado pelo padrão `useDefineForClassFields`.
* **Sessão Persistente no MySQL**: As sessões do usuário são mantidas na tabela `sessoes`, garantindo que reinicializações do servidor ou deploys não desconectem operadores ou clientes.
* **Segurança e LGPD**: Blind index com SHA-256 e criptografia simétrica AES-256-CBC para dados sensíveis como CPF, endereço e WhatsApp, com consentimento revogável e registro em tabela `logs_lgpd`.
* **Navegação Instantânea SPA com Turbo Drive (`@hotwired/turbo`)**: Transições fluidas sem recarregamento de tela (*Zero Refresh*), servido localmente (`public/js/turbo.js`), eliminando dependência de CDNs externas e mantendo fallback automático para MPA caso necessário. Inclui barra de progresso customizada na cor oficial AUTEC.
* **Universal Bridge Entrypoint**: Arquivo raiz `app.js` inteligente que detecta automaticamente se o projeto foi compilado para produção em `dist/src/app.js` (ótimo para Phusion Passenger na HostGator) ou se deve delegar para `src/app.ts` no desenvolvimento.
* **Tipagem Estrita sem `any`**: Eliminação de tipos `any` em toda a base de código (`models/`, `src/controllers/`, `src/types/`, `src/utils/`), garantindo `typecheck` e `build` com zero alertas ou falhas e segurança estática absoluta.
* **Resiliência e Tratamento Amigável de Conexão de Dados**: Interceptador global de falhas de banco e socket (`SequelizeConnectionRefusedError`, `ECONNREFUSED`, `ETIMEDOUT`, etc.), impedindo vazamento de stack traces técnicas tanto em desenvolvimento quanto em produção. Renderiza tela com orientações de checagem de internet e contato com suporte (`views/erros/banco.ejs`) e resposta JSON formatada para chamadas AJAX.

---

## 2. Estrutura do Projeto

```text
RevSys/
├── app.js                          # Universal Bridge Entrypoint (Produção / Passenger / Dev)
├── package.json                    # Dependências, scripts de build, dev e typecheck
├── tsconfig.json                   # Configuração estrita do compilador TypeScript
├── banco.sql                       # DDL e seeds iniciais do banco MySQL
├── deploy_hostgator.md             # Guia oficial detalhado de implantação no cPanel HostGator
├── scripts_bd_producao.md          # Manual e scripts SQL de banco para produção
├── public/                         # Arquivos estáticos servidos pelo Express
│   └── js/
│       └── turbo.js                # Turbo Drive UMD servido localmente
├── config/
│   └── config.js                   # Configuração de dialeto e conexão Sequelize
├── models/                         # Modelos ORM Sequelize em TypeScript
│   ├── Usuario.ts                  # Autenticação, perfis e hash bcrypt
│   ├── Cliente.ts                  # Blind index e criptografia AES de dados
│   ├── Veiculo.ts                  # Cadastro de veículos e proteção anti-regressão de KM
│   ├── MarcaVeiculo.ts             # Marcas de veículos
│   ├── ModeloVeiculo.ts            # Modelos de veículos vinculados às marcas
│   ├── MarcaPeca.ts                # Fabricantes/marcas de peças
│   ├── Peca.ts                     # Peças para reposição
│   ├── Servico.ts                  # Serviços de revisão/manutenção
│   ├── Oficina.ts                  # Oficinas parceiras e AUTEC
│   ├── RegistroTroca.ts            # Histórico de trocas de peças e KM previsto
│   ├── RegistroServico.ts          # Histórico de revisões e serviços executados
│   ├── Agendamento.ts              # Agenda de revisões, slots, status e presença
│   ├── Notificacao.ts              # Notificações do sistema para a equipe
│   ├── LogLgpd.ts                  # Trilha de auditoria de consentimento LGPD
│   └── index.ts                    # Inicialização tipada e injeção de associações
├── src/
│   ├── app.ts                      # Servidor Express principal configurado com TypeScript
│   ├── types/
│   │   ├── index.ts                # Tipos centrais do domínio (PapelUsuario, etc.)
│   │   └── express-session.d.ts    # Extensão de tipagem para req.session e res.locals
│   ├── utils/
│   │   ├── formatadores.ts         # Formatadores de CPF, CNPJ, Placas, KM, etc.
│   │   ├── crypto.ts               # Utilitário de criptografia AES-256-CBC
│   │   ├── cache.ts                # Cache em memória (AppCache) para tabelas auxiliares
│   │   ├── alertas.ts              # Motor de cálculo de manutenção (vencido/próximo)
│   │   ├── erros.ts                # Interceptador e resiliência de conexão ao banco de dados
│   │   └── sessionStore.ts         # Store de sessão persistente no MySQL
│   ├── middlewares/
│   │   └── autorizacao.ts          # Controle de acesso e permissões RBAC
│   ├── controllers/
│   │   ├── AutenticacaoController.ts
│   │   ├── PainelController.ts
│   │   ├── ClienteController.ts
│   │   ├── VeiculoController.ts
│   │   ├── TrocaController.ts
│   │   ├── ServicoController.ts
│   │   ├── AgendamentoController.ts
│   │   ├── CadastroBaseController.ts
│   │   ├── ClienteAreaController.ts
│   │   ├── RelatorioController.ts
│   │   └── NotificacaoController.ts
│   └── routes/
│       └── web.ts                  # Definição e amarração de rotas
├── views/                          # Templates EJS renderizados no servidor
│   ├── partials/                   # Cabeçalho, menu e rodapé
│   ├── painel/                     # Dashboard e indicadores
│   ├── agendamentos/               # Calendário FullCalendar e listagem
│   ├── clientes/                   # Gestão de clientes e formulários
│   ├── veiculos/                   # Ficha do veículo e histórico de trocas
│   ├── cadastros/                  # Tabelas auxiliares
│   ├── relatorios/                 # Relatórios operacionais e financeiros
│   ├── cliente/                    # Área logada exclusiva do cliente
│   └── erros/                      # Telas amigáveis de erro (banco.ejs, 500.ejs, 404.ejs, 403.ejs)
└── public/                         # CSS, scripts de front-end e imagens estáticas
```

---

## 3. Como Rodar Localmente (Desenvolvimento)

### 3.1 Pré-requisitos
* **Node.js**: Versão 18.x, 20.x ou superior (compatível com Node 24).
* **MySQL Server**: Versão 8.0 ou superior (rodando localmente na porta 3306).
* **Git**: Para controle de versão.

### 3.2 Passo a Passo

1. **Clonar e acessar o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd RevSys
   ```

2. **Instalar as dependências do projeto:**
   ```bash
   npm install
   ```

3. **Configurar as variáveis de ambiente:**
   Crie ou edite o arquivo `.env` na raiz do projeto com as credenciais do seu MySQL local:
   ```env
   PORT=3000
   NODE_ENV=development

   # Banco de Dados MySQL Local
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=revsys
   DB_USER=root
   DB_PASS=sua_senha_local

   # Chaves de Segurança
   SESSION_SECRET=revsys_segredo_local_dev_2026
   AES_KEY=chave-secreta-aes-256-para-dados-lgpd-32-chars
   ```

4. **Criar e popular a base de dados local:**
   Abra seu cliente MySQL (Workbench, DBeaver ou terminal) e execute o script:
   ```bash
   mysql -u root -p < banco.sql
   ```
   *Ou importe o arquivo `banco.sql` via ferramenta gráfica.*

5. **Iniciar o servidor em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   *O comando executa `tsx watch src/app.ts`, permitindo recarregar o servidor a cada alteração de código TypeScript instantaneamente.*

6. **Acessar o sistema no navegador:**
   - URL: `http://localhost:3000`
   - Usuário Administrador Padrão: `admin@revsys.com`
   - Senha Padrão: `admin123`

---

## 4. Compilação e Verificação de Tipos

Para garantir a integridade total do código e validar que não há discrepâncias de tipos:

* **Checagem estática de tipos (sem emitir arquivos):**
  ```bash
  npm run typecheck
  ```
  *Executa `tsc --noEmit`. Deve retornar código 0 sem qualquer erro.*

* **Build de Produção:**
  ```bash
  npm run build
  ```
  *Limpa a pasta `dist/` e compila todo o código TypeScript para JavaScript na pasta `dist/`.*

* **Executar a versão compilada de produção localmente:**
  ```bash
  npm start
  ```
  *Executa diretamente o bundle gerado em `dist/src/app.js` através do Node.js puro.*

---

## 5. Execução e Validação dos Testes

O projeto conta com uma suíte de testes de regras de negócio automatizadas. Para executá-los via terminal PowerShell ou Bash:

```powershell
# Definir NODE_PATH para resolução dos módulos caso execute fora do diretório padrão
$env:NODE_PATH="c:\Projetos\RevSys\node_modules"

# Teste 1: Auto-conclusão de agendamentos cujo tempo alocado expirou
npx tsx scratch/teste_slots_conclusao.js

# Teste 2: Validação de horários AUTEC (Almoço 12-14h, Sábado até 10h/12h, Domingo fechado e WhatsApp)
npx tsx scratch/teste_regras_horarios_whatsapp.js

# Teste 3: Cancelamento de agendamento e liberação de vaga no calendário
npx tsx scratch/teste_liberacao_vaga_autec.js

# Teste 4: Bloqueio estrito de datas e horários no passado
npx tsx scratch/teste_regras_passado.js

# Teste 5: Filtro por veículo no gerenciamento de agendamentos
npx tsx scratch/teste_filtro_veiculo.js

# Teste 6: Bloqueio estrito de agendamentos cancelados na fila de confirmação de presença
npx tsx scratch/teste_agendamento_cancelado.js
npx tsx scratch/teste_bloqueio_acoes.js

# Teste 7: Resiliência global e tela amigável contra indisponibilidade de banco de dados
npx tsx scratch/teste_erro_banco.js

# Teste 8: Validação anti-regressão de KM e retorno amigável com SweetAlert2
npx tsx scratch/teste_inconsistencia_km.js
```

---

## 6. Passo a Passo Completo para Deploy na HostGator

O RevSys foi planejado para rodar nativamente em hospedagens com cPanel (como a HostGator), aproveitando o Node.js sob o Phusion Passenger com o banco de dados MySQL local.

> [!TIP]
> Para orientações complementares e scripts SQL comentados, consulte também os manuais:
> - [deploy_hostgator.md](file:///c:/Projetos/RevSys/deploy_hostgator.md)
> - [scripts_bd_producao.md](file:///c:/Projetos/RevSys/scripts_bd_producao.md)

### 6.1 Criação do Banco de Dados no cPanel
1. Acesse o **cPanel** da sua conta na HostGator.
2. Acesse **Bancos de dados MySQL**:
   - Crie o banco: ex: `revsys` (o cPanel gerará algo como `cpaneluser_revsys`).
   - Crie o usuário: ex: `appuser` (o cPanel gerará algo como `cpaneluser_appuser`) e gere uma senha forte.
   - Vincule o usuário ao banco de dados e marque **TODOS OS PRIVILÉGIOS** (*ALL PRIVILEGES*).
3. Abra o **phpMyAdmin**:
   - Selecione a base criada (`cpaneluser_revsys`).
   - Clique na aba **Importar** e envie o arquivo `banco.sql` (ou cole o conteúdo de [scripts_bd_producao.md](file:///c:/Projetos/RevSys/scripts_bd_producao.md) na aba **SQL** e execute).
   - Verifique a criação de todas as tabelas: `usuarios`, `clientes`, `veiculos`, `pecas`, `servicos`, `oficinas`, `registros_troca`, `registros_servico`, `agendamentos`, `notificacoes`, `logs_lgpd`, `sessoes`.

### 6.2 Upload dos Arquivos
Envie os arquivos do projeto para uma pasta no servidor fora da `public_html` (ex: `/home/cpaneluser/revsys/`):
- Pastas: `src/`, `models/`, `views/`, `public/`, `config/`.
- Arquivos: `app.js`, `package.json`, `package-lock.json`, `tsconfig.json`.
- **Atenção**: **NÃO** envie a pasta local `node_modules/` nem a pasta `dist/`. Elas serão geradas no próprio servidor para garantir binários compatíveis com a arquitetura Linux do servidor.

### 6.3 Configurar o "Setup Node.js App" no cPanel
1. No cPanel, abra a ferramenta **Setup Node.js App**.
2. Clique em **Create Application**:
   - **Node.js version**: Selecione `20.x` (ou `18.x` LTS).
   - **Application mode**: `Production`.
   - **Application root**: `revsys` (caminho da pasta dos arquivos).
   - **Application URL**: O domínio ou subdomínio configurado (ex: `autec.com.br` ou `sistema.autec.com.br`).
   - **Application startup file**: `app.js`. *(O arquivo raiz `app.js` detecta a compilação e aciona `dist/src/app.js` com suporte integral ao Passenger).*
3. Clique em **Create**.

### 6.4 Configurar o `.env` de Produção
No Gerenciador de Arquivos do cPanel, crie o arquivo `.env` dentro de `/home/cpaneluser/revsys/`:
```env
PORT=3000
NODE_ENV=production

# MySQL Local HostGator (Baixa latência, porta interna)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cpaneluser_revsys
DB_USER=cpaneluser_appuser
DB_PASS=SuaSenhaForteDoBancoAqui

# Chaves de Segurança
SESSION_SECRET=revsys_autec_super_secret_production_key_2026
AES_KEY=chave-secreta-aes-256-para-dados-lgpd-32-chars
```

### 6.5 Instalação das Dependências e Compilação no Servidor
1. Na tela do **Setup Node.js App**, copie o comando de ativação do ambiente virtual (exibido na barra superior), por exemplo:
   ```bash
   source /home/cpaneluser/nodevenv/revsys/20/bin/activate && cd /home/cpaneluser/revsys
   ```
2. Abra o **Terminal** do cPanel (ou acesse via SSH) e execute o comando copiado.
3. Instale as dependências completas (incluindo as tipagens e o compilador):
   ```bash
   npm install --production=false
   ```
4. Compile o TypeScript para binários de produção:
   ```bash
   npm run build
   ```
   *Isso criará a pasta `dist/` com todos os arquivos compilados.*
5. Volte ao **Setup Node.js App** no cPanel e clique no botão **Restart**.
6. Acesse o seu domínio configurado. O sistema estará 100% online!

---

## 7. Regras de Negócio Críticas (AUTEC)

O RevSys opera estritamente sob as regras de atendimento e oficina da **AUTEC**:

1. **Horário de Funcionamento e Limites de Início**:
   - **Segunda a Sexta**: 08:00 às 18:00.
   - **Sábado**: Atendimento das 08:00 às 12:00. Os agendamentos podem ter início **somente até as 10:00**, pois o tempo alocado não pode ultrapassar o horário de fechamento das 12:00.
   - **Domingo**: A oficina **não abre aos domingos**. Todas as datas de domingo ficam 100% bloqueadas no calendário e na API.
   - **Horário de Almoço**: O intervalo entre **12:00 e 14:00** é reservado para almoço em qualquer data. Nenhum agendamento pode iniciar ou coincidir com essa faixa de horário.
2. **Auto-Conclusão de Agendamentos e Expiração de Slots**:
   - Agendamentos com status `agendado` e confirmação de presença `confirmada`, ao ultrapassarem o tempo limite alocado, transitam automaticamente para `concluido`.
   - Agendamentos concluídos **não permitem extensão de tempo**. Caso o cliente necessite de mais tempo, o operador deve criar um novo agendamento de acordo com a disponibilidade.
3. **Liberação Automática de Vagas Canceladas**:
   - Caso um agendamento seja cancelado (com justificativa obrigatória), a vaga é imediatamente liberada para outros clientes.
4. **Proteção Contra Agendamentos no Passado**:
   - Nenhuma data ou horário anterior ao momento atual pode ser agendada ou reagendada. Agendamentos antigos cancelados continuam com a data bloqueada para evitar anacronismos no sistema.
5. **Contato Preventivo Via WhatsApp**:
   - O painel exibe veículos com manutenções preventivas vencidas com botão direto para o WhatsApp do proprietário, já contendo mensagem pré-formatada citando as peças e a oficina AUTEC.
6. **Confirmação de Presença (Janela de 24h) e Cancelamentos**:
   - A fila de confirmação de presença (modais de notificação, disparos WhatsApp e adiamentos) processa **estritamente agendamentos com status `agendado`**.
   - Agendamentos cancelados ou concluídos são sumariamente excluídos das filas de notificação e das ações de confirmação/adiamento, impedindo a exibição de modais para serviços cancelados. No calendário e nas tabelas, itens cancelados não exibem opções de confirmar presença.
7. **Consistência de Quilometragem e Alertas Amigáveis (RF-33)**:
   - Toda tentativa de registrar serviço ou troca de peças com quilometragem inferior ao último valor registrado do veículo é bloqueada via transações atômicas com `ROLLBACK`.
   - O sistema valida preventivamente no formulário e, em caso de erro no processamento, exibe alerta modal personalizado (**SweetAlert2**) acompanhado de banner estilizado (**TailwindCSS + Lucide Icons**), instruindo o operador a conferir o hodômetro real do veículo e impedindo telas em branco com texto puro.
8. **Notificações Internas Detalhadas com Veículo e Proprietário (RF-36)**:
   - Ao confirmar presença de um agendamento (`confirmarPresenca`), o sistema cria dinamicamente uma notificação interna (`lembrete_agendamento`) que exibe no Dashboard o modelo do veículo, a placa e o nome do cliente proprietário (ex: *Agendamento de revisão confirmado para o veículo Corolla (BRA2E19) - Cliente: Carlos Eduardo Silva no dia 05/10/2026 às 09:00.*), permitindo identificação imediata sem necessidade de abrir a ficha completa do veículo.

---

## 8. Regras Invioláveis de Desenvolvimento e Governança

Para manter a consistência, segurança e qualidade arquitetural do projeto, todos os agentes de IA e desenvolvedores devem seguir as **10 regras invioláveis** consolidadas em [rules.md](file:///c:/Projetos/RevSys/rules.md) e [AGENTS.md](file:///c:/Projetos/RevSys/AGENTS.md):

1. **Idioma**: Todas as interações, comentários de código e documentação estritamente em **Português do Brasil (pt-br)**.
2. **Git Restrito ao Humano**: Agentes de IA **JAMAIS** executam comandos Git (`git status`, `git commit`, `git add`, `git push`, etc.). O controle de versão é prerrogativa exclusiva do programador humano.
3. **Ordenação Alfabética Obrigatória (RF-02)**: Selects, dropdowns e tabelas cadastrais ordenados por nome em ordem alfabética (`order: [['nome', 'ASC']]`).
4. **Transações SQL Atômicas**: Qualquer operação com múltiplas tabelas exige transação com rollback no `catch`.
5. **Invalidação Imediata de Cache**: Qualquer mutação em tabelas mestres exige limpeza da chave em `src/utils/cache.ts`.
6. **Segurança LGPD**: CPF nunca é gravado em texto claro (uso estrito de AES-256 e HMAC Blind Index).
7. **Sincronização de Banco**: Modelos TypeScript, `banco.sql`, `scripts_bd_producao.md` e seeders devem estar sempre em perfeita paridade.
8. **Preservação Visual UI/UX**: Estética moderna com TailwindCSS e ícones Lucide Icons, Mobile First.
9. **Proibição de Acesso ao Navegador**: Agentes de IA **JAMAIS** utilizam automação de browser (browser subagents ou headless). Testes de interface pertencem ao desenvolvedor humano.
10. **Atualização Contínua de Todos os Arquivos `.md`**: À medida que o desenvolvimento for avançando, **todos** os arquivos Markdown de documentação do projeto (`README.md`, `deploy_hostgator.md`, `scripts_bd_producao.md`, `requisitos.md`, `specifications.md`, `rules.md`, `skills.md`) **DEVEM** ser rigorosamente atualizados para refletir as implementações realizadas, mantendo o repositório 100% documentado e sincronizado.

---

## 👤 Suporte e Manutenção

Para suporte ou atualizações no sistema, consulte o histórico de alterações ou documentações técnicas em [deploy_hostgator.md](file:///c:/Projetos/RevSys/deploy_hostgator.md).

