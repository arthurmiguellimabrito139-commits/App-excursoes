import { RegraNegocioErro } from '../utils/erros.js';

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Usuario {
  // tudo com # é privado: de fora da classe ninguém lê nem altera
  #id;
  #nome;
  #email;
  #senhaHash;

  constructor(dados) {
    if (new.target === Usuario) {
      throw new Error('Usuario é abstrato: use Admin ou Passageiro.');
    }
    this.#id = dados.id || null;   // usuário novo ainda não tem id (o banco gera)
    this.#definirNome(dados.nome);
    this.#definirEmail(dados.email);
    this.alterarSenha(dados.senhaHash);
  }

  get id() {
    return this.#id;
  }

  get nome() {
    return this.#nome;
  }

  get email() {
    return this.#email;
  }

  get senhaHash() {
    return this.#senhaHash;
  }

  // "método abstrato": cada filho é obrigado a sobrescrever
  get papel() {
    throw new Error('A classe filha precisa implementar o get papel.');
  }

  // o repository chama depois do INSERT, com o id que o banco gerou
  definirId(id) {
    if (this.#id !== null) {
      throw new Error('O id já foi definido.');
    }
    this.#id = id;
  }

  atualizarPerfil(nome, email) {
    this.#definirNome(nome);
    this.#definirEmail(email);
  }

  // recebe a senha JÁ criptografada (o bcrypt roda no authService)
  alterarSenha(novoHash) {
    if (!novoHash) {
      throw new RegraNegocioErro('Senha inválida.');
    }
    this.#senhaHash = novoHash;
  }

  // é isto que o res.json() usa: o hash da senha nunca sai daqui
  toJSON() {
    return { id: this.id, nome: this.nome, email: this.email, tipo: this.papel };
  }

  #definirNome(nome) {
    const limpo = String(nome || '').trim();
    if (limpo.length < 2 || limpo.length > 100) {
      throw new RegraNegocioErro('O nome deve ter entre 2 e 100 caracteres.');
    }
    this.#nome = limpo;
  }

  #definirEmail(email) {
    const limpo = String(email || '').trim().toLowerCase();
    if (limpo.length > 150 || !FORMATO_EMAIL.test(limpo)) {
      throw new RegraNegocioErro('E-mail inválido.');
    }
    this.#email = limpo;
  }
}
