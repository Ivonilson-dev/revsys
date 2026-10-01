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
2. No menu lateral esquerdo, clique no banco de dados que acabou de criar (`meuuser_revsys`).
3. Clique na aba superior **Importar** (ou na aba **SQL**).
4. Você pode:
   - **Opção A**: Clicar em *Escolher arquivo*, selecionar o arquivo `banco.sql` do projeto e clicar em **Executar**.
   - **Opção B**: Abrir o arquivo [scripts_bd_producao.md](file:///c:/Projetos/RevSys/scripts_bd_producao.md), copiar todo o bloco SQL da Seção 2, colar na aba **SQL** do phpMyAdmin e executar.
   - **Opção C (Bancos Já Ativos / Atualização Incremental)**: Caso o banco de produção já esteja em operação, copie e execute o script SQL da **Seção 4 de scripts_bd_producao.md**, que cria as tabelas `niveis_acesso` e `logs_auditoria`, adiciona as colunas de inativação e controle de status em `clientes` e `veiculos` (`ativo`, `motivo_inativacao`, `inativado_em`) e atualiza a tabela `usuarios` sem perda de dados existentes.
5. Verifique se todas as tabelas foram criadas com sucesso (`niveis_acesso`, `usuarios`, `clientes`, `veiculos`, `pecas`, `servicos`, `oficinas`, `registros_troca`, `registros_servico`, `agendamentos`, `notificacoes`, `logs_auditoria`, `logs_lgpd`, `sessoes`).

---

## 3. Passo 2: Upload dos Arquivos do Projeto para o Servidor

Você pode subir os arquivos via **Git Version Control** (no cPanel), via **FTP (FileZilla)** ou pelo **Gerenciador de Arquivos**:

1. Crie uma pasta para o projeto fora da `public_html`, por exemplo:
   `/home/meuuser/revsys/`
2. Envie os arquivos do projeto para essa pasta:
   - `app.js` (inicializador raiz Passenger)
   - `src/`
   - `models/`
   - `views/`
   - `public/` (incluindo `public/js/turbo.js` para navegação SPA)
   - `package.json`
   - `package-lock.json`
   - `tsconfig.json`
   - `.env` (configurado para produção)
3. **Atenção**: Não envie a pasta local `node_modules`. Ela será gerada no servidor da HostGator para garantir binários compatíveis com o Linux.

---

## 4. Passo 3: Configurar a Aplicação no "Setup Node.js App"

1. No cPanel, vá até a seção **Software** e clique em **Setup Node.js App**.
2. Clique no botão **Create Application**.
3. Preencha os campos exatamente como abaixo:
   - **Node.js version**: Selecione `20.x` (ou `18.x` LTS).
   - **Application mode**: `Production`.
   - **Application root**: O caminho da pasta do projeto (ex: `revsys`).
   - **Application URL**: O domínio ou subdomínio (ex: `autec.com.br` ou `sistema.autec.com.br`).
   - **Application startup file**: `app.js` (ou `dist/src/app.js`). *Recomendamos manter `app.js`, pois o arquivo raiz detecta automaticamente a compilação do TypeScript e delega para `dist/src/app.js` com suporte integral ao Phusion Passenger.*
4. Clique em **Create**.

### 4.1 Configurar o Arquivo `.env` de Produção
No Gerenciador de Arquivos, dentro de `/home/meuuser/revsys/`, crie ou edite o arquivo `.env`:
```env
PORT=3000
NODE_ENV=production

# Conexão MySQL Local HostGator
DB_HOST=localhost
DB_PORT=3306
DB_NAME=meuuser_revsys
DB_USER=meuuser_appuser
DB_PASS=SuaSenhaForteAqui123!#

# Chaves de Segurança
SESSION_SECRET=revsys_autec_super_secret_production_key_2026
AES_KEY=chave-secreta-aes-256-para-dados-lgpd-32-chars

# Configurações de E-mail (Opcional - SMTP HostGator)
SMTP_HOST=mail.autec.com.br
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contato@autec.com.br
SMTP_PASS=SenhaDoEmailAqui
```

---

## 5. Passo 4: Instalar Dependências e Compilar o TypeScript

No cPanel, na tela do seu aplicativo Node.js:
1. No topo, copie o comando de ativação do ambiente virtual fornecido pelo cPanel, algo como:
   `source /home/meuuser/nodevenv/revsys/20/bin/activate && cd /home/meuuser/revsys`
2. Abra o **Terminal** do cPanel (ou conecte via SSH) e cole esse comando.
3. Instale as dependências:
   ```bash
   npm install --production=false
   ```
   *(O `--production=false` garante a instalação do TypeScript e das tipagens necessárias para a compilação).*
4. Execute o build do TypeScript:
   ```bash
   npm run build
   ```
   Isso criará a pasta `dist/` com todos os arquivos compilados e prontos para produção.
5. Volte à tela do **Setup Node.js App** no cPanel e clique no botão **Restart**.
6. Acesse o seu domínio no navegador. O sistema estará funcionando!

---

## 6. Passo 5: Configuração de Tarefas Cron (Manutenção e Alertas)

No cPanel, vá em **Avançado** -> **Tarefas Cron**:
1. No campo **Configurações comuns**, selecione `Uma vez por dia (à meia-noite)`.
2. No campo **Comando**, configure a rotina de encerramento automático de agendamentos e verificação de vencimentos:
   ```bash
   /home/meuuser/nodevenv/revsys/20/bin/node /home/meuuser/revsys/dist/scripts/cron_rotina.js
   ```

---

## 7. Checklist de Verificação Pós-Deploy

- [ ] Acessar `/login` e efetuar login com o usuário administrador padrão (`admin@revsys.com` / `admin123`).
- [ ] Alterar a senha do administrador imediatamente no sistema.
- [ ] Cadastrar um agendamento e verificar se as datas/horários são respeitadas.
- [ ] Testar o envio do botão de WhatsApp em veículos atrasados.
- [ ] Confirmar que os certificados SSL (HTTPS) estão ativos e funcionando pelo cPanel (Let's Encrypt / AutoSSL).
