import { db } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { Passageiro } from '../models/Passageiro.js';
import { RegraNegocioErro } from '../utils/erros.js';
import { dataHoraParaBanco } from '../utils/datas.js';

// A coluna Tipo diz qual classe montar (herança guardada numa tabela só)
function montar(linha) {
  const dados = { id: linha.Id, nome: linha.Nome, email: linha.Email, senhaHash: linha.SenhaHash };
  if (linha.Tipo === 'Admin') {
    return new Admin(dados);
  }
  return new Passageiro(dados);
}

export async function buscarPorId(id) {
  const [linhas] = await db.query('SELECT * FROM Usuarios WHERE Id = ?', [id]);
  if (linhas.length === 0) {
    return null;
  }
  return montar(linhas[0]);
}

export async function buscarPorEmail(email) {
  const [linhas] = await db.query('SELECT * FROM Usuarios WHERE Email = ?', [String(email).trim().toLowerCase()]);
  if (linhas.length === 0) {
    return null;
  }
  return montar(linhas[0]);
}

// para a lista de passageiros de uma viagem (uma consulta só para todos)
export async function buscarVarios(ids) {
  if (ids.length === 0) {
    return [];
  }
  const [linhas] = await db.query('SELECT * FROM Usuarios WHERE Id IN (?)', [ids]);
  const usuarios = [];
  for (const linha of linhas) {
    usuarios.push(montar(linha));
  }
  return usuarios;
}

export async function existeAdmin() {
  const [linhas] = await db.query("SELECT COUNT(*) AS total FROM Usuarios WHERE Tipo = 'Admin'");
  return linhas[0].total > 0;
}

export async function inserir(usuario) {
  try {
    const [resultado] = await db.query(
      'INSERT INTO Usuarios (Tipo, Nome, Email, SenhaHash, CriadoEm) VALUES (?, ?, ?, ?, ?)',
      [usuario.papel, usuario.nome, usuario.email, usuario.senhaHash, dataHoraParaBanco(new Date().toISOString())]
    );
    usuario.definirId(resultado.insertId);
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') {   // o UNIQUE do e-mail barrou
      throw new RegraNegocioErro('E-mail já cadastrado.');
    }
    throw erro;
  }
}
