import { Usuario } from './Usuario.js';
import { NaoEncontradoErro, RegraNegocioErro } from '../utils/erros.js';
import { Viagem } from './Viagem.js';

export class Admin extends Usuario {
  get papel() {
    return 'Admin';
  }

  publicarViagem(dados) {
    const viagem = new Viagem(this, dados);
    return viagem;
  }

  editarViagem(viagem, dados) {
    this.#garantirQueEhDono(viagem);
    viagem.atualizar(dados);
  }

  autorizarExclusao(viagem) {
    this.#garantirQueEhDono(viagem);
    if (!viagem.podeExcluir) {
      throw new RegraNegocioErro('Não é possível excluir: já existem passagens vendidas.');
    }
  }

  autorizarVerPassageiros(viagem) {
    this.#garantirQueEhDono(viagem);
  }

  ehDono(viagem) {
    return viagem.adminId === this.id;
  }

  #garantirQueEhDono(viagem) {
    if (!this.ehDono(viagem)) {
      throw new NaoEncontradoErro('Viagem não encontrada.');
    }
  }
}
