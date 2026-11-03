import * as authService from '../services/authService.js';

export async function login(req, res) {
  const dados = req.validado.body;
  const resposta = await authService.login(dados.email, dados.senha);
  res.json(resposta);   // o toJSON() do Usuario esconde o hash da senha
}

export async function cadastrar(req, res) {
  const dados = req.validado.body;   // só nome, email e senha: o zod descartou o resto
  const resposta = await authService.cadastrar(dados.nome, dados.email, dados.senha);
  res.status(201).json(resposta);
}
