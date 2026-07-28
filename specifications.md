# Especificações do Sistema - RevSys

## 1. Visão Geral do Projeto
O **RevSys** é um sistema web de gestão automotiva e manutenção preventiva para oficinas mecânicas e proprietários de veículos. O sistema permite o cadastro de clientes, veículos, peças, serviços e oficinas parceiras, além de gerenciar a linha do tempo de trocas de componentes, execução de serviços avulsos, cálculo de alertas de vencimento por quilometragem/tempo, e agendamento de revisões em boxes de atendimento.

---

## 2. Arquitetura e Stack Tecnológica

- **Runtime & Ambiente**: Node.js (v18+)
- **Framework Web**: Express.js
- **View Engine**: EJS (Server-Side Rendering com componentes e layouts modulares)
- **ORM & Banco de Dados**:
  - **Sequelize ORM** (v6)
  - **MySQL 8.0+** (Ambiente principal de produção/desenvolvimento)
  - **SQLite** (Suporte a desenvolvimento local/testes rápidos via `database.sqlite`)
- **Estilização e UI**:
  - TailwindCSS (com design moderno em dark/light contrast, cards com cantos arredondados `rounded-2xl`, micro-interações)
  - **Lucide Icons** (ícones vetoriais dinâmicos)
  - **FullCalendar v6** (interface interativa de agendamento em calendário)
- **Segurança & Privacidade**:
  - **Criptografia AES-256-CBC** para dados pessoais sensíveis (CPF de clientes)
  - **Blind Index (HMAC-SHA256)** para buscas exatas e unicidade sem descriptografar dados
  - **bcryptjs** (Hash salgado para senhas de usuários)
  - **express-session** (Gerenciamento de sessões com controle de acesso por papéis/RBAC)
- **Desempenho & Caching**:
  - **node-cache** (In-memory TTL 3600s) para aceleração de dados mestre/auxiliares.

---

## 3. Estrutura de Arquivos e Diretórios

```
c:\Projetos\RevSys\
├── app.js                          # Ponto de entrada da aplicação Express
├── banco.sql                       # DDL/DML atualizado para MySQL (Tabelas e Seeds)
├── config/
│   ├── config.json                 # Configurações do Sequelize (desenvolvimento/produção)
│   └── database.js                 # Instância centralizada do Sequelize
├── models/                         # Modelos do Sequelize e associações
│   ├── index.js                    # Carregador e registrador de relacionamentos
│   ├── Usuario.js
│   ├── Cliente.js
│   ├── MarcaVeiculo.js
│   ├── ModeloVeiculo.js
│   ├── Veiculo.js
│   ├── MarcaPeca.js
│   ├── Peca.js
│   ├── Servico.js                  # Catálogo de serviços da oficina
│   ├── RegistroTroca.js            # Histórico de trocas de peças
│   ├── RegistroServico.js          # Histórico de serviços prestados
│   ├── Oficina.js
│   ├── Agendamento.js
│   ├── LogLgpd.js
│   └── Notificacao.js
├── seeders/
│   └── 20260717000001-dados-iniciais.js # Seeder inicial completo (marcas, modelos, peças, serviços)
├── src/
│   ├── controllers/                # Lógica de controle das requisições
│   │   ├── AutenticacaoController.js
│   │   ├── PainelController.js
│   │   ├── ClienteController.js
│   │   ├── VeiculoController.js
│   │   ├── TrocaController.js
│   │   ├── ServicoController.js    # Controle de registros de serviços nos veículos
│   │   ├── AgendamentoController.js
│   │   ├── CadastroBaseController.js # CRUD de tabelas auxiliares (Marcas, Peças, Serviços, etc.)
│   │   ├── RelatorioController.js
│   │   ├── NotificacaoController.js
│   │   └── ClienteAreaController.js
│   ├── middlewares/                # Middlewares de autenticação e RBAC
│   │   └── autenticacao.js
│   ├── routes/
│   │   └── web.js                  # Mapeamento de rotas web e endpoints REST/AJAX
│   └── utils/
│       ├── alertas.js              # Algoritmo de cálculo de status de substituição (KM / Tempo)
│       ├── cache.js                # Utilitário de gerenciamento e invalidação de cache
│       └── criptografia.js         # AES-256 e Blind Index para conformidade LGPD
└── views/                          # Templates EJS por módulo
    ├── autenticacao/
    ├── clientes/
    ├── veiculos/
    ├── agendamentos/
    ├── cadastros/
    ├── relatorios/
    └── parciais/
```

---

## 4. Modelos e Relacionamentos de Dados

1. **`Usuario` 1:1 `Cliente`** (opcional: clientes possuem conta de usuário no papel `cliente`).
2. **`MarcaVeiculo` 1:N `ModeloVeiculo`**: Marcas automotivas (ex: Fiat, Volkswagen, Toyota).
3. **`ModeloVeiculo` 1:N `Veiculo`**: Modelos específicos vinculados à marca.
4. **`Cliente` 1:N `Veiculo`**: Proprietário do veículo.
5. **`MarcaPeca` 1:N `Peca`**: Fabricantes de peças (ex: Bosch, NGK, Cofap).
6. **`Veiculo` 1:N `RegistroTroca` 1:N `Peca`**: Histórico de trocas de componentes com previsão de próxima manutenção por KM e Data.
7. **`Veiculo` 1:N `RegistroServico` 1:N `Servico`**: Histórico de execução de serviços que não dependem de troca de peças (ex: Alinhamento 3D, Sangria de Freio, Higienização).
8. **`Agendamento`**: Vincula `Cliente`, `Veiculo` e opcionalmente `Servico` para reserva de box em horário comercial (08:00 às 17:00).
9. **`Oficina`**: Cadastro de matriz/filiais e oficinas externas executoras.

---

## 5. Regras Funcionais Chave (RFs)

- **RF-01 (Separação Marca/Modelo)**: Formulários de seleção de veículo devem separar explicitamente a Marca do Modelo.
- **RF-02 (Ordenação Alfabética)**: Todos os selects/dropdowns de cadastros mestre (Marcas, Modelos, Peças, Serviços, Clientes, Oficinas) DEVEM ser exibidos em ordem alfabética (`ASC`).
- **RF-11 / RF-15 (Histórico e Alertas)**: As trocas de peças e serviços são organizados da mais recente para a mais antiga na linha do tempo. O sistema calcula status:
  - `Vencido` (KM excedido ou data ultrapassada)
  - `Próximo` (faltando <= 1000 km ou <= 30 dias)
  - `Em dia`
- **RF-20 / RF-34 (Agendamento Comercial)**: Horários permitidos entre 08:00 e 17:00. O sistema impede agendamentos simultâneos no mesmo slot de horário.
- **RF-33 (Atualização Dinâmica de KM)**: Ao registrar qualquer troca de peça ou serviço com opção de atualização marcada, o `km_atual` do veículo é atualizado atomicamente na mesma transação.
- **LGPD Compliance**: CPF armazenado criptografado via AES-256-CBC + HMAC-SHA256 Blind Index. Registros de consentimento em `LogLgpd`.
