import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Confere o token: assinatura, validade, quem emitiu e para quem.
// O id do usuário logado sai DAQUI (req.usuario.id), nunca do corpo da requisição.
export function autenticar(req, res, next) {
  const partes = (req.get('authorization') || '').split(' ');
  const tipo = partes[0];
  const token = partes[1];

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }

  try {
    const dados = jwt.verify(token, config.jwt.segredo, {
      algorithms: ['HS256'],          // não aceita token com outro tipo de assinatura
      issuer: 'excursoes-api',
      audience: 'excursoes-front',
    });
    req.usuario = { id: dados.id, nome: dados.nome, papel: dados.papel };
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login de novo.' });
  }
}

// exigirPapel('Admin') → só deixa passar quem tem esse papel no token (403 se não tiver)
export function exigirPapel(papel) {
  return function (req, res, next) {
    if (!req.usuario || req.usuario.papel !== papel) {
      return res.status(403).json({ erro: 'Você não tem permissão para isso.' });
    }
    next();
  };
}
