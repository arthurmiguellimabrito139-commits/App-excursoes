import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { Passageiro } from '../models/Passageiro.js';
import { Admin } from '../models/Admin.js';
import { RegraNegocioErro, NaoAutorizadoErro } from '../utils/erros.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';

let hashFalso = null;

// Usado quando o e-mail não existe: o bcrypt roda do mesmo jeito,
// então a resposta demora o mesmo tempo e ninguém descobre quais e-mails estão cadastrados.
async function obterHashFalso() {
  if (hashFalso === null) {
    hashFalso = await bcrypt.hash('senha-que-ninguem-usa', config.bcryptCusto);
  }
  return hashFalso;
}

function validarSenha(senha) {
  // o bcrypt só olha os primeiros 72 bytes; acima disso o resto seria ignorado
  if (typeof senha !== 'string' || senha.length < 8 || Buffer.byteLength(senha) > 72) {
    throw new RegraNegocioErro('A senha deve ter entre 8 e 72 caracteres.');
  }
}

export function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
    config.jwt.segredo,
    {
      algorithm: 'HS256',
      expiresIn: config.jwt.expira,
      issuer: 'excursoes-api',
      audience: 'excursoes-front',
    }
  );
}

// cadastro público: SEMPRE cria passageiro (admin nunca nasce pela tela)
export async function cadastrar(nome, email, senha) {
  validarSenha(senha);
  const senhaHash = await bcrypt.hash(senha, config.bcryptCusto);

  const passageiro = new Passageiro({ nome: nome, email: email, senhaHash: senhaHash });
  await usuarioRepository.inserir(passageiro);   // e-mail repetido → "E-mail já cadastrado."

  return { token: gerarToken(passageiro), usuario: passageiro };
}

export async function login(email, senha) {
  const usuario = await usuarioRepository.buscarPorEmail(email);

  let hash = await obterHashFalso();
  if (usuario !== null) {
    hash = usuario.senhaHash;
  }
  const senhaConfere = await bcrypt.compare(String(senha || ''), hash);

  // a mesma mensagem para "e-mail não existe" e "senha errada"
  if (usuario === null || !senhaConfere) {
    throw new NaoAutorizadoErro('E-mail ou senha inválidos.');
  }
  return { token: gerarToken(usuario), usuario: usuario };
}

// roda quando o servidor sobe: cria o primeiro admin com os dados do .env
export async function criarAdminInicial() {
  if (await usuarioRepository.existeAdmin()) {
    return;
  }
  if (!config.admin.email || !config.admin.senha) {
    console.warn('⚠️  Nenhum admin cadastrado. Preencha ADMIN_EMAIL e ADMIN_SENHA no .env.');
    return;
  }
  if (config.admin.senha.length < 12) {
    throw new Error('ADMIN_SENHA precisa ter pelo menos 12 caracteres.');
  }

  const senhaHash = await bcrypt.hash(config.admin.senha, config.bcryptCusto);
  const admin = new Admin({ nome: config.admin.nome, email: config.admin.email, senhaHash: senhaHash });
  await usuarioRepository.inserir(admin);
  console.log('👤 Admin criado: ' + admin.email);
}
