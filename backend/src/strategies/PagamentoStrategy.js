import { RegraNegocioErro } from '../utils/erros.js';
import { hoje, somarMeses } from '../utils/datas.js';

// Faz o papel da interface + classe base do C# (padrão Strategy + Template Method).
// A parte comum fica aqui; cada filha só diz o que muda.
export class PagamentoStrategy {
  constructor() {
    if (new.target === PagamentoStrategy) {
      throw new Error('PagamentoStrategy é abstrata: use Pix, Cartao ou Boleto.');
    }
  }

  // ---------- "abstratos": toda filha precisa sobrescrever ----------
  get metodo() {
    throw new Error('Implemente o get metodo');
  }

  get nome() {
    throw new Error('Implemente o get nome');
  }

  get descricao() {
    throw new Error('Implemente o get descricao');
  }

  // o único passo que muda de uma forma de pagamento para outra
  calcularTotal(valor, numParcelas) {
    throw new Error('Implemente calcularTotal()');
  }

  // ---------- pode sobrescrever se quiser ----------
  // por padrão, o limite é o que o admin definiu na viagem
  maxParcelas(viagem) {
    return viagem.maxParcelas;
  }

  // ---------- igual para todas (o "template") ----------
  calcular(viagem, numParcelas) {
    const max = this.maxParcelas(viagem);
    if (!Number.isInteger(numParcelas) || numParcelas < 1 || numParcelas > max) {
      if (max === 1) {
        throw new RegraNegocioErro(this.nome + ' só aceita pagamento à vista.');
      }
      throw new RegraNegocioErro(this.nome + ': escolha entre 1 e ' + max + ' parcelas.');
    }

    // a conta é feita em CENTAVOS (número inteiro) para não errar dinheiro:
    // no JS, 0.1 + 0.2 dá 0.30000000000000004
    const totalCentavos = Math.round(this.calcularTotal(viagem.valor, numParcelas) * 100);

    // arredonda para baixo; a última parcela fica com a diferença dos centavos
    const parcelaCentavos = Math.floor(totalCentavos / numParcelas);
    const ultimaCentavos = totalCentavos - parcelaCentavos * (numParcelas - 1);

    const dataDeHoje = hoje();
    const parcelas = [];
    for (let numero = 1; numero <= numParcelas; numero++) {
      let centavos = parcelaCentavos;
      if (numero === numParcelas) {
        centavos = ultimaCentavos;
      }
      parcelas.push({
        numero: numero,
        valor: centavos / 100,
        vencimento: somarMeses(dataDeHoje, numero - 1),
      });
    }
    return parcelas;
  }
}
