-- Script de Criação do Banco de Dados e Tabelas - RevSys
-- Compatível com MySQL 8.0+ e phpMyAdmin (InnoDB)

CREATE DATABASE IF NOT EXISTS `revsys` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `revsys`;

-- 1. Tabela usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `senha_hash` VARCHAR(255) NOT NULL,
  `papel` ENUM('admin', 'gerente', 'atendente', 'mecanico', 'cliente') NOT NULL DEFAULT 'cliente',
  `telefone` VARCHAR(20) NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_clientes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  CONSTRAINT `fk_modelos_marca` FOREIGN KEY (`marca_veiculo_id`) REFERENCES `marcas_veiculo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
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
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_veiculos_modelo` FOREIGN KEY (`modelo_id`) REFERENCES `modelos_veiculo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_veiculos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
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
  CONSTRAINT `fk_pecas_marca` FOREIGN KEY (`marca_peca_id`) REFERENCES `marcas_peca` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
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
  CONSTRAINT `fk_trocas_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_trocas_peca` FOREIGN KEY (`peca_id`) REFERENCES `pecas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_trocas_oficina` FOREIGN KEY (`oficina_id`) REFERENCES `oficinas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 10. Tabela agendamentos
CREATE TABLE IF NOT EXISTS `agendamentos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cliente_id` INT NOT NULL,
  `veiculo_id` INT NOT NULL,
  `data_agendada` DATE NOT NULL,
  `horario_agendado` VARCHAR(5) NOT NULL, -- Formato 'HH:MM'
  `status` ENUM('agendado', 'concluido', 'cancelado') NOT NULL DEFAULT 'agendado',
  `motivo_revisao` TEXT NOT NULL,
  `observacoes` TEXT NULL,
  `criado_por` INT NOT NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_agendamentos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_veiculo` FOREIGN KEY (`veiculo_id`) REFERENCES `veiculos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_agendamentos_criador` FOREIGN KEY (`criado_por`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 11. Tabela logs_lgpd
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

-- 12. Tabela notificacoes
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


-- ==========================================
-- DADOS INICIAIS DE TESTE (CADASTRADOS VIA SQL)
-- ==========================================

-- Usuários internos (Oficina)
-- Senhas: admin123, gerente123, atendente123, mecanico123
INSERT INTO `usuarios` (`id`, `nome`, `email`, `senha_hash`, `papel`, `telefone`) VALUES
(1, 'Administrador Oficina', 'admin@revsys.com', '$2b$10$5cXzyFEcfdaBHyT/LoDnnOv9yowPKgdTm.btlpiEZ0KLmo/tIrY2G', 'admin', '11999999991'),
(2, 'Gerente Oficina', 'gerente@revsys.com', '$2b$10$YOzlK1L6S86Kwtybdhccp.bp5f.nHZtf5QII5/i7u.D5ORXQDgKne', 'gerente', '11999999992'),
(3, 'Atendente Oficina', 'atendente@revsys.com', '$2b$10$WSImnNDrtlWrHHZVcpl5Eu6Qeue.lBI17nCGXY0KLcP7yoUP8yhQa', 'atendente', '11999999993'),
(4, 'Mecânico Oficina', 'mecanico@revsys.com', '$2b$10$nssE1Sk2FZ./7qYMfMwI2.fInxiwaLdMO578csERaxbyhVHz.yfQW', 'mecanico', '11999999994');

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

-- Marcas de Peça
INSERT INTO `marcas_peca` (`id`, `nome`) VALUES
(1, 'Mobil'),
(2, 'Fram'),
(3, 'Bosch'),
(4, 'Michelin'),
(5, 'Cofap');

-- Peças
INSERT INTO `pecas` (`id`, `nome`, `marca_peca_id`) VALUES
(1, 'Óleo 5W30', 1),
(2, 'Filtro de Óleo', 2),
(3, 'Pastilha de Freio', 3),
(4, 'Pneu Primacy 4', 4),
(5, 'Amortecedor TurboGás', 5);

-- Oficina padrão
INSERT INTO `oficinas` (`id`, `nome`, `cnpj`, `telefone`, `endereco`, `email`, `whatsapp_numero`) VALUES
(1, 'RevSys Oficina Matriz', '12345678000199', '1133334444', 'Av. Principal, 1000 - Centro, São Paulo - SP', 'matriz@revsys.com', '11999998888');

-- Credenciais de teste:
-- Administrador: admin@revsys.com (admin123)
-- Gerente: gerente@revsys.com (gerente123)
-- Atendente: atendente@revsys.com (atendente123)
-- Mecânico: mecanico@revsys.com (mecanico123)
