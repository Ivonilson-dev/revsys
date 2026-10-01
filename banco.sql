-- Script de Criação do Banco de Dados e Tabelas - RevSys
-- Compatível com MySQL 8.0+ e phpMyAdmin (InnoDB)

CREATE DATABASE IF NOT EXISTS `revsys` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `revsys`;

-- 0. Tabela niveis_acesso (Classificação Formal de Níveis de Acesso)
CREATE TABLE IF NOT EXISTS `niveis_acesso` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` ENUM('admin', 'gerente', 'atendente', 'mecanico', 'cliente') NOT NULL UNIQUE,
  `titulo` VARCHAR(100) NOT NULL,
  `descricao` TEXT NULL,
  `nivel_hierarquia` INT NOT NULL DEFAULT 5,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1. Tabela usuarios
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
  CONSTRAINT `fk_usuarios_nivel_acesso` FOREIGN KEY (`nivel_acesso_id`) REFERENCES `niveis_acesso` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 2. Tabela clientes
CREATE TABLE IF NOT EXISTS `clientes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `cpf` TEXT NOT NULL, -- Dados sensíveis criptografados em repouso (AES-256)
  `cpf_hash` VARCHAR(64) NOT NULL UNIQUE, -- Blind Index para busca exata e restrição UNIQUE
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
  CONSTRAINT `fk_clientes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. Tabela marcas_veiculo
CREATE TABLE IF NOT EXISTS `marcas_veiculo` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL UNIQUE,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Tabela modelos_veiculo
CREATE TABLE IF NOT EXISTS `modelos_veiculo` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL,
  `marca_veiculo_id` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_modelos_marca` FOREIGN KEY (`marca_veiculo_id`) REFERENCES `marcas_veiculo` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 5. Tabela veiculos
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
  CONSTRAINT `fk_veiculos_modelo` FOREIGN KEY (`modelo_id`) REFERENCES `modelos_veiculo` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_veiculos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_veiculos_placa` (`placa`)
) ENGINE=InnoDB;

-- 6. Tabela marcas_peca
CREATE TABLE IF NOT EXISTS `marcas_peca` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL UNIQUE,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Tabela pecas
CREATE TABLE IF NOT EXISTS `pecas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `marca_peca_id` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pecas_marca` FOREIGN KEY (`marca_peca_id`) REFERENCES `marcas_peca` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_pecas_nome` (`nome`)
) ENGINE=InnoDB;

-- 8. Tabela oficinas
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

-- 9. Tabela registros_troca
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
  CONSTRAINT `fk_trocas_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_trocas_peca` FOREIGN KEY (`peca_id`) REFERENCES `pecas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_trocas_oficina` FOREIGN KEY (`oficina_id`) REFERENCES `oficinas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 10. Tabela servicos
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

-- 11. Tabela registros_servico
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
  CONSTRAINT `fk_regservicos_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_regservicos_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_regservicos_oficina` FOREIGN KEY (`oficina_id`) REFERENCES `oficinas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 12. Tabela agendamentos
