# Guia Oficial de Implantação e Deploy na HostGator - RevSys / AUTEC

Este documento descreve o passo a passo completo, detalhado e validado para realizar a implantação (*deploy*) em produção do **RevSys (AUTEC)** na hospedagem **HostGator** (utilizando cPanel com suporte a Node.js e banco MySQL local).

---

## 1. Visão Geral da Arquitetura de Produção

* **Ambiente**: HostGator cPanel (CloudLinux com Phusion Passenger).
* **Execução**: Processo Node.js contínuo 24/7 (sem paradas/cold starts).
* **Banco de Dados**: MySQL 8.0 local (`localhost:3306`).
* **Latência de Banco**: ~0 a 2 ms (extrema performance para renderização SSR com EJS).
* **Segurança**: Porta 3306 fechada para a internet; acesso restrito à máquina local.
* **Linguagem**: TypeScript compilado para JavaScript de alta performance (`dist/app.js`).

---

## 2. Passo 1: Criação e Configuração do Banco de Dados no cPanel

### 2.1 Criar a Base de Dados
1. Acesse o **cPanel** da sua conta HostGator.
2. Na seção **Bancos de Dados**, clique em **Bancos de dados MySQL**.
3. No campo **Criar novo banco de dados**, digite o nome (ex: `revsys` ou `autec`).
   - O cPanel adicionará o prefixo da sua conta (ex: `meuuser_revsys`).
4. Clique em **Criar banco de dados**.

### 2.2 Criar o Usuário do Banco de Dados
1. Na mesma tela, role até a seção **Usuários do MySQL** -> **Adicionar novo usuário**.
2. No campo **Nome de usuário**, digite (ex: `appuser`).
   - O cPanel formará (ex: `meuuser_appuser`).
3. Clique em **Gerador de senhas** para gerar uma senha forte (anote essa senha!).
4. Clique em **Criar usuário**.

### 2.3 Vincular o Usuário ao Banco com Privilégios Totais
1. Na seção **Adicionar usuário à base de dados**:
   - Selecione o **Usuário** criado (ex: `meuuser_appuser`).
   - Selecione a **Base de dados** criada (ex: `meuuser_revsys`).
2. Clique em **Adicionar**.
3. Na tela de privilégios, marque a caixa **TODOS OS PRIVILÉGIOS** (*ALL PRIVILEGES*).
4. Clique em **Fazer alterações**.

### 2.4 Importar a Estrutura (DDL) e Dados Iniciais
1. Volte à página inicial do cPanel e abra o **phpMyAdmin**.
2. No menu lateral esquerdo, clique no banco de dados que acabou de criar (ex: `ivonil70_revsys`).
3. Clique na aba superior **Importar** (ou na aba **SQL**).
4. Você pode:
   - **Opção A (Recomendada - Arquivo Puro SQL)**: Na aba **Importar**, clique em *Escolher arquivo*, selecione o arquivo dedicado `banco_producao.sql` que criamos na raiz do projeto e clique em **Executar** no final da página. Este arquivo não contém marcações Markdown e não tenta criar banco, sendo executado perfeitamente no banco selecionado.
   - **Opção B (Cópia Direta)**: Abra o arquivo `banco_producao.sql`, copie todo o seu conteúdo, cole na aba **SQL** do phpMyAdmin e clique em **Executar**.
   - **Opção C (Bancos Já Ativos / Atualização Incremental)**: Caso o banco de produção já esteja em operação com dados reais, copie e execute o script SQL da **Seção 4 de scripts_bd_producao.md**, que cria as tabelas `niveis_acesso` e `logs_auditoria`, adiciona as colunas de inativação e controle de status em `clientes` e `veiculos` (`ativo`, `motivo_inativacao`, `inativado_em`) e atualiza a tabela `usuarios` sem perda de dados existentes.
5. Verifique se todas as tabelas foram criadas com sucesso (`niveis_acesso`, `usuarios`, `clientes`, `veiculos`, `marcas_veiculo`, `modelos_veiculo`, `marcas_peca`, `pecas`, `servicos`, `oficinas`, `registros_troca`, `registros_servico`, `agendamentos`, `notificacoes`, `logs_auditoria`, `logs_lgpd`, `sessoes`).

