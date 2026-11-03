import { PagamentoStrategy } from './PagamentoStrategy.js';

const JUROS_AO_MES = 0.025;   // 2,5%
const PARCELAS_SEM_JUROS = 3;

export class CartaoStrategy extends PagamentoStrategy {
  get metodo() {
    return 'cartao';
  }

  get nome() {
    return 'Cartão de crédito';
  }

  get descricao() {
    return 'Até 3x sem juros; acima disso, 2,5% ao mês';
  }

  maxParcelas(viagem) {
    return Math.min(12, viagem.maxParcelas);
  }

  calcularTotal(valor, numParcelas) {
    if (numParcelas <= PARCELAS_SEM_JUROS) {
      return valor;
    }
    // juros compostos: valor x 1,025 a cada parcela
    let total = valor;
    for (let i = 0; i < numParcelas; i++) {
      total = total * (1 + JUROS_AO_MES);
    }
    return total;
  }
}