CREATE TABLE IF NOT EXISTS `agendamentos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cliente_id` INT NOT NULL,
  `veiculo_id` INT NOT NULL,
  `servico_id` INT NULL,
  `data_agendada` DATE NOT NULL,
  `horario_agendado` VARCHAR(5) NOT NULL, -- Formato 'HH:MM' (início)
  `duracao_minutos` INT NOT NULL DEFAULT 60, -- Duração flexível do bloco em minutos (ex: 30, 60, 90, 120, etc.)
  `horario_fim` VARCHAR(5) NULL, -- Formato 'HH:MM' (término)
  `status` ENUM('agendado', 'concluido', 'cancelado') NOT NULL DEFAULT 'agendado',
  `confirmacao_presenca` ENUM('pendente', 'solicitada', 'confirmada') NOT NULL DEFAULT 'pendente',
  `confirmacao_solicitada_em` DATETIME NULL,
  `confirmacao_adiada_ate` DATETIME NULL,
  `confirmado_em` DATETIME NULL,
  `motivo_revisao` TEXT NOT NULL,
  `observacoes` TEXT NULL,
  `motivo_cancelamento` TEXT NULL,
  `criado_por` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_agendamentos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_servico` FOREIGN KEY (`servico_id`) REFERENCES `servicos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_criador` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 13. Tabela logs_lgpd
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

-- 14. Tabela notificacoes
CREATE TABLE IF NOT EXISTS `notificacoes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tipo` ENUM('solicitacao_cliente', 'alerta_troca', 'lembrete_agendamento') NOT NULL,
  `mensagem` TEXT NOT NULL,
  `lida` TINYINT(1) NOT NULL DEFAULT 0,
  `usuario_id` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notificacoes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 15. Tabela sessoes (Persistência de Sessões de Usuários)
CREATE TABLE IF NOT EXISTS `sessoes` (
  `sid` VARCHAR(128) NOT NULL PRIMARY KEY,
  `dados` MEDIUMTEXT NOT NULL,
  `expira_em` DATETIME NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 16. Tabela logs_auditoria (Rastreabilidade e Trilha de Auditoria)
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


-- ==========================================
-- DADOS INICIAIS DE TESTE (CADASTRADOS VIA SQL)
-- ==========================================

-- Níveis de Acesso
INSERT INTO `niveis_acesso` (`id`, `nome`, `titulo`, `descricao`, `nivel_hierarquia`) VALUES
(1, 'admin', 'Administrador', 'Acesso irrestrito a todas as funcionalidades do sistema, relatórios gerenciais e módulo de auditoria.', 1),
(2, 'gerente', 'Gerente', 'Gerenciamento operacional completo, clientes, veículos, revisões e relatórios analíticos.', 2),
(3, 'atendente', 'Atendente', 'Cadastro de clientes, veículos, gestão da agenda de revisões e confirmação de presença.', 3),
(4, 'mecanico', 'Mecânico', 'Execução e registro técnico de trocas de peças, serviços avulsos e histórico de veículos.', 4),
(5, 'cliente', 'Cliente', 'Acesso exclusivo de visualização aos próprios veículos, agendamentos e histórico.', 5)
ON DUPLICATE KEY UPDATE `titulo` = VALUES(`titulo`), `descricao` = VALUES(`descricao`), `nivel_hierarquia` = VALUES(`nivel_hierarquia`);

-- Usuários internos (Oficina)
-- Senhas: admin123, gerente123, atendente123, mecanico123
INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha_hash`, `papel`, `nivel_acesso_id`, `telefone`) VALUES
(1, 'Administrador', 'admin@revsys.com', '$2b$10$5cXzyFEcfdaBHyT/LoDnnOv9yowPKgdTm.btlpiEZ0KLmo/tIrY2G', 'admin', 1, '11999999991'),
(2, 'Gerente Oficina', 'gerente@revsys.com', '$2b$10$YOzlK1L6S86Kwtybdhccp.bp5f.nHZtf5QII5/i7u.D5ORXQDgKne', 'gerente', 2, '11999999992'),
(3, 'Atendente Oficina', 'atendente@revsys.com', '$2b$10$WSImnNDrtlWrHHZVcpl5Eu6Qeue.lBI17nCGXY0KLcP7yoUP8yhQa', 'atendente', 3, '11999999993'),
(4, 'Mecânico Oficina', 'mecanico@revsys.com', '$2b$10$nssE1Sk2FZ./7qYMfMwI2.fInxiwaLdMO578csERaxbyhVHz.yfQW', 'mecanico', 4, '11999999994');

-- Evento inicial de auditoria
INSERT INTO `logs_auditoria` (`usuario_id`, `usuario_nome`, `usuario_email`, `usuario_papel`, `acao`, `recurso`, `descricao`, `ip`, `user_agent`)
VALUES (1, 'Administrador', 'admin@revsys.com', 'admin', 'CRIAR', 'Autenticação', 'Módulo de auditoria e rastreabilidade inicializado no sistema RevSys.', '127.0.0.1', 'Migração de Sistema');

-- Marcas de Veículo
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
(27, 'Volvo');

