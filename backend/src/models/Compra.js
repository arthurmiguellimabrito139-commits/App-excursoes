import { RegraNegocioErro, NaoEncontradoErro } from '../utils/erros.js';
import { StatusCompra } from './StatusCompra.js';
import { Parcela } from './Parcela.js';

export class Compra {
  #id = null;
  #passageiroId;
  #viagemId;
  #metodo;          // 'pix', 'cartao' ou 'boleto'
  #valorTotal;
  #status;
  #criadoEm;
  #parcelas = [];

  // quem cria compra nova é a viagem.vender(...)
  constructor(passageiro, viagem, metodo, parcelasCalculadas) {
    if (parcelasCalculadas.length === 0) {
      throw new RegraNegocioErro('A compra precisa ter pelo menos uma parcela.');
    }
    this.#passageiroId = passageiro.id;
    this.#viagemId = viagem.id;
    this.#metodo = metodo;
    this.#status = StatusCompra.PENDENTE;
    this.#criadoEm = new Date().toISOString();

    let totalEmCentavos = 0;
    for (const calculada of parcelasCalculadas) {
      this.#parcelas.push(new Parcela(calculada.numero, calculada.valor, calculada.vencimento));
      totalEmCentavos = totalEmCentavos + Math.round(calculada.valor * 100);
    }
    this.#valorTotal = totalEmCentavos / 100;
  }

  static doBanco(linha, parcelas) {
    const compra = new Compra({ id: linha.PassageiroId }, { id: linha.ViagemId }, linha.Metodo, parcelas);
    compra.#id = linha.Id;
    compra.#valorTotal = linha.ValorTotal;
    compra.#status = linha.Status;
    compra.#criadoEm = linha.CriadoEm;
    compra.#parcelas = parcelas.slice();   // as Parcelas de verdade, com id e situação do banco
    return compra;
  }

  get id() { return this.#id; }
  get passageiroId() { return this.#passageiroId; }
  get viagemId() { return this.#viagemId; }
  get metodo() { return this.#metodo; }
  get valorTotal() { return this.#valorTotal; }
  get status() { return this.#status; }
  get criadoEm() { return this.#criadoEm; }
  get parcelas() { return this.#parcelas.slice(); }

  // compra cancelada não ocupa vaga
  get ativa() {
    return this.#status !== StatusCompra.CANCELADO;
  }

  definirId(id) {
    if (this.#id !== null) {
      throw new Error('O id já foi definido.');
    }
    this.#id = id;
  }

  // paga uma parcela, sempre na ordem (1ª, 2ª, 3ª...)
  pagarParcela(parcelaId) {
    if (this.#status === StatusCompra.CANCELADO) {
      throw new RegraNegocioErro('Esta compra foi cancelada.');
    }

    const parcela = this.#buscarParcela(parcelaId);
    if (parcela === null) {
      throw new NaoEncontradoErro('Parcela não encontrada.');
    }

    const anteriorEmAberto = this.#primeiraEmAbertoAntesDe(parcela.numero);
    if (anteriorEmAberto !== null) {
      throw new RegraNegocioErro('Pague antes a parcela ' + anteriorEmAberto.numero + '.');
    }

    parcela.marcarComoPaga();

    if (this.#todasPagas()) {
      this.#status = StatusCompra.PAGO;
    }
    return parcela;
  }

  cancelar() {
    if (this.#status === StatusCompra.PAGO) {
      throw new RegraNegocioErro('Não é possível cancelar uma compra já quitada.');
    }
    this.#status = StatusCompra.CANCELADO;
  }

  pertenceA(passageiroId) {
    return this.#passageiroId === passageiroId;
  }

  // ---------- informações para as telas ----------
  parcelasPagas() {
    let quantidade = 0;
    for (const parcela of this.#parcelas) {
      if (parcela.paga) {
        quantidade++;
      }
    }
    return quantidade;
  }

  valorPago() {
    let centavos = 0;
    for (const parcela of this.#parcelas) {
      if (parcela.paga) {
        centavos = centavos + Math.round(parcela.valor * 100);
      }
    }
    return centavos / 100;
  }

  // ---------- auxiliares ----------
  #buscarParcela(parcelaId) {
    for (const parcela of this.#parcelas) {
      if (parcela.id === parcelaId) {
        return parcela;
      }
    }
    return null;
  }

  #primeiraEmAbertoAntesDe(numero) {
    for (const parcela of this.#parcelas) {
      if (parcela.numero < numero && !parcela.paga) {
        return parcela;
      }
    }
    return null;
  }

  #todasPagas() {
    for (const parcela of this.#parcelas) {
      if (!parcela.paga) {
        return false;
      }
    }
    return true;
  }
}
