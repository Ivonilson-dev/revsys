# Scripts de Banco de Dados para Produção (MySQL 8.0+) - RevSys

Este documento contém todos os scripts SQL (DDL e DML inicial) necessários para a implantação (*deploy*) do banco de dados do **RevSys** em ambiente de produção.

> [!IMPORTANT]
> **REGRA DE MANUTENÇÃO CONTÍNUA DO ARQUIVO:**
> Sempre que houver qualquer alteração na modelagem do banco em ambiente de desenvolvimento (criação de novas tabelas, alteração/inclusão de colunas, novos índices, ajustes em restrições ou inclusão de dados mestre/essenciais), este arquivo **DEVE ser atualizado imediatamente**, mantendo estrita paridade com os modelos em `models/` e o script `banco.sql`.

---

## 1. Instruções para Implantação em Produção

### 1.1 Pré-requisitos
* **SGBD**: MySQL 8.0 ou superior (ou MariaDB 10.5+ com suporte pleno a InnoDB e JSON/UTF8MB4).
* **Charset padrão**: `utf8mb4`
* **Collation**: `utf8mb4_unicode_ci`
* **Engine**: `InnoDB`

### 1.2 Como Executar o Script

#### Opção A: Linha de Comando (MySQL CLI / Terminal do Servidor)
```bash
mysql -u seu_usuario_producao -p < scripts_producao.sql
```
*(ou copie e cole o bloco SQL abaixo diretamente no prompt do MySQL)*

#### Opção B: Ferramenta Gráfica (phpMyAdmin / MySQL Workbench / DBeaver)
1. Conecte-se ao servidor MySQL de produção.
2. Abra uma aba de consulta SQL (**SQL Query**).
3. Cole integralmente o bloco SQL da Seção 2 e execute.

---

## 2. Script SQL Completo de Produção (DDL + Seeds Essenciais)

