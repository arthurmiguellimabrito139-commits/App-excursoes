import { NaoEncontradoErro, NaoAutorizadoErro } from '../utils/erros.js';
import * as viagemRepository from '../repositories/viagemRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import * as compraRepository from '../repositories/compraRepository.js';

// O id vem do TOKEN (nunca do corpo da requisição). Mesmo assim confere no banco:
// se o admin foi apagado depois de fazer login, o token antigo não serve mais.
async function buscarAdmin(adminId) {
  const usuario = await usuarioRepository.buscarPorId(adminId);
  if (usuario === null || usuario.papel !== 'Admin') {
    throw new NaoAutorizadoErro('Sessão inválida. Faça login de novo.');
  }
  return usuario;
}

export async function listar(somenteAVenda) {
  const viagens = await viagemRepository.listar();
  if (!somenteAVenda) {
    return viagens;
  }
  const aVenda = [];
  for (const viagem of viagens) {
    if (viagem.estaAVenda()) {
      aVenda.push(viagem);
    }
  }
  return aVenda;
}

export async function buscar(id) {
  const viagem = await viagemRepository.buscar(id);
  if (viagem === null) {
    throw new NaoEncontradoErro('Viagem não encontrada.');
  }
  return viagem;
}

export async function criar(adminId, dados, urlsImagens) {
  const admin = await buscarAdmin(adminId);
  const viagem = admin.publicarViagem(dados);
  for (const url of urlsImagens) {
    viagem.adicionarImagem(url);
  }
  await viagemRepository.inserir(viagem);
  return viagem;
}

// devolve também as fotos removidas, para o controller apagar os arquivos
export async function editar(adminId, viagemId, dados, urlsNovas, idsRemover) {
  const admin = await buscarAdmin(adminId);
  const viagem = await buscar(viagemId);
  const versaoAntiga = viagem.versao;

  admin.editarViagem(viagem, dados);   // confere o dono e todas as regras

  const removidas = [];
  for (const id of idsRemover) {
    const url = viagem.removerImagem(id);
    if (url !== null) {
      removidas.push(url);
    }
  }
  for (const url of urlsNovas) {
    viagem.adicionarImagem(url);
  }

  await viagemRepository.atualizar(viagem, versaoAntiga);
  return { viagem: viagem, removidas: removidas };
}

// devolve as fotos da viagem apagada, para o controller apagar os arquivos
export async function excluir(adminId, viagemId) {
  const admin = await buscarAdmin(adminId);
  const viagem = await buscar(viagemId);
  admin.autorizarExclusao(viagem);
  await viagemRepository.excluir(viagem);

  const urls = [];
  for (const imagem of viagem.imagens) {
    urls.push(imagem.url);
  }
  return urls;
}

// lista [{ compra, passageiro }] — só o admin dono da viagem vê
export async function passageiros(adminId, viagemId) {
  const admin = await buscarAdmin(adminId);
  const viagem = await buscar(viagemId);
  admin.autorizarVerPassageiros(viagem);

  const compras = await compraRepository.listarDaViagem(viagem.id);
  const ids = [];
  for (const compra of compras) {
    ids.push(compra.passageiroId);
  }
  const usuarios = await usuarioRepository.buscarVarios(ids);

  const resultado = [];
  for (const compra of compras) {
    for (const usuario of usuarios) {
      if (usuario.id === compra.passageiroId) {
        resultado.push({ compra: compra, passageiro: usuario });
      }
    }
  }
  return resultado;
}
