LEVANTAMENTO DE REQUISITOS – SISTEMA DE CONTROLE DE REPOSIÇÃO DE PEÇAS

Nome do sistema: RevSys

1. OBJETIVO GERAL
Sistema web Mobile First para gestão de trocas de peças, revisões e manutenção veicular, com módulo de agendamento por calendário, atalho para WhatsApp e conformidade com a LGPD. Atende oficina e clientes (acesso restrito a consulta e solicitação).

2. REQUISITOS FUNCIONAIS (RF)
MÓDULO 1 – AUTENTICAÇÃO E CONTROLE DE ACESSO
Código	Requisito	Descrição
RF-01	Login com e-mail + senha	Tela de login para todos. Senha com hash (bcrypt).
RF-02	Cadastro de usuários internos	Apenas administradores criam/editam/removem usuários da oficina (mecânico, atendente, gerente, admin).
RF-03	Cadastro de clientes (exclusivo pelo atendente)	Cliente NÃO se cadastra sozinho. Apenas atendente/gerente cadastra. Campos: CPF (único, validado), nome completo, e-mail, telefone/WhatsApp, endereço (logradouro, número, bairro, cidade, estado, CEP). Sistema gera senha provisória e envia por e-mail.
RF-04	Perfis de permissão (RBAC)	- Admin: tudo.
- Gerente: tudo, exceto excluir usuários internos.
- Atendente: cadastrar clientes/veículos, gerenciar agendamentos (criar, remarcar, cancelar, concluir), registrar trocas (com supervisão), visualizar tudo.
- Mecânico: registrar trocas, visualizar histórico e agenda. Não cadastra clientes.
- Cliente: visualizar apenas seus veículos, histórico, previsões e agendamentos (sem editar).
RF-05	Recuperação de senha	Envio de link/token por e-mail para redefinir senha (nodemailer).
MÓDULO 2 – CADASTROS BASE
Código	Requisito	Descrição
RF-06	Cadastro de Marcas	Nome da marca (ex: Toyota, Volkswagen, Michelin, Mobil).
RF-07	Cadastro de Modelos de Veículos	Nome do modelo (ex: Corolla, Golf), vinculado a uma Marca (de veículo).
RF-08	Cadastro de Peças	Nome da peça (ex: Óleo 5W30, Filtro de Óleo), vinculado a uma Marca (da peça).
RF-09	Cadastro de Oficinas	Nome, CNPJ, telefone, endereço, e-mail, número de WhatsApp (para atalho).
RF-10	Cadastro de Veículos (com entrada inicial)	Vinculado a um Cliente. Campos obrigatórios: Placa (única, formato Mercosul ou antigo), Modelo (relacionado à Marca), Ano, Cor, KM atual, Condição: NOVO ou USADO. Sistema é novo → atendente cadastra manualmente.
MÓDULO 3 – REGISTRO DE TROCA DE PEÇAS
Código	Requisito	Descrição
RF-11	Registrar uma troca	Selecionar Veículo (placa), Peça, informar: <ul><li>KM atual no momento da troca (obrigatório).</li><li>Data da troca (obrigatório, padrão hoje).</li><li>Nome de quem efetuou (campo texto ou selecionar usuário interno).</li><li>Oficina (cadastrada ou campo livre).</li><li>Observações (opcional).</li></ul>
RF-12	Previsão de próxima troca por KM	Campo editável "KM previsto para próxima troca".
RF-13	Previsão de próxima troca por DATA	Campo editável "Data prevista para próxima troca" – para peças que vencem com o tempo.
RF-14	Cálculo automático de alertas	Sistema calcula, com base no KM atual e data atual, se a peça já passou do prazo. Gera alerta visual (vermelho = vencido, amarelo = próximo).
RF-15	Histórico de trocas	Cada veículo exibe linha do tempo com todas as trocas, da mais recente para a mais antiga.
RF-16	Peças com validade mista	Peças podem ter apenas KM, apenas data, ou ambos. Sistema considera o que chegar primeiro.
MÓDULO 4 – AGENDAMENTO DE REVISÕES
Código	Requisito	Descrição
RF-17	Calendário de agendamentos	Tela com calendário visual (ex: FullCalendar) mostrando dias. Horários ocupados ficam desabilitados.
RF-18	Criação de agendamento	Atendente/gerente seleciona cliente/veículo, data e horário disponível, e preenche: motivo da revisão, observações, status "Agendado".
RF-19	Gerenciamento da agenda	Atendente/gerente pode: visualizar (calendário/lista), remarcar, cancelar, concluir, filtrar por data/cliente/veículo.
RF-20	Regra de ocupação	Sistema impede agendamento em horários já ocupados (ex: intervalos de 1 hora). Dias lotados são marcados visualmente.
RF-21	Visualização do cliente	Cliente vê apenas seus próprios agendamentos (futuros e passados), sem editar.
MÓDULO 5 – DASHBOARD E CONSULTAS
Código	Requisito	Descrição
RF-22	Painel da oficina	Visão geral com: veículos com manutenção atrasada, próximas trocas (7 dias), total de trocas no mês, agendamentos do dia.
RF-23	Busca por veículo (placa)	Busca rápida que exibe dados do veículo, cliente, histórico de trocas e agendamentos.
RF-24	Relatório por peça	Lista todas as trocas de uma peça específica.
RF-25	Relatório por cliente	Exibe todos os veículos de um cliente e status de manutenção de cada um.
MÓDULO 6 – ACESSO DO CLIENTE
Código	Requisito	Descrição
RF-26	Área do cliente	Cliente vê seus veículos e agendamentos. Para cada veículo: KM atual, peças trocadas, próximas trocas com alertas.
RF-27	Solicitação via sistema	Botão "Solicitar manutenção" ou "Solicitar revisão" – gera notificação interna (não cria agendamento automático).
RF-28	Cliente NÃO edita nada	Apenas visualização e solicitação.
MÓDULO 7 – COMUNICAÇÃO E LGPD
Código	Requisito	Descrição
RF-29	Atalho WhatsApp (flutuante)	Em todas as telas (exceto login), botão flutuante com ícone WhatsApp que abre wa.me/55XXXXXXXXXXX?text=.... Tamanho mínimo 56x56px.
RF-30	Cadastro obrigatório via CPF	CPF é identificador único, com validação e impedimento de duplicidade.
RF-31	Termo de Consentimento LGPD	Checkbox obrigatório no cadastro: "Declaro que li e concordo com a Política de Privacidade e com o tratamento dos meus dados pessoais conforme a LGPD." Link para política. Armazenar data/hora, IP e User-Agent.
RF-32	Painel de consentimento	Cliente pode revogar consentimento na área do cliente. Sistema inativa cadastro para novos contatos, mantendo histórico.
MÓDULO 8 – REGRAS DE NEGÓCIO ADICIONAIS
Código	Requisito	Descrição
RF-33	Atualização e Proteção Anti-Regressão de KM	Ao registrar troca ou serviço, o sistema permite atualizar o KM atual do veículo. Valida estritamente para impedir KM inferior ao atual já registrado. Em caso de discrepância, aborta via transação SQL com rollback e exibe alerta amigável na interface (SweetAlert2 e banner Tailwind) sem expor termos de desenvolvedor ("Inconsistência lógica").
RF-34	Configuração de Horário Comercial (AUTEC)	Agendamento respeita expediente (08:00 às 18:00), fechamento no almoço (12:00 às 14:00), sábados das 08:00 às 12:00 (início permitido até às 10:00) e domingo totalmente fechado.
RF-35	Fila de Confirmação de Presença (Janela 24h)	Alerta sequencial no Dashboard para agendamentos nas próximas 24h. O operador pode solicitar via WhatsApp, adiar por 60 min ou confirmar presença. Agendamentos cancelados ou concluídos são rigorosamente excluídos da fila e dos modais.
RF-36	Notificações Detalhadas de Agendamento	Ao confirmar presença de um agendamento, o sistema gera dinamicamente uma notificação interna para a equipe contendo o modelo do veículo, a placa, o nome do cliente proprietário, a data e a hora da revisão.
RF-37	Resiliência e Tratamento Amigável de Falhas de Banco	Caso o servidor MySQL esteja inacessível (conexão recusada, timeout ou offline), o sistema captura o erro globalmente e apresenta uma tela amigável (views/erros/banco.ejs) orientando o usuário a verificar a internet e contatar o suporte, sem exibir stack trace tanto em dev quanto em prod.
RF-38	Módulo de Auditoria e Rastreabilidade de Operações	Registro contínuo e seguro de todas as ações de CRUD, logins, tentativas com falha e logouts em tabela dedicada (`logs_auditoria`). Página exclusiva para o perfil Administrador com filtros por período, usuário, ação, módulo e busca livre. Geração de relatórios formatados para impressão em papel e exportação nativa em PDF ou CSV com cabeçalho oficial AUTEC.
RF-39	Classificação de Níveis de Acesso (Tabela dedicada)	Tabela `niveis_acesso` para controle e classificação formal dos privilégios de acesso do sistema (Admin, Gerente, Atendente, Mecânico e Cliente), com chave estrangeira na tabela de usuários.
RF-40	Termo e Declaração de Conformidade LGPD no Menu	Página institucional acessível pela rota `/lgpd` (exibida como a última opção do menu de navegação com texto "LGPD" para todos os perfis). Apresenta os termos de governança, finalidades de tratamento para serviços automotivos, regras rígidas de segurança com criptografia de CPF, política estrita de não comercialização/compartilhamento externo de dados e canais do DPO. Contém botões dedicados para impressão e exportação direta do documento para PDF.
RF-41	Cadastro e Gestão de Usuários com Nível de Acesso no Cadastro Base	Opção exclusiva para o perfil Administrador no painel de Cadastros Base (`/cadastros`) que permite cadastrar novos usuários definindo nome, e-mail, senha e nível de acesso correspondente (a partir da tabela `niveis_acesso`, com ordenação alfabética obrigatória conforme RF-02). Inclui listagem dos usuários ativos com badges de perfil, exclusão com modal de confirmação e proteção contra auto-exclusão e exclusão do administrador principal. Todas as operações são registradas na trilha de auditoria (`logs_auditoria`).
RF-42	Abertura Sob Demanda de Formulários no Cadastro Base	No painel de Cadastros Base (`/cadastros`), todos os formulários de inserção (Marcas de Veículos, Modelos, Fabricantes de Peças, Peças, Serviços da Oficina, Oficinas e Usuários do Sistema) permanecem recolhidos por padrão, sendo exibidos sob demanda através de botões gatilho dedicados com alternância visual (`+ Novo...` / `Cancelar`), atalhos de ação rápida no topo e foco inteligente, otimizando o espaço em tela e a usabilidade.
RF-43	Sanfona (Accordion) de Itens Cadastrados e Busca por Palavra-Chave no Cadastro Base	No painel de Cadastros Base (`/cadastros`), os itens cadastrados de cada uma das seções ficam recolhidos dentro de elementos do tipo sanfona (accordion) por padrão, liberados via botão gatilho "Ver Itens" com contador dinâmico e alternância para "Ocultar Itens". Cada seção aberta disponibiliza um filtro de pesquisa instantâneo por palavra-chave (tolerante a acentos e maiúsculas/minúsculas) que filtra em tempo real as linhas ou cards pelo nome, fabricante, e-mail, perfil ou CNPJ, exibindo feedback amigável caso nenhum resultado coincida.
RF-44	Inativação de Clientes e Veículos com Checagem Proativa de Pendências e Feedback Personalizado	Nos formulários de edição de cliente (`/clientes/:id/editar`) e de veículo (`/veiculos/:id/editar`), é disponibilizada a opção de alterar a situação entre Ativo e Inativo. Ao alternar para Inativo ou submeter o formulário, o sistema realiza checagem proativa assíncrona (`/veiculos/:id/pendencias-inativacao` e `/clientes/:id/pendencias-inativacao`). Havendo qualquer agendamento pendente ativo (status "Agendado"), o sistema bloqueia preventivamente a inativação, exibe um banner inline descritivo e abre um modal personalizado (SweetAlert2) detalhando data, horário e motivo de cada agendamento pendente, fornecendo atalho direto para a ficha do veículo/cliente para conclusão ou cancelamento prévio. O motivo da inativação é estritamente obrigatório a partir de opções predefinidas com abertura dinâmica de campo de texto para "Outros". Clientes e veículos inativos ficam bloqueados para novos agendamentos e solicitações de manutenção, com badges visuais em listagens e banners de destaque em suas telas de detalhes.
3. REQUISITOS NÃO FUNCIONAIS (RNF)
DESEMPENHO E ESCALABILIDADE
Código	Requisito	Descrição
RNF-01	Tempo de resposta	Páginas em até 2s em banda larga.
RNF-02	Suporte a múltiplos usuários	Até 50 simultâneos sem degradação.
RNF-03	Banco indexado	Índices em placa, CPF, nome da peça.
RNF-04	Paginação	Listas > 50 itens com paginação (20/página).
RNF-05	Cache	Cache para listas de peças/marcas (node-cache).
SEGURANÇA
Código	Requisito	Descrição
RNF-06	Senhas com hash	bcrypt com custo 10+.
RNF-07	Proteção SQL Injection	Prepared statements (Sequelize).
RNF-08	Proteção CSRF	Tokens CSRF em formulários.
RNF-09	Sessão com timeout	Expira em 60 min.
RNF-10	Controle de acesso no backend	Middleware de autorização por rota.
MOBILE FIRST E USABILIDADE
Código	Requisito	Descrição
RNF-11	Mobile First	Layout projetado primeiramente para mobile (320-480px) e aprimorado com breakpoints sm:, md:, lg:.
RNF-11.1	Navegação para polegares	Botões com mínimo 44x44px, posicionados em áreas de fácil alcance.
RNF-11.2	Componentes adaptáveis	Calendário touch-friendly; tabelas viram cards em mobile.
RNF-11.3	Testes de responsividade	Testar nos breakpoints: mobile (320-480px), tablet (768-1024px), desktop (≥1280px).
RNF-12	Feedback visual	Toasts de sucesso/erro.
RNF-13	Confirmação antes de deletar	Modal ou bottom-sheet.
RNF-14	Temas claro/escuro	Opcional, com preferência do sistema.
RNF-15	Máscaras em campos	CPF, CNPJ, telefone, placa (compatível com teclado mobile).
TECNOLOGIAS E ARQUITETURA
Código	Requisito	Descrição
RNF-16	Backend	Node.js + Express, MVC.
RNF-17	ORM	Sequelize com MySQL.
RNF-18	Frontend	EJS + Tailwind CSS (Mobile First).
RNF-19	Banco	MySQL 8.0+ InnoDB.
RNF-20	Versionamento	Git + .env para variáveis.
LGPD E OUTROS
Código	Requisito	Descrição
RNF-21	Criptografia de dados sensíveis	CPF e dados pessoais criptografados em repouso (AES-256).
RNF-22	Tempo de retenção	5 anos após última interação, depois anonimização.
RNF-23	Integração WhatsApp	Link wa.me – sem API.
RNF-24	Calendário responsivo	Touch-friendly, fonte ≥14px.
RNF-25	Backup automático	Backup diário do MySQL.
4. MODELO DE DADOS (NOMES EM PORTUGUÊS)
Tabela (PT-BR)	Campos (PT-BR)	Relacionamento
niveis_acesso	id, nome (ENUM: admin, gerente, atendente, mecanico, cliente), titulo, descricao, nivel_hierarquia, criado_em	1:N com usuarios
usuarios	id, nome, email (único), senha_hash, papel (admin/gerente/atendente/mecanico/cliente), nivel_acesso_id (FK), telefone, criado_em	N:1 com niveis_acesso
clientes	id, usuario_id (FK), cpf (único), endereco (logradouro, numero, bairro, cidade, estado, cep), consentimento_lgpd (boolean), data_consentimento_lgpd (datetime), telefone_whatsapp, ativo (boolean), motivo_inativacao (text), inativado_em (datetime)	1:1 com usuarios
marcas_veiculo	id, nome	-
modelos_veiculo	id, nome, marca_veiculo_id (FK)	N:1 com marcas_veiculo
veiculos	id, placa (única), modelo_id (FK), cliente_id (FK), ano, cor, km_atual, condicao (ENUM: 'novo', 'usado'), ativo (boolean), motivo_inativacao (text), inativado_em (datetime)	N:1 com cliente, N:1 com modelo
marcas_peca	id, nome	-
pecas	id, nome, marca_peca_id (FK)	N:1 com marcas_peca
oficinas	id, nome, cnpj, telefone, endereco, email, whatsapp_numero	-
registros_troca	id, veiculo_id (FK), peca_id (FK), oficina_id (FK - pode ser NULL), nome_oficina_manual (campo livre), km_na_troca, data_troca, km_previsto_proximo, data_prevista_proximo, executado_por (nome ou FK usuario_id), observacoes, criado_em	N:1 com veiculo, N:1 com peca, N:1 com oficina
agendamentos	id, cliente_id (FK), veiculo_id (FK), data_agendada (date), horario_agendado (time), status (agendado/concluido/cancelado), motivo_revisao (text), observacoes, criado_por (usuario_id FK), criado_em	N:1 com cliente, N:1 com veiculo, N:1 com usuario
logs_lgpd	id, cliente_id (FK), consentimento_dado (boolean), ip_origem, user_agent, criado_em	N:1 com cliente
notificacoes	id, tipo (solicitacao_cliente, alerta_troca, lembrete_agendamento), mensagem, lida (boolean), usuario_id (FK), criado_em	N:1 com usuario
logs_auditoria	id, usuario_id (FK), usuario_nome, usuario_email, usuario_papel, acao, recurso, registro_id, descricao, dados_anteriores (JSON), dados_novos (JSON), ip, user_agent, criado_em	N:1 com usuarios
5. ROTAS SUGERIDAS (TUDO EM PORTUGUÊS)
text
GET  /login            → exibe login
POST /login            → autentica
GET  /sair             → destrói sessão

