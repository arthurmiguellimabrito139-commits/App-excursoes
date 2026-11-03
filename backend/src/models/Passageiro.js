import { Usuario } from './Usuario.js';
import { RegraNegocioErro } from '../utils/erros.js';

export class Passageiro extends Usuario {
  #compras = [];

  get papel() {
    return 'Passageiro';
  }

  get compras() {
    // devolve uma cópia: quem está de fora não consegue dar push na lista
    return this.#compras.slice();
  }

  comprar(viagem, strategy, numParcelas) {
    // regra do passageiro: não compra a mesma viagem duas vezes
    if (this.jaComprou(viagem)) {
      throw new RegraNegocioErro('Você já comprou esta viagem.');
    }

    // regra da viagem: ela confere a vaga e usa a strategy para gerar as parcelas
    const compra = viagem.vender(this, strategy, numParcelas);
    this.#compras.push(compra);
    return compra;
  }

  jaComprou(viagem) {
    for (const compra of this.#compras) {
      if (compra.viagemId === viagem.id && compra.ativa) {
        return true;
      }
    }
    return false;
  }

  // o repository usa para encher a lista com o que veio do banco
  carregarCompras(compras) {
    this.#compras = compras.slice();
  }
}