---

## 3. Passo 2: Upload dos Arquivos do Projeto para o Servidor

Você pode subir os arquivos via **FTP (FileZilla)**, **Gerenciador de Arquivos do cPanel** ou **Git Version Control**:

Crie uma pasta para o projeto fora da pasta pública `public_html` (para preservar a segurança do código-fonte e das variáveis de ambiente), por exemplo:
`/home/meuuser/revsys/`

Escolha uma das duas estratégias abaixo para envio:

### 🌟 Estratégia 1: Build Local Pré-Compilado (ALTAMENTE RECOMENDADA)
> [!TIP]
> Em hospedagens compartilhadas cPanel (HostGator), o compilador TypeScript (`tsc`) pode falhar ou ter o processo encerrado por limite de memória RAM (CloudLinux LVE). Compilando localmente na sua máquina antes de subir, você elimina qualquer risco de estouro de memória, e o deploy no servidor leva poucos segundos!

1. Na sua máquina local (no terminal do projeto), execute:
   ```bash
   npm run build
   ```
   *(Isso gera a pasta `dist/` com todo o JavaScript pronto para produção).*
2. Envie para `/home/meuuser/revsys/` os seguintes arquivos e pastas:
   - `dist/` *(pasta com o código compilado)*
   - `views/` *(templates EJS)*
   - `public/` *(arquivos estáticos, incluindo `public/js/turbo.js`)*
   - `config/` *(contendo `config/config.js` para conexão do Sequelize)*
   - `app.js` *(arquivo universal de inicialização Phusion Passenger)*
   - `package.json` e `package-lock.json`
   - `.env` *(configurado para o ambiente de produção)*
3. **Não envie**: `node_modules` local (as dependências serão instaladas nativamente no servidor).

---

### ⚙️ Estratégia 2: Build Direto no Servidor (Para VPS ou Terminais com RAM Suficiente)
Se preferir compilar diretamente no servidor cPanel:
1. Envie para `/home/meuuser/revsys/` os seguintes arquivos e pastas:
   - `src/`
   - `models/`
   - `views/`
   - `public/`
   - `config/`
   - `app.js`
   - `tsconfig.json`
   - `package.json` e `package-lock.json`
   - `.env`
2. **Não envie**: a pasta local `node_modules`.

---

## 4. Passo 3: Configurar a Aplicação no "Setup Node.js App"

1. No cPanel da HostGator, vá até a seção **Software** e clique em **Setup Node.js App**.
2. Clique no botão **Create Application**.
3. Preencha os campos exatamente como abaixo:
   - **Node.js version**: Selecione `20.x` (ou `18.x` LTS).
   - **Application mode**: `Production`.
   - **Application root**: O caminho relativo da pasta do projeto (ex: `revsys`).
   - **Application URL**: O domínio ou subdomínio configurado (ex: `autec.com.br` ou `sistema.autec.com.br`).
   - **Application startup file**: `app.js`. *(O `app.js` na raiz detecta automaticamente a pasta `dist/src/app.js` e executa a aplicação com total compatibilidade com o Phusion Passenger).*
4. Clique em **Create**.

### 4.1 Configurar o Arquivo `.env` de Produção
No Gerenciador de Arquivos do cPanel, dentro de `/home/meuuser/revsys/`, crie ou edite o arquivo `.env`:
```env
PORT=3000
NODE_ENV=production

# Conexão MySQL Local HostGator (Host local na porta padrão)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=meuuser_revsys
DB_USER=meuuser_appuser
DB_PASS=SuaSenhaForteAqui123!#

# Chaves de Segurança e Criptografia LGPD
SESSION_SECRET=revsys_autec_super_secret_production_key_2026
AES_KEY=chave-secreta-aes-256-para-dados-lgpd-32-chars

# Configurações de E-mail (Opcional - SMTP HostGator para recuperação de senha)
SMTP_HOST=mail.autec.com.br
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@autec.com.br
SMTP_PASS=SenhaDoEmailAqui
```

> [!NOTE]
> A chave `AES_KEY` deve conter exatamente 32 caracteres (256 bits) para garantir o funcionamento correto da criptografia AES-256-CBC de dados sensíveis (CPF).

---

