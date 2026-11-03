import { Usuario } from '../../src/models/Usuario.js';
import { Passageiro } from '../../src/models/Passageiro.js';

const maria = new Passageiro({ nome: '  Maria  ', email: 'MARIA@X.COM', senhaHash: '$2b$12$hashFalso' });
console.log('papel:', maria.papel);
console.log('json :', JSON.stringify(maria));

function tentar(descricao, acao) {
  try {
    acao();
    console.log('❌', descricao, '→ deveria ter dado erro');
  } catch (erro) {
    console.log('✅', descricao, '→', erro.message);
  }
}

tentar('new Usuario', function () { new Usuario({ nome: 'Ana', email: 'a@a.com', senhaHash: 'x' }); });
tentar('nome curto', function () { new Passageiro({ nome: 'A', email: 'a@a.com', senhaHash: 'x' }); });
tentar('e-mail ruim', function () { new Passageiro({ nome: 'Ana', email: 'ana.com', senhaHash: 'x' }); });
tentar('mudar o hash por fora', function () { maria.senhaHash = 'hackeado'; if (maria.senhaHash === 'hackeado') { return; } throw new Error('não mudou (getter sem setter)'); });
