import { Admin } from '../../src/models/Admin.js';
import { Passageiro } from '../../src/models/Passageiro.js';
import { pagamentos } from '../../src/strategies/PagamentoContext.js';

const joao = new Admin({ id: 1, nome: 'João', email: 'joao@x.com', senhaHash: 'h' });
const maria = new Passageiro({ id: 7, nome: 'Maria', email: 'maria@x.com', senhaHash: 'h' });
const pedro = new Passageiro({ id: 8, nome: 'Pedro', email: 'pedro@x.com', senhaHash: 'h' });

const viagem = joao.publicarViagem({
  titulo: 'Chapada Diamantina', destino: 'Lençóis, BA', descricao: '',
  dataSaida: '2026-12-04', dataRetorno: '2026-12-08',
  valor: 1890, vagas: 1, maxParcelas: 10,
});
viagem.definirId(1);

// simulação: o mesmo "calcular" para todas, cada uma com a sua regra
for (const strategy of pagamentos.todas()) {
  const max = strategy.maxParcelas(viagem);
  const parcelas = strategy.calcular(viagem, max);
  console.log(strategy.nome + ' em ' + max + 'x → parcela R$ ' + parcelas[0].valor);
}
const seis = pagamentos.obter('cartao').calcular(viagem, 6);
console.log('Cartão 6x → parcela', seis[0].valor, '| última', seis[5].valor, '| vence de', seis[0].vencimento, 'a', seis[5].vencimento);

// compra de verdade
const compra = maria.comprar(viagem, pagamentos.obter('cartao'), 3);
console.log('Maria comprou: total', compra.valorTotal, '| status', compra.status, '| vagas restantes', viagem.vagasDisponiveis);

// no banco as parcelas ganham id; aqui damos na mão para testar o pagamento
let id = 10;
for (const parcela of compra.parcelas) {
  parcela.definirId(id);
  id++;
}

function tentar(descricao, acao) {
  try {
    acao();
    console.log('❌', descricao, '→ deveria ter dado erro');
  } catch (erro) {
    console.log('✅', descricao, '→', erro.message, '(' + erro.status + ')');
  }
}

tentar('pagar a 2ª antes da 1ª', function () { compra.pagarParcela(11); });
compra.pagarParcela(10);
compra.pagarParcela(11);
compra.pagarParcela(12);
console.log('pagou as 3: status', compra.status, '| pago R$', compra.valorPago());

tentar('pagar de novo', function () { compra.pagarParcela(12); });
tentar('Maria compra de novo', function () { maria.comprar(viagem, pagamentos.obter('pix'), 1); });
tentar('Pedro compra (esgotada)', function () { pedro.comprar(viagem, pagamentos.obter('pix'), 1); });
tentar('Pix em 2x', function () { pagamentos.obter('pix').calcular(viagem, 2); });
tentar('Boleto em 11x', function () { pagamentos.obter('boleto').calcular(viagem, 11); });
tentar('método inventado', function () { pagamentos.obter('bitcoin'); });
tentar('cancelar compra quitada', function () { compra.cancelar(); });
