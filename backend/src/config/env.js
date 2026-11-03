import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// carrega o backend/.env, não importa de qual pasta você rodou o comando
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

function obrigatoria(nome) {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error('A variável ' + nome + ' está faltando no .env');
  }
  return valor;
}

const segredoJwt = obrigatoria('JWT_SECRET');
if (segredoJwt.length < 32) {
  throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres.');
}

export const config = {
  porta: Number(process.env.PORT || 5002),
  producao: process.env.NODE_ENV === 'production',
  banco: {
    host: obrigatoria('DB_HOST'),
    porta: Number(process.env.DB_PORT || 3306),
    usuario: obrigatoria('DB_USER'),
    senha: process.env.DB_PASS || '',
    nome: obrigatoria('DB_NAME'),
  },
  jwt: {
    segredo: segredoJwt,
    expira: process.env.JWT_EXPIRA || '1h',
  },
  corsOrigens: (process.env.CORS_ORIGEM || 'http://localhost:5173').split(','),
  // endereço público da API (para montar o link das fotos). Vazio = descobre pela requisição
  urlPublica: process.env.URL_PUBLICA || '',
  bcryptCusto: 12,
  admin: {
    nome: process.env.ADMIN_NOME || 'Administrador',
    email: process.env.ADMIN_EMAIL || '',
    senha: process.env.ADMIN_SENHA || '',
  },
  // o "pagar parcela" é simulado (portfólio). Em produção real, trocar por um gateway.
  pagamentoSimulado: process.env.PAGAMENTO_SIMULADO !== 'false',
};