## 5. Passo 4: Instalar Dependências e Ativar o Sistema

No cPanel, na tela do seu aplicativo Node.js:
1. No topo, copie o comando de ativação do ambiente virtual fornecido pelo cPanel, por exemplo:
   ```bash
   source /home/meuuser/nodevenv/revsys/20/bin/activate && cd /home/meuuser/revsys
   ```
2. Abra o **Terminal** do cPanel (ou conecte via SSH) e cole esse comando.
3. Instale as dependências:

   **Se utilizou a Estratégia 1 (Build Local Recomendado):**
   ```bash
   npm install --omit=dev
   ```
   *(Instalação ultrarrápida contendo apenas dependências de produção, sem sobrecarregar a memória).*

   **Se utilizou a Estratégia 2 (Build no Servidor):**
   ```bash
   npm install --production=false
   npm run build
   ```
   *(Instala o TypeScript, compila os arquivos para `dist/`)*

4. Volte à tela do **Setup Node.js App** no cPanel e clique no botão **Restart**.
5. Acesse a URL do seu domínio no navegador. O sistema estará em operação!

---

## 6. Passo 5: Manutenção, Alertas e Rotina de Backup (Cron)

### 6.1 Como Funcionam os Alertas no RevSys
No RevSys, o cálculo de status de peças (Vencido, Próximo, Em Dia), as regras de agendamentos e a fila de presença de 24 horas são **processados dinamicamente em tempo real** diretamente pelo backend (`src/utils/alertas.ts`) a cada requisição ao Dashboard, Agenda ou Ficha do Veículo. Portanto, **não é necessária nenhuma rotina cron externa para calcular vencimentos**.

### 6.2 Rotina de Backup Automático Diário do Banco de Dados (Recomendado)
Para garantir a segurança dos dados e conformidade operacional, configure uma tarefa Cron no cPanel para gerar backup diário do MySQL:

1. No cPanel, acesse **Avançado** -> **Tarefas Cron**.
2. Em **Configurações comuns**, selecione `Uma vez por dia (à meia-noite)`.
3. No campo **Comando**, insira a rotina de dump compactado:
   ```bash
   mysqldump -u meuuser_appuser -p'SuaSenhaForteAqui123!#' meuuser_revsys | gzip > /home/meuuser/backups/revsys_$(date +\%F).sql.gz
   ```
   *(Certifique-se de que a pasta `/home/meuuser/backups/` exista).*

---

## 7. Checklist de Verificação Pós-Deploy

Após o deploy, realize a checagem operacional:

- [ ] **Autenticação**: Acessar `/login` e efetuar login com o administrador padrão (`admin@revsys.com` / `admin123`).
- [ ] **Troca de Senha**: Alterar a senha do administrador principal na área de gestão de usuários.
- [ ] **Cadastros Base (`/cadastros`)**:
  - Testar a abertura sob demanda dos formulários retráteis com botão `+ Novo...` (RF-42).
  - Testar a sanfona `Ver Itens` e a pesquisa em tempo real por palavra-chave (RF-43).
- [ ] **Trilha de Auditoria (`/auditoria`)**:
  - Verificar se a ação de login e operações recentes foram registradas com sucesso em `logs_auditoria` (RF-38).
  - Testar a visualização de relatório para impressão e exportação CSV/PDF (`/auditoria/relatorio`).
- [ ] **Governança LGPD (`/lgpd`)**:
  - Clicar no link **LGPD** no menu de navegação e testar a exibição da página institucional e botão de download em PDF (RF-40).
- [ ] **Ciclo de Vida e Inativação (`/veiculos/:id/editar` e `/clientes/:id/editar`)**:
  - Validar a checagem assíncrona de pendências com SweetAlert2 ao tentar inativar registro com agendamento ativo (RF-44).
- [ ] **Agendamento e Regras de Horário**:
  - Validar bloqueio de horários no passado, expediente comercial AUTEC (08h às 18h com almoço 12h-14h) e bloqueio de domingo (RF-34).
  - Verificar disparo da fila sequencial de confirmação de presença de 24h no Dashboard (RF-35).
- [ ] **Certificado de Segurança**: Confirmar que o HTTPS / SSL está ativo e forçado (AutoSSL cPanel).