GET  /painel           → dashboard principal

// Cadastros
GET  /veiculos         → listar veículos
POST /veiculos         → criar
PUT  /veiculos/:id     → atualizar
DEL  /veiculos/:id     → deletar
GET  /veiculos/:id     → detalhes (com histórico e agendamentos)

// Cadastros Auxiliares e Usuários do Sistema
GET  /cadastros         → visão unificada de marcas, modelos, peças, serviços, oficinas e usuários
POST /usuarios          → criar novo usuário com nível de acesso (Exclusivo Administrador)
DELETE /usuarios/:id    → excluir usuário do sistema (Exclusivo Administrador)

// Trocas
POST /troca            → registrar troca
GET  /troca/veiculo/:veiculo_id → histórico do veículo

// Serviços
POST /servicos/veiculo/:id → registrar serviço avulso no veículo
POST /servicos/veiculo/:id/excluir/:servico_id → remover registro de serviço

// Agendamentos
GET  /agendamentos/calendario → dados para calendário (JSON)
POST /agendamentos     → criar agendamento
POST /agendamentos/:id/status → atualizar status (cancelar, concluir, reagendar)
POST /agendamentos/:id/confirmar-presenca → confirmar presença e gerar notificação
POST /agendamentos/:id/adiar-presenca → adiar alerta de presença por 60 min
GET  /agendamentos     → lista com filtros por data, cliente e veículo

