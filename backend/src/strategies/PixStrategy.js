import { PagamentoStrategy } from './PagamentoStrategy.js';

export class PixStrategy extends PagamentoStrategy {
  get metodo() {
    return 'pix';
  }

  get nome() {
    return 'Pix';
  }

  get descricao() {
    return 'À vista com 5% de desconto';
  }

  maxParcelas(viagem) {
    return 1;
  }

  calcularTotal(valor, numParcelas) {
    return valor * 0.95;
  }
}
