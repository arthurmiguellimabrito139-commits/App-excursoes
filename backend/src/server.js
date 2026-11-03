import { config } from './config/env.js';
import { db } from './config/db.js';
import { app } from './app.js';
import { criarAdminInicial } from './services/authService.js';
import { prepararPasta } from './services/imagemStorage.js';

async function iniciar() {
  try {
    await db.query('SELECT 1');
    console.log('✅ MySQL conectado');

    await prepararPasta();
    await criarAdminInicial();

    app.listen(config.porta, function () {
      console.log('🚀 API rodando em http://localhost:' + config.porta);
    });
  } catch (erro) {
    console.error('❌ Não consegui iniciar o servidor:');
    console.error(erro.message);
    process.exit(1);
  }
}

iniciar();