-- Modelos de Veículo
INSERT INTO `modelos_veiculo` (`id`, `nome`, `marca_veiculo_id`) VALUES
(1, '147', 1),
(2, '156', 1),
(3, 'Giulia', 1),
(4, 'Stelvio', 1),
(5, 'A3', 2),
(6, 'A4', 2),
(7, 'A5', 2),
(8, 'Q3', 2),
(9, 'Q5', 2),
(10, 'Q7', 2),
(11, 'e-tron', 2),
(12, '320i', 3),
(13, 'Série 1', 3),
(14, 'Série 3', 3),
(15, 'Série 5', 3),
(16, 'X1', 3),
(17, 'X3', 3),
(18, 'X5', 3),
(19, 'Z4', 3),
(20, 'Dolphin', 4),
(21, 'Dolphin Mini', 4),
(22, 'Han', 4),
(23, 'King', 4),
(24, 'Song Plus', 4),
(25, 'Tang', 4),
(26, 'Yuan Plus', 4),
(27, 'Arrizo 6', 5),
(28, 'Tiggo 2', 5),
(29, 'Tiggo 5X', 5),
(30, 'Tiggo 7', 5),
(31, 'Tiggo 8', 5),
(32, 'Agile', 6),
(33, 'Astra', 6),
(34, 'Blazer', 6),
(35, 'Celta', 6),
(36, 'Cobalt', 6),
(37, 'Corsa', 6),
(38, 'Cruze', 6),
(39, 'Equinox', 6),
(40, 'Meriva', 6),
(41, 'Montana', 6),
(42, 'Onix', 6),
(43, 'Onix Plus', 6),
(44, 'Prisma', 6),
(45, 'S10', 6),
(46, 'Spin', 6),
(47, 'Tracker', 6),
(48, 'Trailblazer', 6),
(49, 'Vectra', 6),
(50, 'Zafira', 6),
(51, 'Aircross', 7),
(52, 'C3', 7),
(53, 'C4 Cactus', 7),
(54, 'C4 Lounge', 7),
(55, 'Jumpy', 7),
(56, 'Argo', 8),
(57, 'Cronos', 8),
(58, 'Doblò', 8),
(59, 'Fastback', 8),
(60, 'Fiorino', 8),
(61, 'Freemont', 8),
(62, 'Idea', 8),
(63, 'Linea', 8),
(64, 'Mobi', 8),
(65, 'Palio', 8),
(66, 'Pulse', 8),
(67, 'Siena', 8),
(68, 'Stilo', 8),
(69, 'Strada', 8),
(70, 'Toro', 8),
(71, 'Uno', 8),
(72, 'EcoSport', 9),
(73, 'Edge', 9),
(74, 'F-250', 9),
(75, 'Fiesta', 9),
(76, 'Focus', 9),
(77, 'Fusion', 9),
(78, 'Ka', 9),
(79, 'Maverick', 9),
(80, 'Mustang', 9),
(81, 'Ranger', 9),
(82, 'Territory', 9),
(83, 'Haval H6', 10),
(84, 'Ora 03', 10),
(85, 'City', 11),
(86, 'Civic', 11),
(87, 'CR-V', 11),
(88, 'Fit', 11),
(89, 'HR-V', 11),
(90, 'WR-V', 11),
(91, 'ZR-V', 11),
(92, 'Creta', 12),
(93, 'HB20', 12),
(94, 'HB20S', 12),
(95, 'i30', 12),
(96, 'ix35', 12),
(97, 'Santa Fe', 12),
(98, 'Tucson', 12),
(99, 'Veloster', 12),
(100, 'J3', 13),
(101, 'JS1', 13),
(102, 'JS4', 13),
(103, 'T60', 13),
(104, 'Commander', 14),
(105, 'Compass', 14),
(106, 'Renegade', 14),
(107, 'Wrangler', 14),
(108, 'Cerato', 15),
(109, 'Picanto', 15),
(110, 'Sportage', 15),
(111, 'Stonic', 15),
(112, 'Defender', 16),
(113, 'Discovery', 16),
(114, 'Discovery Sport', 16),
(115, 'Range Rover Evoque', 16),
(116, 'Range Rover Velar', 16),
(117, 'Classe A', 17),
(118, 'Classe C', 17),
(119, 'Classe E', 17),
(120, 'GLA', 17),
(121, 'GLC', 17),
(122, 'GLE', 17),
(123, 'ASX', 18),
(124, 'Eclipse Cross', 18),
(125, 'L200 Triton', 18),
(126, 'Outlander', 18),
(127, 'Pajero TR4', 18),
(128, 'Frontier', 19),
(129, 'Kicks', 19),
(130, 'Livina', 19),
(131, 'March', 19),
(132, 'Sentra', 19),
(133, 'Versa', 19),
(134, '2008', 20),
(135, '206', 20),
(136, '207', 20),
(137, '208', 20),
(138, '3008', 20),
(139, '308', 20),
(140, 'Partner', 20),
(141, '1500', 21),
(142, '2500', 21),
(143, 'Rampage', 21),
(144, 'Duster', 22),
(145, 'Kwid', 22),
(146, 'Logan', 22),
(147, 'Master', 22),
(148, 'Oroch', 22),
(149, 'Sandero', 22),
(150, 'Stepway', 22),
(151, 'Grand Vitara', 23),
(152, 'Jimny', 23),
(153, 'Vitara', 23),
(154, 'Camry', 24),
(155, 'Corolla', 24),
(156, 'Corolla Cross', 24),
(157, 'Etios', 24),
(158, 'Hilux', 24),
(159, 'RAV4', 24),
(160, 'Yaris', 24),
(161, 'T4', 25),
(162, 'Amarok', 26),
(163, 'Bora', 26),
(164, 'Fox', 26),
(165, 'Gol', 26),
(166, 'Golf', 26),
(167, 'Jetta', 26),
(168, 'Nivus', 26),
(169, 'Parati', 26),
(170, 'Polo', 26),
(171, 'Saveiro', 26),
(172, 'T-Cross', 26),
(173, 'Taos', 26),
(174, 'Tiguan', 26),
(175, 'Up!', 26),
(176, 'Voyage', 26),
(177, 'C40', 27),
(178, 'EX30', 27),
(179, 'S60', 27),
(180, 'XC40', 27),
(181, 'XC60', 27),
(182, 'XC90', 27);

