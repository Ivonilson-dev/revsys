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
(1, 'Toyota'),
(2, 'Volkswagen'),
(3, 'Fiat'),
(4, 'Honda');

-- Modelos de Veículo
INSERT INTO `modelos_veiculo` (`id`, `nome`, `marca_veiculo_id`) VALUES
(1, 'Corolla', 1),
(2, 'Hilux', 1),
(3, 'Golf', 2),
(4, 'Polo', 2),
(5, 'Uno', 3),
(6, 'Civic', 4);

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
