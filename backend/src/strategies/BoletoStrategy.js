import { PagamentoStrategy } from './PagamentoStrategy.js';

export class BoletoStrategy extends PagamentoStrategy {
  get metodo() {
    return 'boleto';
  }

  get nome() {
    return 'Boleto';
  }

  get descricao() {
    return 'Parcelado sem juros, um boleto por mês';
  }

  calcularTotal(valor, numParcelas) {
    return valor;
  }
}
