# Guia Oficial de Implantação e Deploy no Render (com Banco MySQL na HostGator) - RevSys / AUTEC

Este documento descreve o passo a passo completo, detalhado e validado para realizar a implantação (*deploy*) em produção do **RevSys (AUTEC)** utilizando a plataforma em nuvem **Render** para a aplicação Node.js/TypeScript e a **HostGator (cPanel)** exclusivamente para hospedagem do banco de dados MySQL.

---

## 1. Visão Geral da Arquitetura de Produção

* **Aplicação Web (Backend & Frontend SSR)**: Hospedada no **Render** como um **Web Service** Node.js.
  - Conexão nativa com o repositório GitHub.
  - Deploy contínuo (*CI/CD*) automático a cada `git push`.
  - Certificado SSL/HTTPS gratuito gerenciado automaticamente pelo Render.
  - Execução contínua baseada em contêineres gerenciados.
* **Banco de Dados (MySQL 8.0+)**: Hospedado no servidor da **HostGator (cPanel)**.
  - Conexão remota segura via TCP/IP na porta 3306.
  - Gestão de backups e dados através do phpMyAdmin.
* **Linguagem & Build**: TypeScript compilado para JavaScript de alta performance (`dist/src/app.js`).

---

## 2. Passo 1: Configuração do Banco de Dados MySQL na HostGator

Como a aplicação estará rodando nos servidores do Render e o banco de dados está na HostGator, o MySQL da HostGator precisa autorizar conexões remotas.

### 2.1 Criar a Base de Dados e Usuário no cPanel
1. Acesse o **cPanel** da sua conta HostGator.
2. Em **Bancos de dados MySQL**:
   - Crie a base de dados (ex: `ivonil70_revsys`);
   - Crie o usuário (ex: `ivonil70_appuser`) e defina uma senha forte;
   - Vincule o usuário ao banco de dados e marque **TODOS OS PRIVILÉGIOS** (*ALL PRIVILEGES*).

### 2.2 Importar as Tabelas e Dados Iniciais (phpMyAdmin)
1. No cPanel, abra o **phpMyAdmin** e selecione o banco de dados criado;
2. Vá até a aba **Importar**, clique em **Escolher arquivo** e selecione o arquivo:
   `banco_producao.sql`
3. Role até o final da página e clique em **Executar**;
4. Verifique se todas as 16 tabelas e os dados essenciais foram criados com sucesso.

### 2.3 ⚠️ Passo Fundamental: Liberar o Acesso Remoto ao MySQL (Remote MySQL)
Por padrão, a HostGator bloqueia qualquer tentativa de conexão externa ao MySQL. Como os servidores do Render conectam via internet, é obrigatório liberar o acesso:
1. No cPanel da HostGator, vá até a seção **Bancos de Dados** e clique em **MySQL Remoto** (*Remote MySQL*);
2. No campo **Adicionar host de acesso** (*Host*), digite:
   `%`
   *(O caractere `%` é um curinga que autoriza conexões de qualquer IP externo autenticado por usuário e senha, necessário porque os servidores do Render utilizam faixas de IP dinâmicas);*
3. Clique em **Adicionar host** (*Add Host*).

### 2.4 Identificar o Endereço de Conexão do Servidor HostGator (`DB_HOST`)
Para que o Render saiba onde conectar:
- Acesse a página inicial do cPanel e observe na barra lateral direita (**Informações Gerais** / *General Information*):
  - **Nome do Servidor**: ex: `sh00044.hostgator.com.br` (recomendado);
  - **OU IP Compartilhado**: ex: `108.179.253.xx`;
  - **OU Seu Domínio**: ex: `seudominio.com.br` (se já estiver apontando os DNS para a HostGator).

---

## 3. Passo 2: Configurar o Web Service no Render