// Auditoria e Rastreabilidade (Exclusivo Administrador)
GET  /auditoria        → listagem com filtros por período, usuário, ação, módulo e busca livre
GET  /auditoria/relatorio → visualização formatada para impressão em papel e exportação em PDF/CSV
GET  /auditoria/:id/detalhes → detalhes completos da operação em JSON para modal

// Termo e Conformidade LGPD (Todos os perfis)
GET  /lgpd                → página institucional de conformidade LGPD, termo e regras de tratamento com impressão e exportação para PDF

// Cliente (área pública)
GET  /cliente/veiculos → veículos do cliente logado
GET  /cliente/veiculo/:id → detalhes com previsões e agendamentos
POST /cliente/solicitar-manutencao → solicitar serviço

// Relatórios
GET  /relatorios/vencidos → trocas vencidas
GET  /relatorios/proximos → próximas trocas (7 dias)
GET  /relatorios/agendamentos → agendamentos do dia/mês

// Notificações
GET  /notificacoes     → listagem de notificações internas
POST /notificacoes/:id/lida → marcar notificação como lida

6. ORIENTAÇÕES PARA AGENTES DE IA (IMPLEMENTAÇÃO)
Backend: Desenvolvido integralmente em TypeScript com tipagem estrita (`strict: true`). Modelos em `models/` usando Sequelize v6 com `declare`.

