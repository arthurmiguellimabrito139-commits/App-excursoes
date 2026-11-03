import * as viagemService from '../services/viagemService.js';
import * as imagemStorage from '../services/imagemStorage.js';
import { viagemDto, passageiroCompraDto, enderecoPublico } from '../dtos/respostas.js';

export async function listar(req, res) {
  const somenteAVenda = req.validado.query.disponiveis === 'true';
  const viagens = await viagemService.listar(somenteAVenda);
  const endereco = enderecoPublico(req);

  const lista = [];
  for (const viagem of viagens) {
    lista.push(viagemDto(viagem, endereco));
  }
  res.json(lista);
}

export async function buscar(req, res) {
  const viagem = await viagemService.buscar(req.validado.params.id);
  res.json(viagemDto(viagem, enderecoPublico(req)));
}

export async function criar(req, res) {
  const urls = await imagemStorage.salvarTodas(req.files || []);
  try {
    const viagem = await viagemService.criar(req.usuario.id, req.validado.body, urls);
    res.status(201).json(viagemDto(viagem, enderecoPublico(req)));
  } catch (erro) {
    await imagemStorage.removerTodas(urls);   // deu erro: não deixa foto órfã na pasta
    throw erro;
  }
}

export async function editar(req, res) {
  const dados = req.validado.body;
  const urls = await imagemStorage.salvarTodas(req.files || []);
  let resultado;
  try {
    resultado = await viagemService.editar(req.usuario.id, req.validado.params.id, dados, urls, dados.imagensRemover);
  } catch (erro) {
    await imagemStorage.removerTodas(urls);
    throw erro;
  }
  await imagemStorage.removerTodas(resultado.removidas);   // só apaga depois de salvar no banco
  res.json(viagemDto(resultado.viagem, enderecoPublico(req)));
}

export async function excluir(req, res) {
  const urls = await viagemService.excluir(req.usuario.id, req.validado.params.id);
  await imagemStorage.removerTodas(urls);
  res.status(204).end();
}

export async function passageiros(req, res) {
  const lista = await viagemService.passageiros(req.usuario.id, req.validado.params.id);
  const resposta = [];
  for (const item of lista) {
    resposta.push(passageiroCompraDto(item.compra, item.passageiro));
  }
  res.json(resposta);
}
