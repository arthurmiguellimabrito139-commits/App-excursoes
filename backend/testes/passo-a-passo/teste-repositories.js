import { db } from '../../src/config/db.js';
import { Admin } from '../../src/models/Admin.js';
import { Passageiro } from '../../src/models/Passageiro.js';
import { pagamentos } from '../../src/strategies/PagamentoContext.js';
import * as usuarioRepository from '../../src/repositories/usuarioRepository.js';
import * as viagemRepository from '../../src/repositories/viagemRepository.js';
import * as compraRepository from '../../src/repositories/compraRepository.js';

const sufixo = Date.now();   // e-mails diferentes a cada vez que rodar

async function testar() {
  // ---------- usuários ----------
  const joao = new Admin({ nome: 'João', email: 'joao' + sufixo + '@x.com', senhaHash: 'hash' });
  await usuarioRepository.inserir(joao);
  const maria = new Passageiro({ nome: 'Maria', email: 'maria' + sufixo + '@x.com', senhaHash: 'hash' });
  await usuarioRepository.inserir(maria);
  const pedro = new Passageiro({ nome: 'Pedro', email: 'pedro' + sufixo + '@x.com', senhaHash: 'hash' });
  await usuarioRepository.inserir(pedro);
  console.log('usuários salvos com ids', joao.id, maria.id, pedro.id);

  const lida = await usuarioRepository.buscarPorEmail('MARIA' + sufixo + '@X.COM');
  console.log('buscou Maria pelo e-mail:', lida.nome, '| classe:', lida.constructor.name);

  try {
    await usuarioRepository.inserir(new Passageiro({ nome: 'Outra', email: maria.email, senhaHash: 'h' }));
    console.log('❌ deveria barrar e-mail repetido');
  } catch (erro) {
    console.log('✅ e-mail repetido →', erro.message);
  }

  // ---------- viagem ----------
  const viagem = joao.publicarViagem({
    titulo: 'Chapada Diamantina', destino: 'Lençóis, BA', descricao: 'Trilhas',
    dataSaida: '2026-12-04', dataRetorno: '2026-12-08', valor: 1890, vagas: 1, maxParcelas: 10,
  });
  viagem.adicionarImagem('/uploads/a.webp');
  viagem.adicionarImagem('/uploads/b.webp');
  await viagemRepository.inserir(viagem);
  console.log('viagem salva com id', viagem.id, '| imagens', viagem.imagens.length);

  // ---------- a última vaga: Maria e Pedro compram AO MESMO TEMPO ----------
  async function comprarAgora(passageiro) {
    const viagemDoBanco = await viagemRepository.buscar(viagem.id);   // cada um lê a sua cópia
    const versaoAntiga = viagemDoBanco.versao;
    const compra = passageiro.comprar(viagemDoBanco, pagamentos.obter('cartao'), 3);
    await compraRepository.inserir(compra, viagemDoBanco, versaoAntiga);
    return passageiro.nome + ' comprou';
  }
  const resultados = await Promise.allSettled([comprarAgora(maria), comprarAgora(pedro)]);
  for (const resultado of resultados) {
    if (resultado.status === 'fulfilled') {
      console.log('✅', resultado.value);
    } else {
      console.log('⛔', resultado.reason.message);
    }
  }

  const depois = await viagemRepository.buscar(viagem.id);
  console.log('vagas vendidas no banco:', depois.vagasVendidas, 'de', depois.vagas);

  // ---------- pagar a 1ª parcela de quem comprou ----------
  const compras = await compraRepository.listarDaViagem(viagem.id);
  const primeira = compras[0].parcelas[0];
  const compra = await compraRepository.buscarPorParcela(primeira.id);
  const paga = compra.pagarParcela(primeira.id);
  await compraRepository.salvarPagamento(compra, paga);
  const conferida = await compraRepository.buscarPorParcela(primeira.id);
  console.log('parcelas pagas:', conferida.parcelasPagas(), 'de', conferida.parcelas.length, '| pago R$', conferida.valorPago(), '| em', conferida.parcelas[0].pagoEm);

  // ---------- excluir viagem com compra ----------
  try {
    await viagemRepository.excluir(depois);
    console.log('❌ deveria barrar a exclusão');
  } catch (erro) {
    console.log('✅ excluir viagem vendida →', erro.message);
  }

  await db.end();
}

testar();
