import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import methodOverride from 'method-override';
import path from 'path';
import { sequelize } from '../models';
import webRoutes from './routes/web';
import DatabaseSessionStore from './utils/sessionStore';
import formatadores from './utils/formatadores';
import AgendamentoController from './controllers/AgendamentoController';
import { tratarErroRequisicao } from './utils/erros';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do view engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(process.cwd(), 'public')));

// Sessão Persistente no Banco de Dados (MySQL)
// Mantém o usuário logado continuamente até que efetue o logout deliberadamente
app.use(session({
  store: new DatabaseSessionStore(sequelize),
  secret: process.env.SESSION_SECRET || 'revsys_secret_session_key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 ano (duração contínua até o logout)
    httpOnly: true,
    secure: false, // em produção com HTTPS configure para true se necessário
    sameSite: 'lax'
  }
}));

// Disponibilizar variáveis locais globais nas views EJS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.usuarioLogado = req.session.usuario || null;
  res.locals.urlAtiva = req.originalUrl;
  
  // Helpers de formatação para as views EJS
  res.locals.formatarCPF = formatadores.formatarCPF;
  res.locals.formatarCNPJ = formatadores.formatarCNPJ;
  res.locals.formatarCPFCNPJ = formatadores.formatarCPFCNPJ;
  res.locals.formatarTelefone = formatadores.formatarTelefone;
  res.locals.formatarCEP = formatadores.formatarCEP;
  res.locals.formatarPlaca = formatadores.formatarPlaca;
  res.locals.ehPlacaMercosul = formatadores.ehPlacaMercosul;
  res.locals.ehPlacaAntiga = formatadores.ehPlacaAntiga;
  res.locals.obterTipoPlaca = formatadores.obterTipoPlaca;
  res.locals.obterClassePlaca = formatadores.obterClassePlaca;
  res.locals.formatarData = formatadores.formatarData;
  res.locals.formatarKm = formatadores.formatarKm;
  res.locals.formatarDuracao = formatadores.formatarDuracao;

  // Capturar mensagens de sucesso/erro passadas na query string
  res.locals.sucessoMsg = (req.query.sucesso as string) || null;
  res.locals.erroMsg = (req.query.erro as string) || null;
  
  next();
});

// Rotas da aplicação
app.use('/', webRoutes);

// Rota raiz - Redirecionamento inicial
app.get('/', (req: Request, res: Response) => {
  if (req.session && req.session.usuario) {
    res.redirect('/painel');
    return;
  }
  res.redirect('/login');
});

// Erro 404 (Página não encontrada)
app.use((req: Request, res: Response) => {
  res.status(404).render('erros/404', {
    titulo: 'Página Não Encontrada',
    layout: false
  });
});

// Middleware Global de Tratamento de Erros (Captura falhas de conexão de banco e exceções não tratadas)
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  tratarErroRequisicao(err, req, res, next);
});

// Conectar ao Banco de Dados e Iniciar o Servidor
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados MySQL estabelecida com sucesso.');
    
    // Execução inicial de auto-conclusão ao iniciar o servidor
    AgendamentoController.autoConcluirAgendamentosVencidos().catch((err: unknown) => {
      console.error('Erro na auto-conclusão inicial de agendamentos:', err instanceof Error ? err.message : err);
    });

    // Verificação periódica a cada 60 segundos para auto-conclusão de agendamentos confirmados cujo tempo alocado expirou
    setInterval(() => {
      AgendamentoController.autoConcluirAgendamentosVencidos().catch((err: unknown) => {
        console.error('Erro no heartbeat de auto-conclusão de agendamentos:', err instanceof Error ? err.message : err);
      });
    }, 60000);

    app.listen(PORT, () => {
      console.log(`Servidor RevSys rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error('Não foi possível conectar ao banco de dados MySQL:', err instanceof Error ? err.message : err);
    console.log('Certifique-se de ter rodado o script banco.sql e configurado o arquivo .env corretamente.');
    
    // Fallback: Inicia o servidor mesmo que a conexão falhe, para permitir ver as telas estáticas
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT} (Sem conexão com Banco)`);
    });
  });

export default app;

// Compatibilidade CommonJS
module.exports = app;
