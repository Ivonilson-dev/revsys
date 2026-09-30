require('dotenv').config();
const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');
const { sequelize } = require('./models');
const webRoutes = require('./src/routes/web');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do view engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Sessão Persistente no Banco de Dados (MySQL)
// Mantém o usuário logado continuamente até que efetue o logout deliberadamente
const DatabaseSessionStore = require('./src/utils/sessionStore');

app.use(session({
  store: new DatabaseSessionStore(sequelize),
  secret: process.env.SESSION_SECRET || 'revsys_secret_session_key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 ano (duração contínua até o logout)
    httpOnly: true,
    secure: false, // em produção com HTTPS deve ser true
    sameSite: 'lax'
  }
}));

// Disponibilizar variáveis locais globais nas views EJS
const formatadores = require('./src/utils/formatadores');

app.use((req, res, next) => {
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
  res.locals.sucessoMsg = req.query.sucesso || null;
  res.locals.erroMsg = req.query.erro || null;
  
  next();
});

// Rotas da aplicação
app.use('/', webRoutes);

// Rota raiz - Redirecionamento inicial
app.get('/', (req, res) => {
  if (req.session.usuario) {
    return res.redirect('/painel');
  }
  return res.redirect('/login');
});

// Erro 404 (Página não encontrada)
app.use((req, res) => {
  res.status(404).render('erros/404', {
    titulo: 'Página Não Encontrada',
    layout: false
  });
});

// Controlador de agendamentos para verificação de tempo alocado
const AgendamentoController = require('./src/controllers/AgendamentoController');

// Conectar ao Banco de Dados e Iniciar o Servidor
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com o banco de dados MySQL estabelecida com sucesso.');
    
    // Execução inicial de auto-conclusão ao iniciar o servidor
    AgendamentoController.autoConcluirAgendamentosVencidos().catch(err => {
      console.error('Erro na auto-conclusão inicial de agendamentos:', err);
    });

    // Verificação periódica a cada 60 segundos para auto-conclusão de agendamentos confirmados cujo tempo alocado expirou
    setInterval(() => {
      AgendamentoController.autoConcluirAgendamentosVencidos().catch(err => {
        console.error('Erro no heartbeat de auto-conclusão de agendamentos:', err);
      });
    }, 60000);

    app.listen(PORT, () => {
      console.log(`Servidor RevSys rodando em http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Não foi possível conectar ao banco de dados MySQL:', err);
    console.log('Certifique-se de ter rodado o script banco.sql e configurado o arquivo .env corretamente.');
    
    // Fallback: Inicia o servidor mesmo que a conexão falhe, para permitir ver as telas estáticas
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT} (Sem conexão com Banco)`);
    });
  });

module.exports = app;
