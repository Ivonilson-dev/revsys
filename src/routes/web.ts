import { Router, Request, Response } from 'express';
import { estaAutenticado, naoAutenticado, temPapel } from '../middlewares/autorizacao';

// Controladores
import AutenticacaoController from '../controllers/AutenticacaoController';
import PainelController from '../controllers/PainelController';
import ClienteController from '../controllers/ClienteController';
import VeiculoController from '../controllers/VeiculoController';
import TrocaController from '../controllers/TrocaController';
import ServicoController from '../controllers/ServicoController';
import AgendamentoController from '../controllers/AgendamentoController';
import CadastroBaseController from '../controllers/CadastroBaseController';
import ClienteAreaController from '../controllers/ClienteAreaController';
import RelatorioController from '../controllers/RelatorioController';
import NotificacaoController from '../controllers/NotificacaoController';
import { Veiculo, ModeloVeiculo, MarcaVeiculo } from '../../models';

const router = Router();

// 1. Autenticação
router.get('/login', naoAutenticado, AutenticacaoController.exibirLogin);
router.post('/login', naoAutenticado, AutenticacaoController.login);
router.get('/sair', AutenticacaoController.sair);
router.get('/recuperar-senha', naoAutenticado, AutenticacaoController.exibirRecuperarSenha);
router.post('/recuperar-senha', naoAutenticado, AutenticacaoController.recuperarSenha);

// 2. Painel Principal (Redireciona cliente para área dele, ou exibe dashboard oficina)
router.get('/painel', estaAutenticado, PainelController.exibirPainel);

// 3. Notificações
router.post('/notificacoes/:id/lida', estaAutenticado, NotificacaoController.marcarComoLida);
router.post('/notificacoes/ler-todas', estaAutenticado, NotificacaoController.marcarTodasComoLidas);

// 4. Clientes (CRUD)
router.get('/clientes', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), ClienteController.listar);
router.get('/clientes/novo', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), ClienteController.exibirCadastro);
router.post('/clientes', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), ClienteController.cadastrar);
router.get('/clientes/:id', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), ClienteController.exibirDetalhes);
router.get('/clientes/:id/editar', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), ClienteController.exibirEdicao);
router.put('/clientes/:id', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), ClienteController.editar);
router.delete('/clientes/:id', estaAutenticado, temPapel('admin', 'gerente'), ClienteController.deletar);

// 5. Veículos (CRUD)
router.get('/veiculos', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), VeiculoController.listar);
router.get('/veiculos/novo', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), VeiculoController.exibirCadastro);
router.post('/veiculos', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), VeiculoController.cadastrar);
router.get('/veiculos/:id', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), VeiculoController.exibirDetalhes);
router.get('/veiculos/:id/editar', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), VeiculoController.exibirEdicao);
router.put('/veiculos/:id', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), VeiculoController.editar);
router.delete('/veiculos/:id', estaAutenticado, temPapel('admin', 'gerente'), VeiculoController.deletar);

// 6. Troca de Peças e Registro de Serviços Prestados
router.post('/troca', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), TrocaController.registrar);
router.delete('/troca/:id', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), TrocaController.deletar);
router.post('/registro-servico', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), ServicoController.registrar);
router.delete('/registro-servico/:id', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), ServicoController.deletar);

// 7. Agendamentos
router.get('/agendamentos', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), AgendamentoController.listar);
router.get('/agendamentos/calendario-tela', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), AgendamentoController.exibirCalendario);
router.get('/agendamentos/calendario', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), AgendamentoController.obterEventosCalendario);
router.get('/agendamentos/horarios-disponiveis', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), AgendamentoController.obterHorariosDisponiveis);
router.post('/agendamentos', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), AgendamentoController.cadastrar);
router.put('/agendamentos/:id', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), AgendamentoController.atualizar);
router.get('/agendamentos/alertas-24h', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), AgendamentoController.obterAlertas24h);
router.post('/agendamentos/:id/solicitar-confirmacao', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), AgendamentoController.solicitarConfirmacao);
router.post('/agendamentos/:id/adiar-confirmacao', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), AgendamentoController.adiarConfirmacao);
router.post('/agendamentos/:id/confirmar-presenca', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), AgendamentoController.confirmarPresenca);

