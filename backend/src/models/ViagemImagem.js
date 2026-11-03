export class ViagemImagem {
  #id;
  #url;   // caminho relativo, ex.: /uploads/3f2a...c1.webp

  constructor(url, id) {
    if (!url) {
      throw new Error('Endereço da imagem vazio.');
    }
    this.#url = url;
    this.#id = id || null;
  }

  get id() {
    return this.#id;
  }

  get url() {
    return this.#url;
  }

  // o repository chama depois do INSERT
  definirId(id) {
    if (this.#id !== null) {
      throw new Error('O id já foi definido.');
    }
    this.#id = id;
  }
}
