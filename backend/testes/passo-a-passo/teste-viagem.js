import { Admin } from '../../src/models/Admin.js';
import { Viagem } from '../../src/models/Viagem.js';
import { somarMeses } from '../../src/utils/datas.js';

const joao = new Admin({ id: 1, nome: 'João', email: 'joao@x.com', senhaHash: 'h' });
const ana = new Admin({ id: 2, nome: 'Ana', email: 'ana@x.com', senhaHash: 'h' });

const dados = {
  titulo: 'Chapada Diamantina',
  destino: 'Lençóis, BA',
  descricao: 'Trilhas e cachoeiras',
  dataSaida: '2026-12-04',
  dataRetorno: '2026-12-08',
  valor: '1890',          // pode vir como texto do formulário
  vagas: 40,
  maxParcelas: 10,
};

const viagem = joao.publicarViagem(dados);
console.log(viagem.titulo, '| R$', viagem.valor, '| vagas:', viagem.vagasDisponiveis, '| à venda:', viagem.estaAVenda());

const versaoAntes = viagem.versao;
joao.editarViagem(viagem, { ...dados, vagas: 30 });
console.log('editou: vagas', viagem.vagas, '| versão mudou:', versaoAntes !== viagem.versao);

viagem.adicionarImagem('/uploads/a.webp');
console.log('imagens:', viagem.imagens.length);
console.log('31/01 + 1 mês =', somarMeses('2026-01-31', 1));

function tentar(descricao, acao) {
  try {
    acao();
    console.log('❌', descricao, '→ deveria ter dado erro');
  } catch (erro) {
    console.log('✅', descricao, '→', erro.message, '(' + erro.status + ')');
  }
}

tentar('Ana edita viagem do João', function () { ana.editarViagem(viagem, dados); });
tentar('volta antes da ida', function () { joao.publicarViagem({ ...dados, dataRetorno: '2026-12-01' }); });
tentar('data que não existe', function () { joao.publicarViagem({ ...dados, dataSaida: '2026-02-31' }); });
tentar('valor zero', function () { joao.publicarViagem({ ...dados, valor: 0 }); });
tentar('13 parcelas', function () { joao.publicarViagem({ ...dados, maxParcelas: 13 }); });
tentar('título curto', function () { joao.publicarViagem({ ...dados, titulo: 'Oi' }); });
tentar('11ª imagem', function () { for (let i = 0; i < 10; i++) { viagem.adicionarImagem('/uploads/' + i + '.webp'); } });
