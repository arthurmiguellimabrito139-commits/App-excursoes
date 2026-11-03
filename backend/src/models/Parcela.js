import { RegraNegocioErro } from '../utils/erros.js';

export class Parcela {
  #id = null;
  #numero;
  #valor;
  #vencimento;
  #paga = false;
  #pagoEm = null;   // continua null enquanto não for paga

  constructor(numero, valor, vencimento) {
    if (!Number.isInteger(numero) || numero < 1) {
      throw new RegraNegocioErro('Número da parcela inválido.');
    }
    if (!(valor > 0)) {
      throw new RegraNegocioErro('Valor da parcela deve ser maior que zero.');
    }
    this.#numero = numero;
    this.#valor = valor;
    this.#vencimento = vencimento;
  }

  static doBanco(linha) {
    const parcela = new Parcela(linha.Numero, linha.Valor, linha.Vencimento);
    parcela.#id = linha.Id;
    parcela.#paga = Boolean(linha.Paga);   // o MySQL devolve 0 ou 1
    parcela.#pagoEm = linha.PagoEm;
    return parcela;
  }

  get id() { return this.#id; }
  get numero() { return this.#numero; }
  get valor() { return this.#valor; }
  get vencimento() { return this.#vencimento; }
  get paga() { return this.#paga; }
  get pagoEm() { return this.#pagoEm; }

  definirId(id) {
    if (this.#id !== null) {
      throw new Error('O id já foi definido.');
    }
    this.#id = id;
  }

  // só a Compra chama, depois de conferir a ordem das parcelas
  marcarComoPaga() {
    if (this.#paga) {
      throw new RegraNegocioErro('Esta parcela já foi paga.');
    }
    this.#paga = true;
    this.#pagoEm = new Date().toISOString();
  }
}
