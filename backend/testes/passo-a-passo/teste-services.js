import { db } from '../../src/config/db.js';
import * as authService from '../../src/services/authService.js';
import * as viagemService from '../../src/services/viagemService.js';
import * as compraService from '../../src/services/compraService.js';

const sufixo = Date.now();

async function tentar(descricao, acao) {
  try {
    await acao();
    console.log('❌', descricao, '→ deveria ter dado erro');
  } catch (erro) {
    console.log('✅', descricao, '→', erro.message, '(' + erro.status + ')');
  }
}

async function testar() {
  // ---------- auth ----------
  await authService.criarAdminInicial();
  const admin = await authService.login(process.env.ADMIN_EMAIL, process.env.ADMIN_SENHA);
  console.log('admin logou:', admin.usuario.nome, '| token começa com', admin.token.slice(0, 20) + '...');

  const maria = await authService.cadastrar('Maria', 'maria' + sufixo + '@x.com', 'senhaDaMaria1');
  console.log('cadastro:', JSON.stringify(maria.usuario));

  await tentar('senha errada', function () { return authService.login(maria.usuario.email, 'errada123'); });
  await tentar('e-mail que não existe', function () { return authService.login('ninguem@x.com', 'qualquer1'); });
  await tentar('senha curta', function () { return authService.cadastrar('Ana', 'ana' + sufixo + '@x.com', '123'); });

  // ---------- viagens ----------
  const dados = {
    titulo: 'Jalapão', destino: 'Tocantins', descricao: 'Fervedouros',
    dataSaida: '2026-12-10', dataRetorno: '2026-12-15', valor: '2400', vagas: '20', maxParcelas: '6',
  };
  const viagem = await viagemService.criar(admin.usuario.id, dados, ['/uploads/j1.webp', '/uploads/j2.webp']);
  console.log('viagem criada: id', viagem.id, '| fotos', viagem.imagens.length);

  const editada = await viagemService.editar(admin.usuario.id, viagem.id, { ...dados, valor: '2500' }, ['/uploads/j3.webp'], [viagem.imagens[0].id]);
  console.log('editada: R$', editada.viagem.valor, '| fotos', editada.viagem.imagens.length, '| apagar arquivo', editada.removidas);

  await tentar('passageiro tenta criar viagem', function () { return viagemService.criar(maria.usuario.id, dados, []); });

  // ---------- compra ----------
  const simulacao = await compraService.simular(viagem.id, 'cartao', 6);
  console.log('simulação cartão 6x: parcela', simulacao.parcelas[0].valor);

  const resultado = await compraService.comprar(maria.usuario.id, viagem.id, 'boleto', 3);
  console.log('Maria comprou: total', resultado.compra.valorTotal, '| vagas restantes', resultado.viagem.vagasDisponiveis);
  await tentar('comprar de novo', function () { return compraService.comprar(maria.usuario.id, viagem.id, 'pix', 1); });

  const primeira = resultado.compra.parcelas[0];
  await tentar('admin paga parcela da Maria', function () { return compraService.pagarParcela(admin.usuario.id, primeira.id); });
  await compraService.pagarParcela(maria.usuario.id, primeira.id);

  const minhas = await compraService.minhas(maria.usuario.id);
  console.log('minhas compras:', minhas.length, '| viagem', minhas[0].viagem.titulo, '| pagas', minhas[0].compra.parcelasPagas());

  const lista = await viagemService.passageiros(admin.usuario.id, viagem.id);
  console.log('passageiros da viagem:', lista[0].passageiro.nome, '| pago R$', lista[0].compra.valorPago());

  await tentar('excluir viagem vendida', function () { return viagemService.excluir(admin.usuario.id, viagem.id); });

  await db.end();
}

testar();
