'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Inserir Usuários Oficina
    const salt = await bcrypt.genSalt(10);
    const senhaAdmin = await bcrypt.hash('admin123', salt);
    const senhaGerente = await bcrypt.hash('gerente123', salt);
    const senhaAtendente = await bcrypt.hash('atendente123', salt);
    const senhaMecanico = await bcrypt.hash('mecanico123', salt);

    await queryInterface.bulkInsert('usuarios', [
      {
        nome: 'Administrador Oficina',
        email: 'admin@revsys.com',
        senha_hash: senhaAdmin,
        papel: 'admin',
        telefone: '11999999991',
        criado_em: new Date(),
        atualizado_em: new Date()
      },
      {
        nome: 'Gerente Oficina',
        email: 'gerente@revsys.com',
        senha_hash: senhaGerente,
        papel: 'gerente',
        telefone: '11999999992',
        criado_em: new Date(),
        atualizado_em: new Date()
      },
      {
        nome: 'Atendente Oficina',
        email: 'atendente@revsys.com',
        senha_hash: senhaAtendente,
        papel: 'atendente',
        telefone: '11999999993',
        criado_em: new Date(),
        atualizado_em: new Date()
      },
      {
        nome: 'Mecânico Oficina',
        email: 'mecanico@revsys.com',
        senha_hash: senhaMecanico,
        papel: 'mecanico',
        telefone: '11999999994',
        criado_em: new Date(),
        atualizado_em: new Date()
      }
    ], {});

    // 2. Inserir Marcas de Veículo
    await queryInterface.bulkInsert('marcas_veiculo', [
      { id: 1, nome: 'Toyota', criado_em: new Date(), atualizado_em: new Date() },
      { id: 2, nome: 'Volkswagen', criado_em: new Date(), atualizado_em: new Date() },
      { id: 3, nome: 'Fiat', criado_em: new Date(), atualizado_em: new Date() },
      { id: 4, nome: 'Honda', criado_em: new Date(), atualizado_em: new Date() }
    ], {});

    // 3. Inserir Modelos de Veículo
    await queryInterface.bulkInsert('modelos_veiculo', [
      { id: 1, nome: 'Corolla', marca_veiculo_id: 1, criado_em: new Date(), atualizado_em: new Date() },
      { id: 2, nome: 'Hilux', marca_veiculo_id: 1, criado_em: new Date(), atualizado_em: new Date() },
      { id: 3, nome: 'Golf', marca_veiculo_id: 2, criado_em: new Date(), atualizado_em: new Date() },
      { id: 4, nome: 'Polo', marca_veiculo_id: 2, criado_em: new Date(), atualizado_em: new Date() },
      { id: 5, nome: 'Uno', marca_veiculo_id: 3, criado_em: new Date(), atualizado_em: new Date() },
      { id: 6, nome: 'Civic', marca_veiculo_id: 4, criado_em: new Date(), atualizado_em: new Date() }
    ], {});

    // 4. Inserir Marcas de Peça
    await queryInterface.bulkInsert('marcas_peca', [
      { id: 1, nome: 'Mobil', criado_em: new Date(), atualizado_em: new Date() },
      { id: 2, nome: 'Fram', criado_em: new Date(), atualizado_em: new Date() },
      { id: 3, nome: 'Bosch', criado_em: new Date(), atualizado_em: new Date() },
      { id: 4, nome: 'Michelin', criado_em: new Date(), atualizado_em: new Date() },
      { id: 5, nome: 'Cofap', criado_em: new Date(), atualizado_em: new Date() }
    ], {});

    // 5. Inserir Peças
    await queryInterface.bulkInsert('pecas', [
      { id: 1, nome: 'Óleo 5W30', marca_peca_id: 1, criado_em: new Date(), atualizado_em: new Date() },
      { id: 2, nome: 'Filtro de Óleo', marca_peca_id: 2, criado_em: new Date(), atualizado_em: new Date() },
      { id: 3, nome: 'Pastilha de Freio', marca_peca_id: 3, criado_em: new Date(), atualizado_em: new Date() },
      { id: 4, nome: 'Pneu Primacy 4', marca_peca_id: 4, criado_em: new Date(), atualizado_em: new Date() },
      { id: 5, nome: 'Amortecedor TurboGás', marca_peca_id: 5, criado_em: new Date(), atualizado_em: new Date() }
    ], {});

    // 6. Inserir Oficina Padrão
    await queryInterface.bulkInsert('oficinas', [
      {
        id: 1,
        nome: 'RevSys Oficina Matriz',
        cnpj: '12345678000199',
        telefone: '1133334444',
        endereco: 'Av. Principal, 1000 - Centro, São Paulo - SP',
        email: 'matriz@revsys.com',
        whatsapp_numero: '11999998888',
        criado_em: new Date(),
        atualizado_em: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('usuarios', null, {});
    await queryInterface.bulkDelete('marcas_veiculo', null, {});
    await queryInterface.bulkDelete('modelos_veiculo', null, {});
    await queryInterface.bulkDelete('marcas_peca', null, {});
    await queryInterface.bulkDelete('pecas', null, {});
    await queryInterface.bulkDelete('oficinas', null, {});
  }
};
