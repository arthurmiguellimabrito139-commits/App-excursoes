import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { rotas } from './routes/index.js';
import { limiteGeral } from './middlewares/limites.js';
import { naoEncontrado, tratarErros } from './middlewares/erros.js';
import { PASTA_UPLOADS } from './services/imagemStorage.js';

export const app = express();

app.disable('x-powered-by');                    // não conta que é Express
if (config.producao) {
  app.set('trust proxy', 1);                     // atrás do proxy do Render: pega o IP real do visitante
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));  // cabeçalhos de segurança
app.use(cors({ origin: config.corsOrigens }));   // só o seu front pode chamar
app.use(express.json({ limit: '1mb' }));         // corpo gigante é recusado

// fotos das viagens: só arquivos da pasta uploads, sem listar a pasta
app.use('/uploads', express.static(PASTA_UPLOADS, { index: false, dotfiles: 'deny' }));

app.get('/api/health', function (req, res) {
  res.json({ ok: true });
});

app.use('/api', limiteGeral, rotas);

app.use(naoEncontrado);
app.use(tratarErros);