-- Marcas de Peça (Em ordem alfabética)
INSERT INTO `marcas_peca` (`id`, `nome`) VALUES
(1, 'Bosch'),
(2, 'Castrol'),
(3, 'Cobreq'),
(4, 'Cofap'),
(5, 'Continental / Contitech'),
(6, 'Delphi'),
(7, 'Denso'),
(8, 'Fram'),
(9, 'Fras-le'),
(10, 'Havoline'),
(11, 'Ina'),
(12, 'Lubrax'),
(13, 'Magneti Marelli'),
(14, 'Mahle / Metal Leve'),
(15, 'Mann-Filter'),
(16, 'Michelin'),
(17, 'Mobil'),
(18, 'Monroe'),
(19, 'NGK'),
(20, 'Nakata'),
(21, 'Pirelli'),
(22, 'Sabó'),
(23, 'Shell (Helix)'),
(24, 'SKF'),
(25, 'TRW'),
(26, 'Valeo'),
(27, 'Wega');


-- Peças (Em ordem alfabética por fabricante)
INSERT INTO `pecas` (`id`, `nome`, `marca_peca_id`) VALUES
(1, 'Bateria 60Ah High Performance', 1),
(2, 'Bobina de Ignição', 1),
(3, 'Bomba de Combustível Elétrica', 1),
(4, 'Disco de Freio Ventilado', 1),
(5, 'Jogo de Velas de Ignição Iridium', 1),
(6, 'Lâmpada H7 Super White', 1),
(7, 'Módulo de Injeção Eletrônica', 1),
(8, 'Palheta do Limpador de Pára-brisa', 1),
(9, 'Pastilha de Freio Dianteira', 1),
(10, 'Sensor de Oxigênio (Sonda Lambda)', 1),
(11, 'Fluido de Freio DOT 4', 2),
(12, 'Óleo de Motor 10W40 Semissintético Magnatec', 2),
(13, 'Óleo de Motor 5W30 Sintético GTX', 2),
(14, 'Lona de Freio Traseira', 3),
(15, 'Pastilha de Freio Dianteira Cerâmica', 3),
(16, 'Sapatas de Freio', 3),
(17, 'Amortecedor Dianteiro Turbogás', 4),
(18, 'Amortecedor Traseiro Turbogás', 4),
(19, 'Kit Batente e Coifa do Amortecedor', 4),
(20, 'Mola Helicoidal Dianteira', 4),
(21, 'Correia Dentada do Comando', 5),
(22, 'Correia Poliv / Multi-V (Acessórios)', 5),
(23, 'Kit de Correia Dentada com Tensor', 5),
(24, 'Bico Injetor de Combustível', 6),
(25, 'Bomba de Água', 6),
(26, 'Coletor de Admissão', 6),
(27, 'Radiador de Arrefecimento', 6),
(28, 'Compressor do Ar Condicionado', 7),
(29, 'Radiador do Ar Condicionado', 7),
(30, 'Sensor MAP / MAF', 7),
(31, 'Filtro de Ar Condicionado / Cabine', 8),
(32, 'Filtro de Ar do Motor', 8),
(33, 'Filtro de Combustível Flex', 8),
(34, 'Filtro de Óleo Lubrificante', 8),
(35, 'Disco de Freio Sólido', 9),
(36, 'Pastilha de Freio Traseira', 9),
(37, 'Aditivo para Radiador Orgânico Concentrado', 10),
(38, 'Óleo de Transmissão Automática ATF', 10),
(39, 'Polia Guia da Correia', 11),
(40, 'Tensor da Correia Dentada', 11),
(41, 'Óleo de Motor 15W40 Mineral Essential', 12),
(42, 'Óleo de Motor 5W40 Sintético Valora', 12),
(43, 'Alternador 90A', 13),
(44, 'Body Computer / BCM', 13),
(45, 'Corpo de Borboleta (TBI)', 13),
(46, 'Farol Dianteiro Principal', 13),
(47, 'Lanterna Traseira', 13),
(48, 'Bronzina de Biela e Mancal', 14),
(49, 'Jogo de Anéis de Pistão', 14),
(50, 'Jogo de Pistões do Motor', 14),
(51, 'Válvula Termostática', 14),
(52, 'Filtro de Ar da Cabine Antibacteriano', 15),
(53, 'Filtro de Ar do Motor Performance', 15),
(54, 'Filtro de Combustível Diesel', 15),
(55, 'Filtro de Óleo Blindado', 15),
(56, 'Pneu 185/65 R15 Energy Saver', 16),
(57, 'Pneu 205/55 R16 Primacy 4', 16),
(58, 'Pneu 225/45 R17 Pilot Sport 4', 16),
(59, 'Óleo de Motor 0W20 Sintético Super 3000', 17),
(60, 'Óleo de Motor 5W30 Sintético 1 ESP', 17),
(61, 'Amortecedor Dianteiro OESpectrum', 18),
(62, 'Amortecedor Traseiro Monro-Matic', 18),
(63, 'Cabo de Vela de Ignição', 19),
(64, 'Vela de Ignição G-Power Platinum', 19),
(65, 'Vela de Ignição Standard Nickel', 19),
(66, 'Barra Axial de Direção', 20),
(67, 'Bieleta da Barra Estabilizadora', 20),
(68, 'Pivô de Suspensão Dianteiro', 20),
(69, 'Terminal de Direção', 20),
(70, 'Pneu 175/70 R14 Cinturato P1', 21),
(71, 'Pneu 205/60 R16 Cinturato P7', 21),
(72, 'Pneu 215/65 R16 Scorpion All Terrain', 21),
(73, 'Junta do Cabeçote de Aço', 22),
(74, 'Kit de Juntas do Motor', 22),
(75, 'Retentor do Virabrequim', 22),
(76, 'Óleo de Motor 5W30 Sintético HX8', 23),
(77, 'Óleo de Motor 5W40 Sintético Ultra', 23),
(78, 'Homocinética Externa', 24),
(79, 'Kit de Embreagem (Platô e Disco)', 24),
(80, 'Rolamento de Roda Dianteiro', 24),
(81, 'Rolamento do Alternador', 24),
(82, 'Caixa de Direção Hidráulica', 25),
(83, 'Cilindro Mestre de Freio', 25),
(84, 'Servofreio (Hidrovácuo)', 25),
(85, 'Embreagem Monomassa com Atuador', 26),
(86, 'Motor de Partida / Arranque', 26),
(87, 'Ventoinha do Radiador', 26),
(88, 'Filtro de Ar Esportivo High Flow', 27),
(89, 'Filtro de Óleo de Câmbio Automático', 27);


