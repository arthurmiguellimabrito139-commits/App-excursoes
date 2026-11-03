import * as compraService from '../services/compraService.js';
import { metodoDto, simulacaoDto, compraDto, enderecoPublico } from '../dtos/respostas.js';

export function metodos(req, res) {
  const lista = [];
  for (const strategy of compraService.metodos()) {
    lista.push(metodoDto(strategy));
  }
  res.json(lista);
}

export async function simular(req, res) {
  const consulta = req.validado.query;
  const resultado = await compraService.simular(req.validado.params.id, consulta.metodo, consulta.parcelas);
  res.json(simulacaoDto(resultado.strategy, resultado.viagem, resultado.parcelas));
}

// o corpo só tem { metodo, numParcelas }: o valor NUNCA vem do front
export async function comprar(req, res) {
  const corpo = req.validado.body;
  const resultado = await compraService.comprar(req.usuario.id, req.validado.params.id, corpo.metodo, corpo.numParcelas);
  res.status(201).json(compraDto(resultado.compra, resultado.viagem, enderecoPublico(req)));
}
