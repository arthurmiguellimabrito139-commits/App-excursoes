import { rateLimit } from 'express-rate-limit';

function responder(mensagem) {
  return function (req, res) {
    res.status(429).json({ erro: mensagem });
  };
}

// login e cadastro: 5 tentativas por minuto por IP (contra quem tenta adivinhar senha)
export const limiteLogin = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: responder('Muitas tentativas. Aguarde um minuto e tente de novo.'),
});

// o resto da API: 300 requisições por minuto por IP
export const limiteGeral = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: responder('Muitas requisições. Aguarde um minuto.'),
});