### 3.1 Conectar o Repositório do GitHub
1. Acesse sua conta no **[Render](https://dashboard.render.com/)** (se não tiver, faça login usando sua conta do GitHub);
2. No painel principal (*Dashboard*), clique no botão **New +** no canto superior direito e selecione **Web Service**;
3. Na seção *Connect a repository*, localize o repositório **RevSys** e clique em **Connect**.

### 3.2 Preencher as Configurações do Serviço
Configure os parâmetros do Web Service exatamente como descrito abaixo:

| Campo | Valor / Configuração |
| :--- | :--- |
| **Name** | `revsys-autec` (ou nome de sua preferência) |
| **Region** | `Oregon (US West)` ou `Ohio (US East)` |
| **Branch** | `master` (ou o branch principal do repositório) |
| **Root Directory** | *(deixar em branco - raiz do projeto)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` (ou plano pago se desejar sem suspensão) |

> [!NOTE]
> O comando `npm install && npm run build` instalará as dependências e executará o compilador TypeScript (`tsc`), gerando a pasta `dist/`. O comando `npm start` acionará diretamente `node dist/src/app.js`.

---

## 4. Passo 3: Configurar as Variáveis de Ambiente no Render

Na mesma tela de criação do serviço (ou na aba lateral **Environment** após criar), adicione as seguintes variáveis de ambiente:

| Chave (*Key*) | Valor (*Value*) | Descrição |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Modo de execução em produção |
| `DB_DIALECT` | `mysql` | Dialeto do banco de dados |
| `DB_HOST` | `sh00044.hostgator.com.br` | Host ou IP do servidor MySQL da HostGator |
| `DB_PORT` | `3306` | Porta padrão do MySQL |
| `DB_NAME` | `ivonil70_revsys` | Nome da sua base de dados na HostGator |
| `DB_USER` | `ivonil70_appuser` | Usuário do MySQL criado no cPanel |
| `DB_PASS` | `SuaSenhaForteAqui123!#` | Senha do usuário do MySQL |
| `SESSION_SECRET` | `revsys_autec_super_secret_production_key_2026` | Chave de assinatura para sessões de usuário |
| `SESSION_COOKIE_NAME` | `revsys.sid` | *(Opcional)* Nome do cookie de sessão assinado |
| `AES_KEY` | `chave-secreta-aes-256-para-dados-lgpd-32-chars` | Chave de 32 caracteres para criptografia LGPD (CPF) |

> [!IMPORTANT]
> * **Porta HTTP**: Não é necessário definir a variável `PORT` manualmente; o Render injeta automaticamente a variável `PORT=10000` e o Express do RevSys já escuta essa variável nativamente.
> * **Chave LGPD**: Certifique-se de que a variável `AES_KEY` possua **exatamente 32 caracteres** para compatibilidade com o algoritmo AES-256-CBC.

---

## 5. Passo 4: Inicialização e Deploy Automático

1. Clique no botão **Create Web Service** no final da página do Render;
2. O Render iniciará o processo de build:
   - Clona o repositório GitHub;
   - Executa `npm install`;
   - Executa `npm run build` (compilando todo o TypeScript para `dist/`);
   - Inicia a aplicação com `npm start`.
3. Nos logs de inicialização, você verá:
   ```text
   ==> Starting service with 'npm start'
   Servidor RevSys rodando em http://localhost:10000
   ```
4. Assim que o status mudar para **Live**, o Render fornecerá a URL pública segura do seu sistema, no formato:
   `https://revsys-autec.onrender.com`

---

## 6. Passo 5: Atualizações Contínuas (*Continuous Deployment*)

Com a integração do GitHub configurada no Render:
* Sempre que você realizar um novo `git push origin master`, o Render detectará a alteração automaticamente, executará a compilação e atualizará a aplicação em produção sem necessidade de intervenção manual!

---

## 7. Checklist de Verificação Pós-Deploy

Após a conclusão da implantação no Render:

- [ ] **Acesso e HTTPS**: Acessar a URL fornecida pelo Render (`https://seu-app.onrender.com`) e validar o cadeado de segurança SSL.
- [ ] **Conexão com Banco de Dados**: Verificar se a tela de login carrega normalmente (caso haja erro de conexão com a HostGator, certifique-se de que o curinga `%` foi adicionado no menu *MySQL Remoto* do cPanel).
- [ ] **Primeiro Acesso**: Efetuar login com as credenciais padrão do administrador (`admin@revsys.com` / `admin123`).
- [ ] **Alteração de Senha**: Trocar a senha do administrador principal na área de gestão de usuários.
- [ ] **Teste de Módulos**:
  - Testar o painel de **Cadastros Base** (`/cadastros`) com sanfonas e busca em tempo real;
  - Testar o módulo de **Auditoria** (`/auditoria`) para conferir o registro das ações;
  - Testar a página institucional de **LGPD** (`/lgpd`);
  - Cadastrar um veículo e testar um agendamento.
