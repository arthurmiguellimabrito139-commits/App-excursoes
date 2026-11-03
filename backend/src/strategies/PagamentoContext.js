import { RegraNegocioErro } from '../utils/erros.js';
import { PixStrategy } from './PixStrategy.js';
import { CartaoStrategy } from './CartaoStrategy.js';
import { BoletoStrategy } from './BoletoStrategy.js';

// Escolhe a strategy pelo nome do método ('pix', 'cartao', 'boleto')
export class PagamentoContext {
  #estrategias = new Map();

  constructor(estrategias) {
    for (const estrategia of estrategias) {
      this.#estrategias.set(estrategia.metodo, estrategia);
    }
  }

  obter(metodo) {
    const estrategia = this.#estrategias.get(metodo);
    if (!estrategia) {
      throw new RegraNegocioErro('Forma de pagamento inválida.');
    }
    return estrategia;
  }

  todas() {
    return Array.from(this.#estrategias.values());
  }
}

// a única instância usada no projeto todo.
// Forma de pagamento nova = uma classe nova + uma linha aqui.
export const pagamentos = new PagamentoContext([
  new PixStrategy(),
  new CartaoStrategy(),
  new BoletoStrategy(),
]);
