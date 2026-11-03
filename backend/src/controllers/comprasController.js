import * as compraService from '../services/compraService.js';
import { compraDto, parcelaDto, enderecoPublico } from '../dtos/respostas.js';

export async function minhas(req, res) {
  const lista = await compraService.minhas(req.usuario.id);
  const endereco = enderecoPublico(req);

  const resposta = [];
  for (const item of lista) {
    resposta.push(compraDto(item.compra, item.viagem, endereco));
  }
  res.json(resposta);
}

// pagamento SIMULADO (portfólio): liga/desliga com PAGAMENTO_SIMULADO no .env
export async function pagarParcela(req, res) {
  const parcela = await compraService.pagarParcela(req.usuario.id, req.validado.params.id);
  res.json(parcelaDto(parcela));
}
