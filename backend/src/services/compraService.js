import { config } from '../config/env.js';
import { pagamentos } from '../strategies/PagamentoContext.js';
import { RegraNegocioErro, NaoEncontradoErro, NaoAutorizadoErro } from '../utils/erros.js';
import * as compraRepository from '../repositories/compraRepository.js';
import * as viagemRepository from '../repositories/viagemRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import * as viagemService from './viagemService.js';

async function buscarPassageiro(passageiroId) {
  const usuario = await usuarioRepository.buscarPorId(passageiroId);
  if (usuario === null || usuario.papel !== 'Passageiro') {
    throw new NaoAutorizadoErro('Sessão inválida. Faça login de novo.');
  }
  // carrega as compras dele para a regra "não compra a mesma viagem duas vezes"
  const compras = await compraRepository.listarDoPassageiro(usuario.id);
  usuario.carregarCompras(compras);
  return usuario;
}

export function metodos() {
  return pagamentos.todas();
}

// simulação pública: mostra as parcelas sem comprar nada
export async function simular(viagemId, metodo, numParcelas) {
  const viagem = await viagemService.buscar(viagemId);
  const strategy = pagamentos.obter(metodo);
  const parcelas = strategy.calcular(viagem, numParcelas);
  return { strategy: strategy, viagem: viagem, parcelas: parcelas };
}

// O valor NUNCA vem do front: a viagem vem do banco e a strategy calcula.
export async function comprar(passageiroId, viagemId, metodo, numParcelas) {
  const passageiro = await buscarPassageiro(passageiroId);
  const viagem = await viagemService.buscar(viagemId);
  const versaoAntiga = viagem.versao;

  const compra = passageiro.comprar(viagem, pagamentos.obter(metodo), numParcelas);
  await compraRepository.inserir(compra, viagem, versaoAntiga);   // 409 se perdeu a última vaga
  return { compra: compra, viagem: viagem };
}

// lista [{ compra, viagem }] do passageiro logado
export async function minhas(passageiroId) {
  const compras = await compraRepository.listarDoPassageiro(passageiroId);
  const ids = [];
  for (const compra of compras) {
    if (!ids.includes(compra.viagemId)) {
      ids.push(compra.viagemId);
    }
  }
  const viagens = await viagemRepository.buscarVarias(ids);

  const resultado = [];
  for (const compra of compras) {
    for (const viagem of viagens) {
      if (viagem.id === compra.viagemId) {
        resultado.push({ compra: compra, viagem: viagem });
      }
    }
  }
  return resultado;
}

export async function pagarParcela(passageiroId, parcelaId) {
  if (!config.pagamentoSimulado) {
    throw new RegraNegocioErro('Pagamento online ainda não disponível.');
  }

  const compra = await compraRepository.buscarPorParcela(parcelaId);
  // parcela de OUTRA pessoa responde igual a "não existe" (404)
  if (compra === null || !compra.pertenceA(passageiroId)) {
    throw new NaoEncontradoErro('Parcela não encontrada.');
  }

  const parcela = compra.pagarParcela(parcelaId);   // confere a ordem e se já foi paga
  await compraRepository.salvarPagamento(compra, parcela);
  return parcela;
}