-- Oficina padrão
INSERT INTO `oficinas` (`id`, `nome`, `cnpj`, `telefone`, `endereco`, `email`, `whatsapp_numero`) VALUES
(1, 'RevSys Oficina Matriz', '12345678000199', '1133334444', 'Av. Principal, 1000 - Centro, São Paulo - SP', 'matriz@revsys.com', '11999998888');

-- Serviços padrão da oficina
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
(15, 'Verificação e Ajuste de Folga de Válvulas', 'Ajuste mecânico de tuchos e folga de válvulas de admissão/escape.', 'Motor e Injeção', 250.00);

-- ========================================================
-- DADOS DE TESTE COMPLETOS (Clientes, Veículos, Trocas, Serviços, Agendamentos)
-- ========================================================

-- Usuários com perfil Cliente (Senha padrão: cliente123)
INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha_hash`, `papel`, `telefone`) VALUES
(5, 'Carlos Eduardo Silva', 'cliente1@revsys.com', '$2b$10$LtiL15PjBKadEU04s4Hg1e/5IUxVxQ8YuuKPWxCockhhT7vyyUh1C', 'cliente', '11988887777'),
(6, 'Mariana Souza Lima', 'cliente2@revsys.com', '$2b$10$LtiL15PjBKadEU04s4Hg1e/5IUxVxQ8YuuKPWxCockhhT7vyyUh1C', 'cliente', '11977776666'),
(7, 'Roberto Alencar', 'cliente3@revsys.com', '$2b$10$LtiL15PjBKadEU04s4Hg1e/5IUxVxQ8YuuKPWxCockhhT7vyyUh1C', 'cliente', '11966665555')
ON DUPLICATE KEY UPDATE `nome` = VALUES(`nome`);

-- Clientes (com CPF e dados de endereço criptografados via AES-256 e Blind Index SHA256)
-- CPFs originais para busca/login:
-- Cliente 1: 123.456.789-00
-- Cliente 2: 987.654.321-11
-- Cliente 3: 456.789.012-22
INSERT INTO `clientes` (`id`, `usuario_id`, `cpf`, `cpf_hash`, `logradouro`, `numero`, `bairro`, `cidade`, `estado`, `cep`, `telefone_whatsapp`, `consentimento_lgpd`, `data_consentimento_lgpd`) VALUES
(1, 5, 'c5203bf15983af756b41b0f6d2698169:812c6066afd8203018afdfa58f074f58', 'a8476735b37a541a38402a2e7037c79e2d217fe9780e5e34347156ef61eff42b', '1dfda87c2b30c89d487a20da4728a439:4bbc8b3987ef5c75ffdc622cce9750cb', '2bd444ff7e34263afc322a99da4544bc:ddae0a56b67143318cde0de2c0f82f26', '626bcfc9e632b9e8dc2af70f5f64fb52:8ca96410ca7503d1758e880edbf566ac', '19ba4c8c40589d0cd6663312b5f422f0:29103b2836376cbc0430ba5e6f57f8c3', '9fb89c7ea704de25bb6afdaa91c951ae:6403fff077088bdb377cfec4dcd12379', '2eacb667cc494394ee1bb714dde64261:3f353859c16738d332bf58136d1588ed', '24184c3aba4185fcc4fe302c02e0ccd7:5dba9b644a43b348c11f1446dbedc3d0', 1, '2026-01-15 10:00:00'),
(2, 6, '2cb4017399b4a207888b9aa93b01f627:f7c3f123154aacfcf98567596619d483', '4eefed8e11001436c539d30be3caa6bc900f624c6acdeded6e3f98b94bfde3b7', 'ac4d5414dd6ba928b83aaf498ecc4f89:76bcd9dca3dfd063fcfcc6280a65571f', 'd35e41ecd8e1e976a4d1effa886c9c2e:b9b877679d3793be0a1e2741bc74f928', '00db4b2e4e0ba725e5b6bbfd6a33c4ce:49d6ef7cafdf8b661189caa41068c832', '453ecb21deccb1eb1f0e2fc65b59d4d7:8f8ba00d19eda7649b8d9138e3166ef7', 'ce38a90cdbd0193c28cea24b25223334:7327c44fa319d0a93ccaa375541aebae', 'f42df06565751f82a6e7f9836b723ef2:191332cceaf724ecd25cefe33deaf57c', 'f494ef241e1216771544503cd0bb0db4:bdf973c53bebc76380440586e92e642f', 1, '2026-02-01 14:30:00'),
(3, 7, '176583c926c2fe473fec354720546418:f582dc2d53337af9c908f41759229a37', '45278a1717b5d6a4729961c7d0544d2a54ae73c6246f2149d9a7de906fb7f88c', '1a81772b87a374bb202ece64d965b5fe:27071688b5364a044e3ae44f48db69491bc1115a509caa90b491e89100ac29f8', '3efed73ec0c12ccbbba768325f6e20a8:7c6d67c4c8be9d2ace007da935174421', 'ad89ce8769b15f5fceb05663019c3b15:f334405d1145fc215574c7ed0375f495', '385d24aa1abd6d141b107b3407d9a3bc:0158e0a37004912bdf8efc1dcea7c01e', 'd2994181a36057223c9b6192f6c4741e:f8b02d1b4cab7e075d2b43d79fc2f806', 'ca11f4982f2869dd1d124b3e646a7975:5df560f8225abfe7bc81b1b9ac9e6931', 'c9d6ba57e34071028835f86d3ef6bdf0:676422fea2d9dbe3e8b4195467cd6c65', 1, '2026-03-12 09:15:00')
ON DUPLICATE KEY UPDATE `usuario_id` = VALUES(`usuario_id`);

-- Veículos de Teste (Modelos: 155=Toyota Corolla, 42=Chevrolet Onix, 165=VW Gol, 86=Honda Civic, 71=Fiat Uno)
INSERT INTO `veiculos` (`id`, `placa`, `modelo_id`, `cliente_id`, `ano`, `cor`, `km_atual`, `condicao`) VALUES
(1, 'BRA2E19', 155, 1, 2022, 'Prata', 52000, 'usado'),
(2, 'ABC1D23', 42, 1, 2021, 'Preto', 38500, 'usado'),
(3, 'XYZ9K88', 165, 2, 2019, 'Branco', 85000, 'usado'),
(4, 'RVS2026', 86, 3, 2023, 'Cinza', 18200, 'usado'),
(5, 'BWS4512', 71, 1, 2011, 'Prata', 142500, 'usado')
ON DUPLICATE KEY UPDATE `placa` = VALUES(`placa`);

-- Registros de Troca de Peças (Cobrem cenários de Alerta: Vencido, Próximo e Em Dia)
-- Veículo 1 (Corolla - KM atual: 52.000):
-- 1. Óleo GTX (peca_id: 13) - VENCIDO (trocado em 40.000 km, previsto para 50.000 km; atual é 52.000)
-- 2. Filtro de Óleo (peca_id: 34) - VENCIDO (trocado em 40.000 km, previsto para 50.000 km)
-- 3. Pastilha Dianteira (peca_id: 9) - PRÓXIMO (trocado em 22.000 km, previsto para 52.500 km; faltam apenas 500 km)
-- 4. Filtro de Ar do Motor (peca_id: 32) - EM DIA (trocado em 50.000 km, previsto para 60.000 km; faltam 8.000 km)
INSERT INTO `registros_troca` (`id`, `veiculo_id`, `peca_id`, `oficina_id`, `nome_oficina_manual`, `km_na_troca`, `data_troca`, `km_previsto_proximo`, `data_prevista_proximo`, `executado_por`, `observacoes`) VALUES
(1, 1, 13, 1, NULL, 40000, '2025-08-10', 50000, '2026-02-10', 'Mecânico Oficina', 'Substituição completa do óleo 5W30 sintético GTX.'),
(2, 1, 34, 1, NULL, 40000, '2025-08-10', 50000, '2026-02-10', 'Mecânico Oficina', 'Filtro lubrificante substituído junto com o óleo.'),
(3, 1, 9, 1, NULL, 22000, '2025-01-20', 52500, '2026-10-20', 'Mecânico Oficina', 'Pastilhas de freio dianteiras Bosch instaladas.'),
(4, 1, 32, 1, NULL, 50000, '2026-08-05', 60000, '2027-02-05', 'Mecânico Oficina', 'Filtro de ar do motor substituído na revisão periódica.'),
(5, 2, 13, 1, NULL, 30000, '2026-03-10', 40000, '2026-09-10', 'Mecânico Oficina', 'Troca de óleo preventiva.')
ON DUPLICATE KEY UPDATE `veiculo_id` = VALUES(`veiculo_id`);

-- Registros de Serviços
INSERT INTO `registros_servico` (`id`, `veiculo_id`, `servico_id`, `oficina_id`, `nome_oficina_manual`, `km_no_servico`, `data_servico`, `km_previsto_proximo`, `data_prevista_proximo`, `executado_por`, `observacoes`) VALUES
(1, 1, 1, 1, NULL, 50000, '2026-08-05', 60000, '2027-02-05', 'Mecânico Oficina', 'Alinhamento 3D de geometria dianteiro e traseiro.'),
(2, 1, 3, 1, NULL, 50000, '2026-08-05', 60000, '2027-02-05', 'Mecânico Oficina', 'Balanceamento de todas as rodas.'),
(3, 1, 7, 1, NULL, 45000, '2026-04-12', 55000, '2026-10-12', 'Mecânico Oficina', 'Higienização e ozonização da caixa evaporadora do ar condicionado.')
ON DUPLICATE KEY UPDATE `veiculo_id` = VALUES(`veiculo_id`);

-- Agendamentos de Teste
INSERT INTO `agendamentos` (`id`, `cliente_id`, `veiculo_id`, `servico_id`, `data_agendada`, `horario_agendado`, `duracao_minutos`, `horario_fim`, `status`, `motivo_revisao`, `observacoes`, `criado_por`) VALUES
(1, 1, 1, 1, '2026-10-05', '09:00', 60, '10:00', 'agendado', 'Revisão periódica e alinhamento 3D', 'Cliente relatou leve vibração no volante.', 3),
(2, 1, 2, 7, '2026-10-06', '14:00', 60, '15:00', 'agendado', 'Higienização de ar-condicionado', 'Agendamento solicitado via balcão de atendimento.', 3),
(3, 2, 3, 13, '2026-09-15', '10:00', 60, '11:00', 'concluido', 'Sangria de freio e troca de fluido DOT4', 'Serviço executado e testado com sucesso.', 3),
(4, 3, 4, 8, '2026-09-20', '11:00', 60, '12:00', 'cancelado', 'Checklist de segurança preventiva', 'Cliente solicitou cancelamento por incompatibilidade de agenda.', 3)
ON DUPLICATE KEY UPDATE `cliente_id` = VALUES(`cliente_id`);

-- Logs LGPD de Consentimento
INSERT INTO `logs_lgpd` (`id`, `cliente_id`, `consentimento_dado`, `ip_origem`, `user_agent`) VALUES
(1, 1, 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'),
(2, 2, 1, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15'),
(3, 3, 1, '127.0.0.1', 'Mozilla/5.0 (Linux; Android 13; SM-S901B) Mobile Safari/537.36')
ON DUPLICATE KEY UPDATE `cliente_id` = VALUES(`cliente_id`);

-- Notificações de Teste
INSERT INTO `notificacoes` (`id`, `tipo`, `mensagem`, `lida`, `usuario_id`) VALUES
(1, 'alerta_troca', 'O veículo Toyota Corolla (BRA2E19) está com a troca de Óleo 5W30 GTX vencida por quilometragem.', 0, 1),
(2, 'lembrete_agendamento', 'Agendamento de revisão confirmado para o veículo Toyota Corolla (BRA2E19) do cliente Carlos Eduardo Silva no dia 05/10/2026 às 09:00.', 0, 3),
(3, 'solicitacao_cliente', 'O cliente Carlos Eduardo Silva solicitou revisão no Onix (ABC1D23).', 0, 2)
ON DUPLICATE KEY UPDATE `usuario_id` = VALUES(`usuario_id`);

-- ========================================================
-- CREDENCIAIS DE ACESSO PARA TESTES
-- ========================================================
-- Usuários Internos:
--   Administrador: admin@revsys.com    | Senha: admin123
--   Gerente:       gerente@revsys.com  | Senha: gerente123
--   Atendente:     atendente@revsys.com| Senha: atendente123
--   Mecânico:      mecanico@revsys.com | Senha: mecanico123
--
-- Clientes de Teste:
--   Cliente 1:     cliente1@revsys.com | Senha: cliente123 | CPF: 123.456.789-00
--   Cliente 2:     cliente2@revsys.com | Senha: cliente123 | CPF: 987.654.321-11
--   Cliente 3:     cliente3@revsys.com | Senha: cliente123 | CPF: 456.789.012-22