```sql
-- ========================================================
-- REVSYS - SCRIPT OFICIAL DE IMPLANTAÇÃO EM PRODUÇÃO
-- Compatível com MySQL 8.0+ (InnoDB / utf8mb4)
-- ========================================================

-- Criação da Base de Dados
CREATE DATABASE IF NOT EXISTS `revsys` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `revsys`;

-- --------------------------------------------------------
-- 0. TABELA: niveis_acesso (Classificação Formal de Níveis de Acesso)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `niveis_acesso` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` ENUM('admin', 'gerente', 'atendente', 'mecanico', 'cliente') NOT NULL UNIQUE,
  `titulo` VARCHAR(100) NOT NULL,
  `descricao` TEXT NULL,
  `nivel_hierarquia` INT NOT NULL DEFAULT 5,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 1. TABELA: usuarios
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `senha_hash` VARCHAR(255) NOT NULL,
  `papel` ENUM('admin', 'gerente', 'atendente', 'mecanico', 'cliente') NOT NULL DEFAULT 'cliente',
  `nivel_acesso_id` INT NULL,
  `telefone` VARCHAR(20) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_usuarios_nivel_acesso` FOREIGN KEY (`nivel_acesso_id`) REFERENCES `niveis_acesso` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_usuarios_email` (`email`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 2. TABELA: clientes
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `cpf` TEXT NOT NULL, -- Criptografado em repouso com AES-256-CBC
  `cpf_hash` VARCHAR(64) NOT NULL UNIQUE, -- Blind Index SHA256 para busca exata
  `logradouro` TEXT NULL,
  `numero` TEXT NULL,
  `bairro` TEXT NULL,
  `cidade` TEXT NULL,
  `estado` TEXT NULL,
  `cep` TEXT NULL,
  `telefone_whatsapp` TEXT NULL,
  `consentimento_lgpd` TINYINT(1) NOT NULL DEFAULT 0,
  `data_consentimento_lgpd` DATETIME NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `motivo_inativacao` TEXT NULL,
  `inativado_em` DATETIME NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_clientes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_clientes_cpf_hash` (`cpf_hash`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 3. TABELA: marcas_veiculo
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marcas_veiculo` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL UNIQUE,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_marcas_veiculo_nome` (`nome`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 4. TABELA: modelos_veiculo
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `modelos_veiculo` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL,
  `marca_veiculo_id` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_modelos_marca` FOREIGN KEY (`marca_veiculo_id`) REFERENCES `marcas_veiculo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_modelos_veiculo_nome` (`nome`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 5. TABELA: veiculos
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `veiculos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `placa` VARCHAR(10) NOT NULL UNIQUE,
  `modelo_id` INT NOT NULL,
  `cliente_id` INT NOT NULL,
  `ano` INT NOT NULL,
  `cor` VARCHAR(50) NOT NULL,
  `km_atual` INT NOT NULL,
  `condicao` ENUM('novo', 'usado') NOT NULL DEFAULT 'usado',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `motivo_inativacao` TEXT NULL,
  `inativado_em` DATETIME NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_veiculos_modelo` FOREIGN KEY (`modelo_id`) REFERENCES `modelos_veiculo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_veiculos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_veiculos_placa` (`placa`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 6. TABELA: marcas_peca
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `marcas_peca` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL UNIQUE,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_marcas_peca_nome` (`nome`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 7. TABELA: pecas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pecas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `marca_peca_id` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pecas_marca` FOREIGN KEY (`marca_peca_id`) REFERENCES `marcas_peca` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_pecas_nome` (`nome`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 8. TABELA: oficinas
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `oficinas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `cnpj` VARCHAR(18) NOT NULL UNIQUE,
  `telefone` VARCHAR(20) NULL,
  `endereco` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `whatsapp_numero` VARCHAR(20) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 9. TABELA: registros_troca
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `registros_troca` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `veiculo_id` INT NOT NULL,
  `peca_id` INT NOT NULL,
  `oficina_id` INT NULL,
  `nome_oficina_manual` VARCHAR(255) NULL,
  `km_na_troca` INT NOT NULL,
  `data_troca` DATE NOT NULL,
  `km_previsto_proximo` INT NULL,
  `data_prevista_proximo` DATE NULL,
  `executado_por` VARCHAR(255) NOT NULL,
  `observacoes` TEXT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_trocas_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_trocas_peca` FOREIGN KEY (`peca_id`) REFERENCES `pecas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_trocas_oficina` FOREIGN KEY (`oficina_id`) REFERENCES `oficinas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_trocas_data` (`data_troca`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 10. TABELA: servicos
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `servicos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `descricao` TEXT NULL,
  `categoria` VARCHAR(100) NULL,
  `preco_padrao` DECIMAL(10, 2) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_servicos_nome` (`nome`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 11. TABELA: registros_servico
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `registros_servico` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `veiculo_id` INT NOT NULL,
  `servico_id` INT NOT NULL,
  `oficina_id` INT NULL,
  `nome_oficina_manual` VARCHAR(255) NULL,
  `km_no_servico` INT NOT NULL,
  `data_servico` DATE NOT NULL,
  `km_previsto_proximo` INT NULL,
  `data_prevista_proximo` DATE NULL,
  `executado_por` VARCHAR(255) NOT NULL,
  `observacoes` TEXT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_regservicos_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_regservicos_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_regservicos_oficina` FOREIGN KEY (`oficina_id`) REFERENCES `oficinas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_regservicos_data` (`data_servico`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 12. TABELA: agendamentos
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `agendamentos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cliente_id` INT NOT NULL,
  `veiculo_id` INT NOT NULL,
  `servico_id` INT NULL,
  `data_agendada` DATE NOT NULL,
  `horario_agendado` VARCHAR(5) NOT NULL, -- Formato 'HH:MM' (início)
  `duracao_minutos` INT NOT NULL DEFAULT 60, -- Duração flexível do agendamento (30, 60, 90, 120, etc.)
  `horario_fim` VARCHAR(5) NULL, -- Formato 'HH:MM' (término calculado)
  `status` ENUM('agendado', 'concluido', 'cancelado') NOT NULL DEFAULT 'agendado',
  `confirmacao_presenca` ENUM('pendente', 'solicitada', 'confirmada') NOT NULL DEFAULT 'pendente', -- Status de presença
  `confirmacao_solicitada_em` DATETIME NULL, -- Momento do envio da mensagem de WhatsApp
  `confirmacao_adiada_ate` DATETIME NULL, -- Quando o lembrete foi adiado em 60 min
  `confirmado_em` DATETIME NULL, -- Momento em que a presença foi confirmada/dado baixa
  `motivo_revisao` TEXT NOT NULL,
  `observacoes` TEXT NULL,
  `motivo_cancelamento` TEXT NULL, -- Motivo obrigatório caso o agendamento seja cancelado
  `criado_por` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_agendamentos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_criador` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_agendamentos_data_hora` (`data_agendada`, `horario_agendado`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 13. TABELA: logs_lgpd
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `logs_lgpd` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cliente_id` INT NOT NULL,
  `consentimento_dado` TINYINT(1) NOT NULL DEFAULT 1,
  `ip_origem` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_logs_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 14. TABELA: notificacoes
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notificacoes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tipo` ENUM('solicitacao_cliente', 'alerta_troca', 'lembrete_agendamento') NOT NULL,
  `mensagem` TEXT NOT NULL,
  `lida` TINYINT(1) NOT NULL DEFAULT 0,
  `usuario_id` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notificacoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_notificacoes_usuario_lida` (`usuario_id`, `lida`)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 15. TABELA: sessoes (Persistência de Sessões no MySQL)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessoes` (
  `sid` VARCHAR(128) NOT NULL PRIMARY KEY,
  `dados` MEDIUMTEXT NOT NULL,
  `expira_em` DATETIME NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 16. TABELA: logs_auditoria (Rastreabilidade e Trilha de Auditoria)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `logs_auditoria` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NULL,
  `usuario_nome` VARCHAR(255) NULL,
  `usuario_email` VARCHAR(255) NULL,
  `usuario_papel` VARCHAR(50) NULL,
  `acao` VARCHAR(50) NOT NULL,
  `recurso` VARCHAR(100) NOT NULL,
  `registro_id` VARCHAR(100) NULL,
  `descricao` TEXT NOT NULL,
  `dados_anteriores` JSON NULL,
  `dados_novos` JSON NULL,
  `ip` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_auditoria_criado_em` (`criado_em`),
  INDEX `idx_auditoria_usuario` (`usuario_id`),
  INDEX `idx_auditoria_acao` (`acao`),
  INDEX `idx_auditoria_recurso` (`recurso`)
) ENGINE=InnoDB;



-- ========================================================
-- DADOS INICIAIS ESSENCIAIS PARA PRODUÇÃO (SEEDS MESTRE)
-- ========================================================

-- 0. Níveis de Acesso
INSERT INTO `niveis_acesso` (`id`, `nome`, `titulo`, `descricao`, `nivel_hierarquia`) VALUES
(1, 'admin', 'Administrador', 'Acesso irrestrito a todas as funcionalidades do sistema, relatórios gerenciais e módulo de auditoria.', 1),
(2, 'gerente', 'Gerente', 'Gerenciamento operacional completo, clientes, veículos, revisões e relatórios analíticos.', 2),
(3, 'atendente', 'Atendente', 'Cadastro de clientes, veículos, gestão da agenda de revisões e confirmação de presença.', 3),
(4, 'mecanico', 'Mecânico', 'Execução e registro técnico de trocas de peças, serviços avulsos e histórico de veículos.', 4),
(5, 'cliente', 'Cliente', 'Acesso exclusivo de visualização aos próprios veículos, agendamentos e histórico.', 5)
ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`), `descricao` = VALUES(`descricao`), `nivel_hierarquia` = VALUES(`nivel_hierarquia`);

-- 1. Usuário Administrador Inicial do Sistema
-- Senha inicial: admin123 (DEVE ser alterada imediatamente no primeiro login de produção)
INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha_hash`, `papel`, `nivel_acesso_id`, `telefone`) VALUES
(1, 'Administrador do Sistema', 'admin@revsys.com', '$2b$10$5cXzyFEcfdaBHyT/LoDnnOv9yowPKgdTm.btlpiEZ0KLmo/tIrY2G', 'admin', 1, '11999999991')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- Evento inicial de auditoria
INSERT INTO `logs_auditoria` (`usuario_id`, `usuario_nome`, `usuario_email`, `usuario_papel`, `acao`, `recurso`, `descricao`, `ip`, `user_agent`)
VALUES (1, 'Administrador do Sistema', 'admin@revsys.com', 'admin', 'CRIAR', 'Autenticação', 'Módulo de auditoria e rastreabilidade inicializado no sistema RevSys.', '127.0.0.1', 'Migração de Produção');

-- 2. Marcas de Veículo Oficiais
INSERT INTO `marcas_veiculo` (`id`, `nome`) VALUES
(1, 'Alfa Romeo'),
(2, 'Audi'),
(3, 'BMW'),
(4, 'BYD'),
(5, 'Caoa Chery'),
(6, 'Chevrolet'),
(7, 'Citroën'),
(8, 'Fiat'),
(9, 'Ford'),
(10, 'GWM'),
(11, 'Honda'),
(12, 'Hyundai'),
(13, 'JAC'),
(14, 'Jeep'),
(15, 'Kia'),
(16, 'Land Rover'),
(17, 'Mercedes-Benz'),
(18, 'Mitsubishi'),
(19, 'Nissan'),
(20, 'Peugeot'),
(21, 'RAM'),
(22, 'Renault'),
(23, 'Suzuki'),
(24, 'Toyota'),
(25, 'Troller'),
(26, 'Volkswagen'),
(27, 'Volvo')
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

-- 3. Modelos de Veículo Oficiais
INSERT INTO `modelos_veiculo` (`id`, `nome`, `marca_veiculo_id`) VALUES
(1, '147', 1), (2, '156', 1), (3, 'Giulia', 1), (4, 'Stelvio', 1),
(5, 'A3', 2), (6, 'A4', 2), (7, 'A5', 2), (8, 'Q3', 2), (9, 'Q5', 2), (10, 'Q7', 2), (11, 'e-tron', 2),
(12, '320i', 3), (13, 'Série 1', 3), (14, 'Série 3', 3), (15, 'Série 5', 3), (16, 'X1', 3), (17, 'X3', 3), (18, 'X5', 3), (19, 'Z4', 3),
(20, 'Dolphin', 4), (21, 'Dolphin Mini', 4), (22, 'Han', 4), (23, 'King', 4), (24, 'Song Plus', 4), (25, 'Tang', 4), (26, 'Yuan Plus', 4),
(27, 'Arrizo 6', 5), (28, 'Tiggo 2', 5), (29, 'Tiggo 5X', 5), (30, 'Tiggo 7', 5), (31, 'Tiggo 8', 5),
(32, 'Agile', 6), (33, 'Astra', 6), (34, 'Blazer', 6), (35, 'Celta', 6), (36, 'Cobalt', 6), (37, 'Corsa', 6), (38, 'Cruze', 6), (39, 'Equinox', 6), (40, 'Meriva', 6), (41, 'Montana', 6), (42, 'Onix', 6), (43, 'Onix Plus', 6), (44, 'Prisma', 6), (45, 'S10', 6), (46, 'Spin', 6), (47, 'Tracker', 6), (48, 'Trailblazer', 6), (49, 'Vectra', 6), (50, 'Zafira', 6),
(51, 'Aircross', 7), (52, 'C3', 7), (53, 'C4 Cactus', 7), (54, 'C4 Lounge', 7), (55, 'Jumpy', 7),
(56, 'Argo', 8), (57, 'Cronos', 8), (58, 'Doblò', 8), (59, 'Fastback', 8), (60, 'Fiorino', 8), (61, 'Freemont', 8), (62, 'Idea', 8), (63, 'Linea', 8), (64, 'Mobi', 8), (65, 'Palio', 8), (66, 'Pulse', 8), (67, 'Siena', 8), (68, 'Stilo', 8), (69, 'Strada', 8), (70, 'Toro', 8), (71, 'Uno', 8),
(72, 'EcoSport', 9), (73, 'Edge', 9), (74, 'F-250', 9), (75, 'Fiesta', 9), (76, 'Focus', 9), (77, 'Fusion', 9), (78, 'Ka', 9), (79, 'Maverick', 9), (80, 'Mustang', 9), (81, 'Ranger', 9), (82, 'Territory', 9),
(83, 'Haval H6', 10), (84, 'Ora 03', 10),
(85, 'City', 11), (86, 'Civic', 11), (87, 'CR-V', 11), (88, 'Fit', 11), (89, 'HR-V', 11), (90, 'WR-V', 11), (91, 'ZR-V', 11),
(92, 'Creta', 12), (93, 'HB20', 12), (94, 'HB20S', 12), (95, 'i30', 12), (96, 'ix35', 12), (97, 'Santa Fe', 12), (98, 'Tucson', 12), (99, 'Veloster', 12),
(100, 'J3', 13), (101, 'JS1', 13), (102, 'JS4', 13), (103, 'T60', 13),
(104, 'Commander', 14), (105, 'Compass', 14), (106, 'Renegade', 14), (107, 'Wrangler', 14),
(108, 'Cerato', 15), (109, 'Picanto', 15), (110, 'Sportage', 15), (111, 'Stonic', 15),
(112, 'Defender', 16), (113, 'Discovery', 16), (114, 'Discovery Sport', 16), (115, 'Range Rover Evoque', 16), (116, 'Range Rover Velar', 16),
(117, 'Classe A', 17), (118, 'Classe C', 17), (119, 'Classe E', 17), (120, 'GLA', 17), (121, 'GLC', 17), (122, 'GLE', 17),
(123, 'ASX', 18), (124, 'Eclipse Cross', 18), (125, 'L200 Triton', 18), (126, 'Outlander', 18), (127, 'Pajero TR4', 18),
(128, 'Frontier', 19), (129, 'Kicks', 19), (130, 'Livina', 19), (131, 'March', 19), (132, 'Sentra', 19), (133, 'Versa', 19),
(134, '2008', 20), (135, '206', 20), (136, '207', 20), (137, '208', 20), (138, '3008', 20), (139, '308', 20), (140, 'Partner', 20),
(141, '1500', 21), (142, '2500', 21), (143, 'Rampage', 21),
(144, 'Duster', 22), (145, 'Kwid', 22), (146, 'Logan', 22), (147, 'Master', 22), (148, 'Oroch', 22), (149, 'Sandero', 22), (150, 'Stepway', 22),
(151, 'Grand Vitara', 23), (152, 'Jimny', 23), (153, 'Vitara', 23),
(154, 'Camry', 24), (155, 'Corolla', 24), (156, 'Corolla Cross', 24), (157, 'Etios', 24), (158, 'Hilux', 24), (159, 'RAV4', 24), (160, 'Yaris', 24),
(161, 'T4', 25),
(162, 'Amarok', 26), (163, 'Bora', 26), (164, 'Fox', 26), (165, 'Gol', 26), (166, 'Golf', 26), (167, 'Jetta', 26), (168, 'Nivus', 26), (169, 'Parati', 26), (170, 'Polo', 26), (171, 'Saveiro', 26), (172, 'T-Cross', 26), (173, 'Taos', 26), (174, 'Tiguan', 26), (175, 'Up!', 26), (176, 'Voyage', 26),
(177, 'C40', 27), (178, 'EX30', 27), (179, 'S60', 27), (180, 'XC40', 27), (181, 'XC60', 27), (182, 'XC90', 27)
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

-- 4. Marcas de Peça Oficiais
INSERT INTO `marcas_peca` (`id`, `nome`) VALUES
(1, 'Bosch'), (2, 'Castrol'), (3, 'Cobreq'), (4, 'Cofap'), (5, 'Continental / Contitech'),
(6, 'Delphi'), (7, 'Denso'), (8, 'Fram'), (9, 'Fras-le'), (10, 'Havoline'),
(11, 'Ina'), (12, 'Lubrax'), (13, 'Magneti Marelli'), (14, 'Mahle / Metal Leve'),
(15, 'Mann-Filter'), (16, 'Michelin'), (17, 'Mobil'), (18, 'Monroe'), (19, 'NGK'),
(20, 'Nakata'), (21, 'Pirelli'), (22, 'Sabó'), (23, 'Shell (Helix)'), (24, 'SKF'),
(25, 'TRW'), (26, 'Valeo'), (27, 'Wega')
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

-- 5. Catálogo de Peças Padrão
INSERT INTO `pecas` (`id`, `nome`, `marca_peca_id`) VALUES
(1, 'Bateria 60Ah High Performance', 1), (2, 'Bobina de Ignição', 1), (3, 'Bomba de Combustível Elétrica', 1),
(4, 'Disco de Freio Ventilado', 1), (5, 'Jogo de Velas de Ignição Iridium', 1), (6, 'Lâmpada H7 Super White', 1),
(7, 'Módulo de Injeção Eletrônica', 1), (8, 'Palheta do Limpador de Pára-brisa', 1), (9, 'Pastilha de Freio Dianteira', 1),
(10, 'Sensor de Oxigênio (Sonda Lambda)', 1), (11, 'Fluido de Freio DOT 4', 2), (12, 'Óleo de Motor 10W40 Semissintético Magnatec', 2),
(13, 'Óleo de Motor 5W30 Sintético GTX', 2), (14, 'Lona de Freio Traseira', 3), (15, 'Pastilha de Freio Dianteira Cerâmica', 3),
(16, 'Sapatas de Freio', 3), (17, 'Amortecedor Dianteiro Turbogás', 4), (18, 'Amortecedor Traseiro Turbogás', 4),
(19, 'Kit Batente e Coifa do Amortecedor', 4), (20, 'Mola Helicoidal Dianteira', 4), (21, 'Correia Dentada do Comando', 5),
(22, 'Correia Poliv / Multi-V (Acessórios)', 5), (23, 'Kit de Correia Dentada com Tensor', 5), (24, 'Bico Injetor de Combustível', 6),
(25, 'Bomba de Água', 6), (26, 'Coletor de Admissão', 6), (27, 'Radiador de Arrefecimento', 6), (28, 'Compressor do Ar Condicionado', 7),
(29, 'Radiador do Ar Condicionado', 7), (30, 'Sensor MAP / MAF', 7), (31, 'Filtro de Ar Condicionado / Cabine', 8),
(32, 'Filtro de Ar do Motor', 8), (33, 'Filtro de Combustível Flex', 8), (34, 'Filtro de Óleo Lubrificante', 8),
(35, 'Disco de Freio Sólido', 9), (36, 'Pastilha de Freio Traseira', 9), (37, 'Aditivo para Radiador Orgânico Concentrado', 10),
(38, 'Óleo de Transmissão Automática ATF', 10), (39, 'Polia Guia da Correia', 11), (40, 'Tensor da Correia Dentada', 11),
(41, 'Óleo de Motor 15W40 Mineral Essential', 12), (42, 'Óleo de Motor 5W40 Sintético Valora', 12), (43, 'Alternador 90A', 13),
(44, 'Body Computer / BCM', 13), (45, 'Corpo de Borboleta (TBI)', 13), (46, 'Farol Dianteiro Principal', 13),
(47, 'Lanterna Traseira', 13), (48, 'Bronzina de Biela e Mancal', 14), (49, 'Jogo de Anéis de Pistão', 14),
(50, 'Jogo de Pistões do Motor', 14), (51, 'Válvula Termostática', 14), (52, 'Filtro de Ar da Cabine Antibacteriano', 15),
(53, 'Filtro de Ar do Motor Performance', 15), (54, 'Filtro de Combustível Diesel', 15), (55, 'Filtro de Óleo Blindado', 15),
(56, 'Pneu 185/65 R15 Energy Saver', 16), (57, 'Pneu 205/55 R16 Primacy 4', 16), (58, 'Pneu 225/45 R17 Pilot Sport 4', 16),
(59, 'Óleo de Motor 0W20 Sintético Super 3000', 17), (60, 'Óleo de Motor 5W30 Sintético 1 ESP', 17), (61, 'Amortecedor Dianteiro OESpectrum', 18),
(62, 'Amortecedor Traseiro Monro-Matic', 18), (63, 'Cabo de Vela de Ignição', 19), (64, 'Vela de Ignição G-Power Platinum', 19),
(65, 'Vela de Ignição Standard Nickel', 19), (66, 'Barra Axial de Direção', 20), (67, 'Bieleta da Barra Estabilizadora', 20),
(68, 'Pivô de Suspensão Dianteiro', 20), (69, 'Terminal de Direção', 20), (70, 'Pneu 175/70 R14 Cinturato P1', 21),
(71, 'Pneu 205/60 R16 Cinturato P7', 21), (72, 'Pneu 215/65 R16 Scorpion All Terrain', 21), (73, 'Junta do Cabeçote de Aço', 22),
(74, 'Kit de Juntas do Motor', 22), (75, 'Retentor do Virabrequim', 22), (76, 'Óleo de Motor 5W30 Sintético HX8', 23),
(77, 'Óleo de Motor 5W40 Sintético Ultra', 23), (78, 'Homocinética Externa', 24), (79, 'Kit de Embreagem (Platô e Disco)', 24),
(80, 'Rolamento de Roda Dianteiro', 24), (81, 'Rolamento do Alternador', 24), (82, 'Caixa de Direção Hidráulica', 25),
(83, 'Cilindro Mestre de Freio', 25), (84, 'Servofreio (Hidrovácuo)', 25), (85, 'Embreagem Monomassa com Atuador', 26),
(86, 'Motor de Partida / Arranque', 26), (87, 'Ventoinha do Radiador', 26), (88, 'Filtro de Ar Esportivo High Flow', 27),
(89, 'Filtro de Óleo de Câmbio Automático', 27)
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

-- 6. Cadastro Base da Oficina Matriz
INSERT INTO `oficinas` (`id`, `nome`, `cnpj`, `telefone`, `endereco`, `email`, `whatsapp_numero`) VALUES
(1, 'RevSys Oficina Matriz', '12345678000199', '1133334444', 'Av. Principal, 1000 - Centro, São Paulo - SP', 'matriz@revsys.com', '11999998888')
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

-- 7. Catálogo de Serviços Padrão da Oficina
INSERT INTO `servicos` (`id`, `nome`, `descricao`, `categoria`, `preco_padrao`) VALUES
(1, 'Alinhamento 3D de Geometria da Suspensão', 'Ajuste de convergência e divergência das rodas dianteiras/traseiras.', 'Geometria e Alinhamento', 120.00),
(2, 'Análise de Emissões de Gases de Escapamento', 'Medição e verificação dos níveis de emissões conforme normas Conama.', 'Diagnóstico Eletrônico', 90.00),
(3, 'Balanceamento de Rodas Dianteiras e Traseiras', 'Eliminação de vibrações nas rodas e volante em altas velocidades.', 'Rodas e Pneus', 80.00),
(4, 'Cambagem e Caster Dianteiro', 'Ajuste da inclinação vertical e ângulo do pino mestre das rodas.', 'Geometria e Alinhamento', 150.00),
(5, 'Descarbonização de Válvulas e Coletor de Admissão', 'Remoção química e mecânica de resíduos de carbono no motor.', 'Motor e Injeção', 450.00),
(6, 'Diagnóstico Computadorizado via Scanner OBD2', 'Leitura de códigos de falha de injeção, ABS, airbag e transmissão.', 'Diagnóstico Eletrônico', 120.00),
(7, 'Higienização e Ozonização do Ar Condicionado', 'Combate a fungos, bactérias e maus odores na caixa evaporadora.', 'Climatização', 130.00),
(8, 'Inspeção Geral Preventiva de Segurança (Checklist)', 'Verificação visual e teste funcional de 50 itens de segurança.', 'Revisão Preventiva', 100.00),
(9, 'Limpeza e Teste de Equalização dos Bicos Injetores', 'Limpeza ultrassônica e teste de estanqueidade e leque dos injetores.', 'Motor e Injeção', 180.00),
(10, 'Recarga de Gás Refrigerante do Ar Condicionado', 'Vácuo no sistema, teste de vazamentos e recarga com R134a/PAG.', 'Climatização', 220.00),
(11, 'Regulação de Faróis e Iluminação Automotiva', 'Ajuste de foco e altura dos fachos de luz principal e de milha.', 'Elétrica', 60.00),
(12, 'Sangria e Troca do Fluido de Embreagem Hidráulica', 'Substituição completa e purga do sistema de embreagem.', 'Transmissão', 110.00),
(13, 'Sangria e Troca do Fluido de Freio DOT4', 'Limpeza do reservatório, troca de fluido e purga das rodas.', 'Freios', 140.00),
(14, 'Troca e Limpeza do Sistema de Arrefecimento', 'Enxágue do radiador, aplicação de aditivo concentrado e água desmineralizada.', 'Arrefecimento', 160.00),
(15, 'Verificação e Ajuste de Folga de Válvulas', 'Ajuste mecânico de tuchos e folga de válvulas de admissão/escape.', 'Motor e Injeção', 250.00)
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);
```

---

## 3. Checklist Pré-Deploy e Pós-Deploy em Produção

1. **Variáveis de Ambiente**:
   - Assegurar que o arquivo `.env` do servidor de produção possui:
     - `NODE_ENV=production`
     - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` apontando para a instância MySQL de produção.
     - `AES_KEY` com chave criptográfica de 32 caracteres gerada exclusivamente para produção.
     - `SESSION_SECRET` com valor forte e aleatório.
2. **Execução do Script**:
   - Rodar o bloco SQL acima.
3. **Primeiro Acesso**:
   - Efetuar login com `admin@revsys.com` / `admin123` e alterar a senha imediatamente na tela de perfil/usuários.
4. **Verificação de Permissões**:
   - Garantir que o usuário MySQL da aplicação tenha privilégios de `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, `INDEX`, `ALTER` na base `revsys`.

---

## 4. Script de Migração Incremental (Para Bancos já em Produção)

Caso o banco de dados de produção já esteja em operação com dados reais e você precise apenas aplicar o **Módulo de Auditoria**, a **Classificação de Níveis de Acesso** e o **Controle de Status e Inativação de Clientes e Veículos (RF-44)** sem perda de dados:

```sql
USE `revsys`;

-- 1. Criar tabela niveis_acesso
CREATE TABLE IF NOT EXISTS `niveis_acesso` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` ENUM('admin', 'gerente', 'atendente', 'mecanico', 'cliente') NOT NULL UNIQUE,
  `titulo` VARCHAR(100) NOT NULL,
  `descricao` TEXT NULL,
  `nivel_hierarquia` INT NOT NULL DEFAULT 5,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Popular niveis_acesso
INSERT INTO `niveis_acesso` (`id`, `nome`, `titulo`, `descricao`, `nivel_hierarquia`) VALUES
(1, 'admin', 'Administrador', 'Acesso irrestrito a todas as funcionalidades do sistema, relatórios gerenciais e módulo de auditoria.', 1),
(2, 'gerente', 'Gerente', 'Gerenciamento operacional completo, clientes, veículos, revisões e relatórios analíticos.', 2),
(3, 'atendente', 'Atendente', 'Cadastro de clientes, veículos, gestão da agenda de revisões e confirmação de presença.', 3),
(4, 'mecanico', 'Mecânico', 'Execução e registro técnico de trocas de peças, serviços avulsos e histórico de veículos.', 4),
(5, 'cliente', 'Cliente', 'Acesso exclusivo de visualização aos próprios veículos, agendamentos e histórico.', 5)
ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`), `descricao` = VALUES(`descricao`), `nivel_hierarquia` = VALUES(`nivel_hierarquia`);

-- 3. Adicionar coluna nivel_acesso_id em usuarios
ALTER TABLE `usuarios` 
ADD COLUMN IF NOT EXISTS `nivel_acesso_id` INT NULL AFTER `papel`,
ADD CONSTRAINT `fk_usuarios_nivel_acesso` FOREIGN KEY (`nivel_acesso_id`) REFERENCES `niveis_acesso` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Associar usuários existentes ao seu respectivo nível
UPDATE `usuarios` u
JOIN `niveis_acesso` na ON na.nome = u.papel
SET u.nivel_acesso_id = na.id
WHERE u.nivel_acesso_id IS NULL;

-- 5. Criar tabela logs_auditoria
CREATE TABLE IF NOT EXISTS `logs_auditoria` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NULL,
  `usuario_nome` VARCHAR(255) NULL,
  `usuario_email` VARCHAR(255) NULL,
  `usuario_papel` VARCHAR(50) NULL,
  `acao` VARCHAR(50) NOT NULL,
  `recurso` VARCHAR(100) NOT NULL,
  `registro_id` VARCHAR(100) NULL,
  `descricao` TEXT NOT NULL,
  `dados_anteriores` JSON NULL,
  `dados_novos` JSON NULL,
  `ip` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_auditoria_criado_em` (`criado_em`),
  INDEX `idx_auditoria_usuario` (`usuario_id`),
  INDEX `idx_auditoria_acao` (`acao`),
  INDEX `idx_auditoria_recurso` (`recurso`)
) ENGINE=InnoDB;

-- 6. Log inicial de ativação
INSERT INTO `logs_auditoria` (`usuario_id`, `usuario_nome`, `usuario_email`, `usuario_papel`, `acao`, `recurso`, `descricao`, `ip`, `user_agent`)
VALUES (1, 'Administrador do Sistema', 'admin@revsys.com', 'admin', 'CRIAR', 'Autenticação', 'Módulo de auditoria e rastreabilidade inicializado no sistema RevSys.', '127.0.0.1', 'Migração de Produção');

-- 7. Adicionar colunas de inativação e controle de status em clientes
ALTER TABLE `clientes`
ADD COLUMN IF NOT EXISTS `ativo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `data_consentimento_lgpd`,
ADD COLUMN IF NOT EXISTS `motivo_inativacao` TEXT NULL AFTER `ativo`,
ADD COLUMN IF NOT EXISTS `inativado_em` DATETIME NULL AFTER `motivo_inativacao`;

-- 8. Adicionar colunas de inativação e controle de status em veiculos
ALTER TABLE `veiculos`
ADD COLUMN IF NOT EXISTS `ativo` TINYINT(1) NOT NULL DEFAULT 1 AFTER `condicao`,
ADD COLUMN IF NOT EXISTS `motivo_inativacao` TEXT NULL AFTER `ativo`,
ADD COLUMN IF NOT EXISTS `inativado_em` DATETIME NULL AFTER `motivo_inativacao`;
```