// 8. Cadastros Auxiliares (Marcas, Modelos, Peças, Serviços, Oficinas)
router.get('/cadastros', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), CadastroBaseController.exibirPainelCadastros);
router.post('/marcas-veiculo', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), CadastroBaseController.criarMarcaVeiculo);
router.delete('/marcas-veiculo/:id', estaAutenticado, temPapel('admin', 'gerente'), CadastroBaseController.deletarMarcaVeiculo);
router.post('/modelos-veiculo', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), CadastroBaseController.criarModeloVeiculo);
router.delete('/modelos-veiculo/:id', estaAutenticado, temPapel('admin', 'gerente'), CadastroBaseController.deletarModeloVeiculo);
router.post('/marcas-peca', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), CadastroBaseController.criarMarcaPeca);
router.delete('/marcas-peca/:id', estaAutenticado, temPapel('admin', 'gerente'), CadastroBaseController.deletarMarcaPeca);
router.post('/pecas', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), CadastroBaseController.criarPeca);
router.delete('/pecas/:id', estaAutenticado, temPapel('admin', 'gerente'), CadastroBaseController.deletarPeca);
router.post('/oficinas', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), CadastroBaseController.criarOficina);
router.delete('/oficinas/:id', estaAutenticado, temPapel('admin', 'gerente'), CadastroBaseController.deletarOficina);
router.post('/servicos', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), CadastroBaseController.criarServico);
router.put('/servicos/:id', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), CadastroBaseController.editarServico);
router.delete('/servicos/:id', estaAutenticado, temPapel('admin', 'gerente'), CadastroBaseController.deletarServico);

// 9. Relatórios
router.get('/relatorios', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), RelatorioController.exibirMenu);
router.get('/relatorios/peca', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), RelatorioController.relatorioPeca);
router.get('/relatorios/cliente', estaAutenticado, temPapel('admin', 'gerente', 'atendente'), RelatorioController.relatorioCliente);
router.get('/relatorios/vencidos', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), RelatorioController.relatorioVencidos);
router.get('/relatorios/proximos', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), RelatorioController.relatorioProximos);
router.get('/relatorios/agendamentos', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), RelatorioController.relatorioAgendamentos);
router.get('/relatorios/trocas-mes', estaAutenticado, temPapel('admin', 'gerente', 'atendente', 'mecanico'), RelatorioController.relatorioTrocasMes);

// 10. Área do Cliente (Exclusiva)
router.get('/cliente/veiculos', estaAutenticado, temPapel('cliente'), ClienteAreaController.listarVeiculosCliente);
router.get('/cliente/veiculo/:id', estaAutenticado, temPapel('cliente'), ClienteAreaController.exibirDetalhesVeiculo);
router.post('/cliente/solicitar-manutencao', estaAutenticado, temPapel('cliente'), ClienteAreaController.solicitarManutencao);
router.post('/cliente/revogar-consentimento', estaAutenticado, temPapel('cliente'), ClienteAreaController.revogarConsentimento);
router.post('/cliente/dar-consentimento', estaAutenticado, temPapel('cliente'), ClienteAreaController.darConsentimento);

// 11. APIs Internas Úteis
router.get('/api/clientes/:id/veiculos', estaAutenticado, async (req: Request, res: Response): Promise<void> => {
  try {
    const veiculos = await Veiculo.findAll({
      where: { cliente_id: Number(req.params.id) },
      include: [{ model: ModeloVeiculo, as: 'modelo', include: [{ model: MarcaVeiculo, as: 'marca' }] }]
    });
    res.json(veiculos);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao buscar veículos.' });
  }
});

export default router;

// Compatibilidade CommonJS
module.exports = router;
