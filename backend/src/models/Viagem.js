import { randomUUID } from 'node:crypto';
import { RegraNegocioErro } from '../utils/erros.js';
import { hoje, dataValida } from '../utils/datas.js';
import { ViagemImagem } from './ViagemImagem.js';
import { Compra } from './Compra.js';

export class Viagem {
  static MAX_IMAGENS = 10;

  #id = null;
  #adminId;
  #titulo;
  #destino;
  #descricao;
  #dataSaida;
  #dataRetorno;
  #valor;
  #vagas;
  #maxParcelas;
  #versao;          // muda a cada alteração: se duas compras salvarem juntas, uma é recusada
  #imagens = [];
  #compras = [];

  // quem cria viagem nova é o admin.publicarViagem(dados)
  constructor(admin, dados) {
    this.#adminId = admin.id;
    this.atualizar(dados);
  }

  // o repository usa para montar a viagem com uma linha do banco
  static doBanco(linha) {
    const viagem = new Viagem({ id: linha.AdminId }, {
      titulo: linha.Titulo,
      destino: linha.Destino,
      descricao: linha.Descricao,
      dataSaida: linha.DataSaida,
      dataRetorno: linha.DataRetorno,
      valor: linha.Valor,
      vagas: linha.Vagas,
      maxParcelas: linha.MaxParcelas,
    });
    viagem.#id = linha.Id;
    viagem.#versao = linha.Versao;   // a versão que está no banco, não uma nova
    return viagem;
  }

  // ---------- getters ----------
  get id() { return this.#id; }
  get adminId() { return this.#adminId; }
  get titulo() { return this.#titulo; }
  get destino() { return this.#destino; }
  get descricao() { return this.#descricao; }
  get dataSaida() { return this.#dataSaida; }
  get dataRetorno() { return this.#dataRetorno; }
  get valor() { return this.#valor; }
  get vagas() { return this.#vagas; }
  get maxParcelas() { return this.#maxParcelas; }
  get versao() { return this.#versao; }
  get imagens() { return this.#imagens.slice(); }
  get compras() { return this.#compras.slice(); }

  definirId(id) {
    if (this.#id !== null) {
      throw new Error('O id já foi definido.');
    }
    this.#id = id;
  }

  // ---------- criar / editar ----------
  atualizar(dados) {
    const titulo = String(dados.titulo || '').trim();
    const destino = String(dados.destino || '').trim();
    const descricao = String(dados.descricao || '').trim();
    const valor = Number(dados.valor);
    const vagas = Number(dados.vagas);
    const maxParcelas = Number(dados.maxParcelas);

    if (titulo.length < 3 || titulo.length > 150) {
      throw new RegraNegocioErro('O título deve ter entre 3 e 150 caracteres.');
    }
    if (destino.length < 2 || destino.length > 150) {
      throw new RegraNegocioErro('Informe o destino.');
    }
    if (descricao.length > 4000) {
      throw new RegraNegocioErro('Descrição muito longa (máximo 4000 caracteres).');
    }
    if (!dataValida(dados.dataSaida) || !dataValida(dados.dataRetorno)) {
      throw new RegraNegocioErro('Datas inválidas (use AAAA-MM-DD).');
    }
    if (dados.dataRetorno < dados.dataSaida) {
      throw new RegraNegocioErro('A volta não pode ser antes da ida.');
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new RegraNegocioErro('O valor deve ser maior que zero.');
    }
    if (!Number.isInteger(maxParcelas) || maxParcelas < 1 || maxParcelas > 12) {
      throw new RegraNegocioErro('Parcelas máximas entre 1 e 12.');
    }
    if (!Number.isInteger(vagas) || vagas < 1) {
      throw new RegraNegocioErro('Informe pelo menos 1 vaga.');
    }
    if (vagas < this.vagasVendidas) {
      throw new RegraNegocioErro('Já existem ' + this.vagasVendidas + ' passagens vendidas; as vagas não podem ser menores que isso.');
    }

    // só chega aqui se TUDO passou: a viagem nunca fica meio atualizada
    this.#titulo = titulo;
    this.#destino = destino;
    this.#descricao = descricao;
    this.#dataSaida = dados.dataSaida;
    this.#dataRetorno = dados.dataRetorno;
    this.#valor = Math.round(valor * 100) / 100;
    this.#vagas = vagas;
    this.#maxParcelas = maxParcelas;
    this.#versao = randomUUID();
  }

  // ---------- imagens ----------
  adicionarImagem(url) {
    if (this.#imagens.length >= Viagem.MAX_IMAGENS) {
      throw new RegraNegocioErro('Máximo de ' + Viagem.MAX_IMAGENS + ' imagens por viagem.');
    }
    this.#imagens.push(new ViagemImagem(url));
  }

  // devolve o endereço da imagem removida (para apagar o arquivo) ou null se não existia
  removerImagem(imagemId) {
    for (let i = 0; i < this.#imagens.length; i++) {
      if (this.#imagens[i].id === imagemId) {
        const url = this.#imagens[i].url;
        this.#imagens.splice(i, 1);
        return url;
      }
    }
    return null;
  }

  // ---------- vagas e venda ----------
  get vagasVendidas() {
    let quantidade = 0;
    for (const compra of this.#compras) {
      if (compra.ativa) {
        quantidade++;
      }
    }
    return quantidade;
  }

  get vagasDisponiveis() {
    return this.#vagas - this.vagasVendidas;
  }

  get podeExcluir() {
    return this.vagasVendidas === 0;
  }

  estaAVenda() {
    return this.vagasDisponiveis > 0 && this.#dataSaida >= hoje();
  }

  // quem decide se dá para vender é a viagem; quem calcula as parcelas é a strategy
  vender(passageiro, strategy, numParcelas) {
    if (this.vagasDisponiveis <= 0) {
      throw new RegraNegocioErro('Viagem esgotada.');
    }
    if (this.#dataSaida < hoje()) {
      throw new RegraNegocioErro('Esta viagem já saiu.');
    }

    const parcelas = strategy.calcular(this, numParcelas);
    const compra = new Compra(passageiro, this, strategy.metodo, parcelas);
    this.#compras.push(compra);
    this.#versao = randomUUID();
    return compra;
  }

  // ---------- carregamento vindo do banco ----------
  carregarImagens(imagens) {
    this.#imagens = imagens.slice();
  }

  carregarCompras(compras) {
    this.#compras = compras.slice();
  }
}
