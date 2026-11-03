import { config } from '../config/env.js';

// DTOs de SAÍDA: escolhem exatamente o que vai para o front, no formato combinado no API.md.

// 'http://localhost:5002' em desenvolvimento, ou o URL_PUBLICA do .env em produção
export function enderecoPublico(req) {
  if (config.urlPublica) {
    return config.urlPublica;
  }
  return req.protocol + '://' + req.get('host');
}

export function viagemDto(viagem, endereco) {
  const imagens = [];
  for (const imagem of viagem.imagens) {
    imagens.push({ id: imagem.id, url: endereco + imagem.url });
  }
  return {
    id: viagem.id,
    adminId: viagem.adminId,
    titulo: viagem.titulo,
    destino: viagem.destino,
    descricao: viagem.descricao,
    dataSaida: viagem.dataSaida,
    dataRetorno: viagem.dataRetorno,
    valor: viagem.valor,
    vagas: viagem.vagas,
    vagasDisponiveis: viagem.vagasDisponiveis,
    maxParcelas: viagem.maxParcelas,
    imagens: imagens,
  };
}

export function metodoDto(strategy) {
  return { metodo: strategy.metodo, nome: strategy.nome, descricao: strategy.descricao };
}

export function simulacaoDto(strategy, viagem, parcelas) {
  let centavos = 0;
  for (const parcela of parcelas) {
    centavos = centavos + Math.round(parcela.valor * 100);
  }
  return {
    metodo: strategy.metodo,
    numParcelas: parcelas.length,
    maxParcelas: strategy.maxParcelas(viagem),
    total: centavos / 100,
    parcelas: parcelas,
  };
}

export function parcelaDto(parcela) {
  let status = 'aberta';
  if (parcela.paga) {
    status = 'paga';
  }
  return {
    id: parcela.id,
    numero: parcela.numero,
    valor: parcela.valor,
    vencimento: parcela.vencimento,
    status: status,
    pagoEm: parcela.pagoEm,
  };
}

export function compraDto(compra, viagem, endereco) {
  let capa = null;
  if (viagem.imagens.length > 0) {
    capa = endereco + viagem.imagens[0].url;
  }
  const parcelas = [];
  for (const parcela of compra.parcelas) {
    parcelas.push(parcelaDto(parcela));
  }
  return {
    id: compra.id,
    metodo: compra.metodo,
    numParcelas: compra.parcelas.length,
    valorTotal: compra.valorTotal,
    status: compra.status,
    criadoEm: compra.criadoEm,
    viagem: {
      id: viagem.id,
      titulo: viagem.titulo,
      destino: viagem.destino,
      dataSaida: viagem.dataSaida,
      imagem: capa,
    },
    parcelas: parcelas,
  };
}

// uma linha da tela "Passageiros" do admin
export function passageiroCompraDto(compra, passageiro) {
  return {
    compraId: compra.id,
    passageiro: { id: passageiro.id, nome: passageiro.nome, email: passageiro.email },
    metodo: compra.metodo,
    numParcelas: compra.parcelas.length,
    parcelasPagas: compra.parcelasPagas(),
    valorTotal: compra.valorTotal,
    valorPago: compra.valorPago(),
    status: compra.status,
    criadoEm: compra.criadoEm,
  };
}