Middlewares: `estaAutenticado`, `temPapel('admin', 'gerente', 'atendente', 'mecanico', 'cliente')`.

Resiliência de Banco de Dados: Interceptador global em `src/utils/erros.ts` que captura `SequelizeConnectionRefusedError` e falhas de socket, renderizando tela amigável (`views/erros/banco.ejs`) com orientações de checagem de internet e contato com suporte, sem expor mensagens técnicas tanto em desenvolvimento quanto em produção.

Feedback e Tratamento de Erros no Frontend: Validações lógicas (como KM inferior ao atual do veículo) nunca devem estourar telas brancas com erro HTTP puro. Devem redirecionar com mensagens amigáveis e claras (`?erro=...`) sem jargões de desenvolvedor, acionando modais interativos SweetAlert2 e banners Tailwind CSS.

Validação de CPF e Criptografia: Validação de dígito verificador real; criptografia simétrica AES-256-CBC no banco e HMAC-SHA256 para Blind Index em consultas exatas.

Frontend (EJS + Tailwind + Turbo Drive):
- Mobile First com flexibilidade e responsividade completa.
- Navegação instantânea SPA com Turbo Drive local (`/js/turbo.js`).
- Calendário: FullCalendar v6 interativo com bloqueio de datas passadas, domingo e horário de almoço (12h às 14h).
- Máscaras: Implementadas via JavaScript em CPF, telefone, placa e CEP.
- Fila de Confirmação de Presença: Modais sequenciais de alerta no dashboard (24h antes) processando estritamente agendamentos com status "agendado" (agendamentos cancelados ou concluídos são sumariamente excluídos da fila).
- Notificações de Agendamento: Notificações do tipo `lembrete_agendamento` geradas dinamicamente contendo modelo do veículo, placa, nome do proprietário, data e hora da revisão.