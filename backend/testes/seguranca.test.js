// Testes de segurança — um bloco para cada item do checklist (veja SEGURANCA.md).
// Sobem a API de verdade numa porta livre e atacam como um estranho faria.
// Rodar: npm test   (o MySQL precisa estar ligado e o .env preenchido; a API não precisa estar rodando)

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { db } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { criarAdminInicial } from '../src/services/authService.js';
import { prepararPasta } from '../src/services/imagemStorage.js';
import { limiteLogin } from '../src/middlewares/limites.js';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));     // pasta excursoes-js
const BACKEND = fileURLToPath(new URL('..', import.meta.url));
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const sufixo = Date.now();

let servidor;
let API;
let BASE;
const contas = {};   // tokens e dados de admin, maria e pedro
let viagem;          // viagem criada pelo admin
let compraMaria;     // compra da maria nessa viagem

// ---------- ajudantes ----------
function liberarLogin() {
  limiteLogin.resetKey('127.0.0.1');   // cada teste de login começa com o contador zerado
}

async function chamar(metodo, caminho, opcoes) {
  const op = opcoes || {};
  const headers = op.headers || {};
  let corpo = op.corpo;
  if (op.token) {
    headers.Authorization = 'Bearer ' + op.token;
  }
  if (corpo !== undefined && !(corpo instanceof FormData) && typeof corpo !== 'string') {
    headers['Content-Type'] = 'application/json';
    corpo = JSON.stringify(corpo);
  } else if (typeof corpo === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  const url = caminho.startsWith('http') ? caminho : API + caminho;
  const resposta = await fetch(url, { method: metodo, headers: headers, body: corpo });
  const texto = await resposta.text();
  let dados = null;
  try {
    dados = JSON.parse(texto);
  } catch (erro) {
    // não era JSON
  }
  return { status: resposta.status, dados: dados, texto: texto, headers: resposta.headers };
}

function formularioViagem(mudar) {
  const form = new FormData();
  form.append('titulo', 'Bonito');
  form.append('destino', 'Bonito, MS');
  form.append('descricao', 'Flutuação nos rios');
  form.append('dataSaida', '2026-12-20');
  form.append('dataRetorno', '2026-12-24');
  form.append('valor', '3200.50');
  form.append('vagas', '5');
  form.append('maxParcelas', '10');
  if (mudar) {
    mudar(form);
  }
  return form;
}

// todos os arquivos de texto do projeto que vão para o GitHub
function arquivosDoProjeto(pasta, lista) {
  const ignorar = ['node_modules', '.git', 'dist', 'uploads'];
  for (const nome of fs.readdirSync(pasta)) {
    if (ignorar.includes(nome) || nome === '.env') {
      continue;
    }
    const completo = path.join(pasta, nome);
    if (fs.statSync(completo).isDirectory()) {
      arquivosDoProjeto(completo, lista);
    } else if (/\.(js|jsx|json|md|sql|html|css|example|gitignore)$/.test(nome) || nome.startsWith('.env.')) {
      lista.push(completo);
    }
  }
  return lista;
}

// ---------- preparação ----------
before(async function () {
  await prepararPasta();
  await criarAdminInicial();
  await new Promise(function (pronto) {
    servidor = app.listen(0, '127.0.0.1', pronto);
  });
  BASE = 'http://127.0.0.1:' + servidor.address().port;
  API = BASE + '/api';

  liberarLogin();
  const admin = await chamar('POST', '/auth/login', { corpo: { email: config.admin.email, senha: config.admin.senha } });
  assert.equal(admin.status, 200, 'O admin do .env precisa conseguir logar (confira ADMIN_EMAIL e ADMIN_SENHA)');
  contas.admin = admin.dados;

  const maria = await chamar('POST', '/auth/cadastro', { corpo: { nome: 'Maria', email: 'maria' + sufixo + '@teste.com', senha: 'senhaDaMaria1' } });
  contas.maria = maria.dados;
  const pedro = await chamar('POST', '/auth/cadastro', { corpo: { nome: 'Pedro', email: 'pedro' + sufixo + '@teste.com', senha: 'senhaDoPedro1' } });
  contas.pedro = pedro.dados;

  const criada = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(function (form) {
    form.append('imagens', new Blob([PNG]), 'foto.png');
  }) });
  viagem = criada.dados;

  const compra = await chamar('POST', '/viagens/' + viagem.id + '/comprar', { token: contas.maria.token, corpo: { metodo: 'boleto', numParcelas: 2 } });
  compraMaria = compra.dados;
});

after(async function () {
  servidor.close();
  await db.end();
});

// ============ 01 · Chave de API protegida ============
test('01 · nenhum segredo do .env aparece no código do front nem do back', function () {
  const segredos = [config.jwt.segredo, config.banco.senha, config.admin.senha];
  for (const arquivo of arquivosDoProjeto(RAIZ, [])) {
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    for (const segredo of segredos) {
      if (segredo && segredo.length >= 6) {
        assert.ok(!conteudo.includes(segredo), 'Segredo do .env encontrado em ' + arquivo);
      }
    }
  }
});

test('01 · o front só tem variáveis públicas (VITE_) e nenhuma chave', function () {
  const exemplo = fs.readFileSync(path.join(RAIZ, 'frontend', '.env.example'), 'utf8');
  assert.doesNotMatch(exemplo, /SECRET|SENHA|PASSWORD|KEY=/i);
});

// ============ 02 · .env nunca exposto ============
test('02 · .env está no .gitignore e o .env.example vem sem valores secretos', function () {
  const gitignore = fs.readFileSync(path.join(BACKEND, '.gitignore'), 'utf8');
  assert.match(gitignore, /^\.env$/m);
  const exemplo = fs.readFileSync(path.join(BACKEND, '.env.example'), 'utf8');
  assert.match(exemplo, /^JWT_SECRET=$/m);
  assert.match(exemplo, /^ADMIN_SENHA=$/m);
});

test('02 · ninguém baixa o .env pela internet', async function () {
  const tentativas = ['/.env', '/uploads/.env', '/uploads/../.env', '/uploads/..%2f.env', '/uploads/%2e%2e/%2e%2e/.env', '/api/../.env'];
  for (const caminho of tentativas) {
    const resposta = await chamar('GET', BASE + caminho);
    assert.notEqual(resposta.status, 200, caminho);
    assert.ok(!resposta.texto.includes('JWT_SECRET'), caminho);
  }
});

// ============ 03 · Nada de senha no código ============
test('03 · o código não tem senha nem chave escrita direto', function () {
  const padrao = /(senha|password|secret|segredo)\s*[:=]\s*['"][^'"\s]{8,}['"]/i;
  const pastas = [path.join(BACKEND, 'src'), path.join(RAIZ, 'frontend', 'src')];
  for (const pasta of pastas) {
    for (const arquivo of arquivosDoProjeto(pasta, [])) {
      if (arquivo.includes('mocks')) {
        continue;   // dados falsos do modo simulado, não são senhas reais
      }
      const conteudo = fs.readFileSync(arquivo, 'utf8');
      assert.doesNotMatch(conteudo, padrao, arquivo);
    }
  }
});

// ============ 04 · Login de verdade ============
test('04 · a senha é guardada só como hash bcrypt', async function () {
  const [linhas] = await db.query('SELECT SenhaHash FROM Usuarios WHERE Email = ?', [contas.maria.usuario.email]);
  assert.match(linhas[0].SenhaHash, /^\$2[aby]\$12\$/);
  assert.ok(!linhas[0].SenhaHash.includes('senhaDaMaria1'));
});

test('04 · login errado não diz se o e-mail existe', async function () {
  liberarLogin();
  const senhaErrada = await chamar('POST', '/auth/login', { corpo: { email: contas.maria.usuario.email, senha: 'errada123' } });
  const naoExiste = await chamar('POST', '/auth/login', { corpo: { email: 'ninguem' + sufixo + '@teste.com', senha: 'errada123' } });
  assert.equal(senhaErrada.status, 401);
  assert.equal(naoExiste.status, 401);
  assert.equal(senhaErrada.dados.erro, naoExiste.dados.erro);
});

test('04 · token falsificado, vencido ou "alg: none" não entra', async function () {
  const adulterado = contas.maria.token.slice(0, -4) + 'abcd';
  const outraChave = jwt.sign({ id: 1, papel: 'Admin' }, 'chave-que-o-atacante-inventou-123456789', { algorithm: 'HS256', issuer: 'excursoes-api', audience: 'excursoes-front' });
  const vencido = jwt.sign({ id: contas.maria.usuario.id, papel: 'Passageiro', exp: Math.floor(Date.now() / 1000) - 60 }, config.jwt.segredo, { algorithm: 'HS256', issuer: 'excursoes-api', audience: 'excursoes-front' });
  const semAssinatura = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"id":1,"papel":"Admin"}').toString('base64url') + '.';

  for (const token of [adulterado, outraChave, vencido, semAssinatura, 'abc']) {
    const resposta = await chamar('GET', '/compras/minhas', { token: token });
    assert.equal(resposta.status, 401);
  }
});

// ============ 05 · Permissão no servidor ============
test('05 · cada rota confere o papel no servidor', async function () {
  assert.equal((await chamar('POST', '/viagens', { corpo: formularioViagem() })).status, 401);
  assert.equal((await chamar('POST', '/viagens', { token: contas.maria.token, corpo: formularioViagem() })).status, 403);
  assert.equal((await chamar('DELETE', '/viagens/' + viagem.id, { token: contas.maria.token })).status, 403);
  assert.equal((await chamar('GET', '/viagens/' + viagem.id + '/passageiros', { token: contas.pedro.token })).status, 403);
  assert.equal((await chamar('POST', '/viagens/' + viagem.id + '/comprar', { token: contas.admin.token, corpo: { metodo: 'pix', numParcelas: 1 } })).status, 403);
  assert.equal((await chamar('GET', '/compras/minhas', { token: contas.admin.token })).status, 403);
});

// ============ 06 · Não confia no ID da tela ============
test('06 · cadastro mandando "tipo: Admin" continua passageiro', async function () {
  liberarLogin();
  const resposta = await chamar('POST', '/auth/cadastro', { corpo: { nome: 'Esperto', email: 'esperto' + sufixo + '@teste.com', senha: 'senhaEsperta1', tipo: 'Admin', papel: 'Admin', id: 1 } });
  assert.equal(resposta.status, 201);
  assert.equal(resposta.dados.usuario.tipo, 'Passageiro');
});

test('06 · compra mandando valor, passageiroId e status é ignorada nesses campos', async function () {
  const resposta = await chamar('POST', '/viagens/' + viagem.id + '/comprar', {
    token: contas.pedro.token,
    corpo: { metodo: 'boleto', numParcelas: 1, valor: 1, valorTotal: 1, passageiroId: contas.maria.usuario.id, status: 'pago' },
  });
  assert.equal(resposta.status, 201);
  assert.equal(resposta.dados.valorTotal, 3200.5);
  assert.equal(resposta.dados.status, 'pendente');
  const [linhas] = await db.query('SELECT PassageiroId FROM Compras WHERE Id = ?', [resposta.dados.id]);
  assert.equal(linhas[0].PassageiroId, contas.pedro.usuario.id);
});

// ============ 07 · Cada um só vê o seu ============
test('07 · passageiro não vê nem paga a compra de outro', async function () {
  const minhasDoPedro = await chamar('GET', '/compras/minhas', { token: contas.pedro.token });
  for (const compra of minhasDoPedro.dados) {
    assert.notEqual(compra.id, compraMaria.id);
  }
  const pagar = await chamar('POST', '/parcelas/' + compraMaria.parcelas[0].id + '/pagar', { token: contas.pedro.token });
  assert.equal(pagar.status, 404);
});

test('07 · admin só mexe nas viagens dele (outra viagem responde 404)', async function () {
  // cria um segundo admin direto no banco, só para o teste
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash('senhaOutroAdmin1', 4);
  const [resultado] = await db.query("INSERT INTO Usuarios (Tipo, Nome, Email, SenhaHash, CriadoEm) VALUES ('Admin', 'Outro', ?, ?, NOW())", ['outro' + sufixo + '@teste.com', hash]);
  liberarLogin();
  const outro = await chamar('POST', '/auth/login', { corpo: { email: 'outro' + sufixo + '@teste.com', senha: 'senhaOutroAdmin1' } });

  assert.equal((await chamar('PUT', '/viagens/' + viagem.id, { token: outro.dados.token, corpo: formularioViagem() })).status, 404);
  assert.equal((await chamar('DELETE', '/viagens/' + viagem.id, { token: outro.dados.token })).status, 404);
  assert.equal((await chamar('GET', '/viagens/' + viagem.id + '/passageiros', { token: outro.dados.token })).status, 404);
  await db.query('DELETE FROM Usuarios WHERE Id = ?', [resultado.insertId]);
});

// ============ 08 · Banco travado ============
test('08 · o usuário do banco da API não pode apagar nem alterar tabelas', async function () {
  const [linhas] = await db.query('SHOW GRANTS FOR CURRENT_USER()');
  let permissoes = '';
  for (const linha of linhas) {
    permissoes = permissoes + Object.values(linha)[0] + '\n';
  }
  assert.doesNotMatch(permissoes, /ALL PRIVILEGES|DROP|ALTER|CREATE|GRANT OPTION|SUPER/,
    'A API está usando um usuário com poder demais. Crie o excursoes_app (veja README).\n' + permissoes);
});

// ============ 09 · Storage protegido ============
test('09 · a pasta de fotos não lista arquivos e os nomes são sorteados', async function () {
  assert.notEqual((await chamar('GET', BASE + '/uploads/')).status, 200);
  const nome = path.basename(viagem.imagens[0].url);
  assert.match(nome, /^[0-9a-f-]{36}\.png$/);
  assert.ok(!nome.includes('foto'));
});

// ============ 10 · Admin protegido ============
test('10 · não existe caminho público para virar admin', async function () {
  const [linhas] = await db.query("SELECT COUNT(*) AS total FROM Usuarios WHERE Tipo = 'Admin' AND Email LIKE ?", ['%' + sufixo + '%']);
  assert.equal(linhas[0].total, 0);   // nenhum cadastro deste teste virou admin
  assert.ok(config.admin.senha.length >= 12, 'ADMIN_SENHA precisa ter 12+ caracteres');
});

// ============ 11 · Debug desligado ============
test('11 · a API não conta qual tecnologia usa', async function () {
  const resposta = await chamar('GET', '/viagens');
  assert.equal(resposta.headers.get('x-powered-by'), null);
});

// ============ 12 · Erro sem detalhe ============
test('12 · erros não mostram stack, SQL nem caminho de arquivo', async function () {
  const respostas = [
    await chamar('POST', '/viagens/' + viagem.id + '/comprar', { token: contas.maria.token, corpo: '{"metodo": quebrado' }),
    await chamar('GET', '/viagens/1%27%20OR%201=1'),
    await chamar('GET', '/rota/que/nao/existe'),
  ];
  for (const resposta of respostas) {
    assert.ok(resposta.dados && typeof resposta.dados.erro === 'string');
    assert.doesNotMatch(resposta.texto, /at \w+ \(|node_modules|SELECT|mysql|\.js:\d+|stack/i);
  }
});

// ============ 13 · Valida tudo no servidor ============
test('13 · dados inválidos são recusados com 400 e mensagem clara', async function () {
  const casos = [
    function (form) { form.set('valor', '-5'); },
    function (form) { form.set('valor', 'abc'); },
    function (form) { form.set('vagas', '0'); },
    function (form) { form.set('maxParcelas', '13'); },
    function (form) { form.set('dataSaida', '2026-02-31'); },
    function (form) { form.set('dataRetorno', '2026-12-01'); },
    function (form) { form.set('titulo', 'a'.repeat(151)); },
    function (form) { form.delete('titulo'); },
  ];
  for (const mudar of casos) {
    const resposta = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(mudar) });
    assert.equal(resposta.status, 400);
    assert.ok(resposta.dados.erro.length > 0);
  }
  const parcelas = await chamar('POST', '/viagens/' + viagem.id + '/comprar', { token: contas.maria.token, corpo: { metodo: 'pix', numParcelas: 5 } });
  assert.equal(parcelas.status, 400);
});

// ============ 14 · Limpa o que o usuário manda ============
test('14 · espaços somem, e-mail vira minúsculo e HTML é guardado como texto', async function () {
  liberarLogin();
  const cadastro = await chamar('POST', '/auth/cadastro', { corpo: { nome: '   Ana   ', email: '  ANA' + sufixo + '@TESTE.COM ', senha: 'senhaDaAna12' } });
  assert.equal(cadastro.dados.usuario.nome, 'Ana');
  assert.equal(cadastro.dados.usuario.email, 'ana' + sufixo + '@teste.com');

  const xss = '<img src=x onerror=alert(1)>';
  const criada = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(function (form) { form.set('titulo', xss); }) });
  assert.equal(criada.headers.get('content-type').startsWith('application/json'), true);
  assert.equal(criada.dados.titulo, xss);   // volta como TEXTO; o React mostra sem executar
  await chamar('DELETE', '/viagens/' + criada.dados.id, { token: contas.admin.token });
});

// ============ 15 · Upload protegido ============
test('15 · só entra imagem de verdade, pequena e com nome sorteado', async function () {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  const html = '<html><script>alert(1)</script></html>';
  const ruins = [
    { conteudo: 'isto não é imagem', nome: 'virus.jpg' },
    { conteudo: svg, nome: 'desenho.svg' },
    { conteudo: html, nome: 'pagina.png' },
    { conteudo: 'MZ executavel', nome: 'foto.png.exe' },
  ];
  for (const arquivo of ruins) {
    const resposta = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(function (form) {
      form.append('imagens', new Blob([arquivo.conteudo]), arquivo.nome);
    }) });
    assert.equal(resposta.status, 400, arquivo.nome);
  }

  const grande = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(function (form) {
    form.append('imagens', new Blob([Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)])]), 'grande.png');
  }) });
  assert.equal(grande.status, 413);

  const muitas = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(function (form) {
    for (let i = 0; i < 11; i++) {
      form.append('imagens', new Blob([PNG]), 'f' + i + '.png');
    }
  }) });
  assert.equal(muitas.status, 400);

  const nomeMalicioso = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(function (form) {
    form.append('imagens', new Blob([PNG]), '../../../src/app.js');
  }) });
  assert.equal(nomeMalicioso.status, 201);
  assert.match(nomeMalicioso.dados.imagens[0].url, /\/uploads\/[0-9a-f-]{36}\.png$/);
  await chamar('DELETE', '/viagens/' + nomeMalicioso.dados.id, { token: contas.admin.token });

  const foto = await fetch(viagem.imagens[0].url);
  assert.equal(foto.headers.get('content-type'), 'image/png');
  assert.equal(foto.headers.get('x-content-type-options'), 'nosniff');
});

// ============ 16 · Sem injeção de SQL ============
test('16 · SQL injection não funciona em nenhum campo', async function () {
  liberarLogin();
  const login = await chamar('POST', '/auth/login', { corpo: { email: "' OR '1'='1' -- ", senha: "' OR '1'='1" } });
  assert.equal(login.status, 401);

  const naUrl = await chamar('GET', '/viagens/1 OR 1=1');
  assert.equal(naUrl.status, 400);

  const noTitulo = "Teste'); DROP TABLE Usuarios; --";
  const criada = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(function (form) { form.set('titulo', noTitulo); }) });
  assert.equal(criada.dados.titulo, noTitulo);   // virou só texto
  const [tabela] = await db.query('SELECT COUNT(*) AS total FROM Usuarios');
  assert.ok(tabela[0].total > 0);                // a tabela continua lá
  await chamar('DELETE', '/viagens/' + criada.dados.id, { token: contas.admin.token });

  const noMetodo = await chamar('GET', '/viagens/' + viagem.id + "/simular?metodo=pix' OR 1=1 --&parcelas=1");
  assert.equal(noMetodo.status, 400);
});

// ============ 17 · Limite de tentativas ============
test('17 · depois de 5 tentativas de login, bloqueia por 1 minuto', async function () {
  liberarLogin();
  const status = [];
  for (let i = 0; i < 7; i++) {
    const resposta = await chamar('POST', '/auth/login', { corpo: { email: contas.maria.usuario.email, senha: 'chute' + i } });
    status.push(resposta.status);
  }
  assert.deepEqual(status.slice(0, 5), [401, 401, 401, 401, 401]);
  assert.equal(status[5], 429);
  assert.equal(status[6], 429);
  liberarLogin();
});

test('17 · a última vaga não é vendida duas vezes (compras ao mesmo tempo)', async function () {
  const unica = await chamar('POST', '/viagens', { token: contas.admin.token, corpo: formularioViagem(function (form) { form.set('vagas', '1'); }) });
  const tentativas = await Promise.all([
    chamar('POST', '/viagens/' + unica.dados.id + '/comprar', { token: contas.maria.token, corpo: { metodo: 'pix', numParcelas: 1 } }),
    chamar('POST', '/viagens/' + unica.dados.id + '/comprar', { token: contas.pedro.token, corpo: { metodo: 'pix', numParcelas: 1 } }),
  ]);
  let vendidas = 0;
  for (const tentativa of tentativas) {
    if (tentativa.status === 201) {
      vendidas++;
    } else {
      assert.ok(tentativa.status === 409 || tentativa.status === 400);
    }
  }
  assert.equal(vendidas, 1);
});

// ============ 18 · Git sem senha vazada ============
test('18 · o .gitignore do projeto cobre .env, node_modules e as fotos enviadas', function () {
  const gitignore = fs.readFileSync(path.join(BACKEND, '.gitignore'), 'utf8');
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /node_modules/);
  assert.match(gitignore, /uploads\/\*/);
  const gitignoreFront = fs.readFileSync(path.join(RAIZ, 'frontend', '.gitignore'), 'utf8');
  assert.match(gitignoreFront, /\.env/);
});

// ============ 19 · Headers e CORS certos ============
test('19 · cabeçalhos de segurança presentes', async function () {
  const resposta = await chamar('GET', '/viagens');
  assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(resposta.headers.get('x-frame-options'));
  assert.ok(resposta.headers.get('content-security-policy'));
  assert.ok(resposta.headers.get('strict-transport-security'));
  assert.equal(resposta.headers.get('referrer-policy'), 'no-referrer');
});

test('19 · CORS só libera o front configurado', async function () {
  const estranho = await chamar('GET', '/viagens', { headers: { Origin: 'https://site-malicioso.com' } });
  assert.equal(estranho.headers.get('access-control-allow-origin'), null);
  const nosso = await chamar('GET', '/viagens', { headers: { Origin: config.corsOrigens[0] } });
  assert.equal(nosso.headers.get('access-control-allow-origin'), config.corsOrigens[0]);
});

test('19 · corpo gigante é recusado (1 MB no JSON)', async function () {
  const gigante = await chamar('POST', '/auth/cadastro', { corpo: '{"nome":"' + 'a'.repeat(2 * 1024 * 1024) + '"}' });
  assert.equal(gigante.status, 413);
});

// ============ 20 · Testa como um estranho ============
test('20 · sem login, só dá para ver as viagens e simular', async function () {
  assert.equal((await chamar('GET', '/viagens')).status, 200);
  assert.equal((await chamar('GET', '/viagens/' + viagem.id)).status, 200);
  assert.equal((await chamar('GET', '/viagens/' + viagem.id + '/simular?metodo=cartao&parcelas=3')).status, 200);
  assert.equal((await chamar('GET', '/compras/minhas')).status, 401);
  assert.equal((await chamar('POST', '/parcelas/1/pagar')).status, 401);
  assert.equal((await chamar('GET', '/viagens/' + viagem.id + '/passageiros')).status, 401);
  assert.equal((await chamar('DELETE', '/viagens/' + viagem.id)).status, 401);
});

test('20 · as respostas públicas não vazam dados de ninguém', async function () {
  const resposta = await chamar('GET', '/viagens/' + viagem.id);
  assert.doesNotMatch(resposta.texto, /senha|hash|email|\$2[aby]\$/i);
  liberarLogin();
  const login = await chamar('POST', '/auth/login', { corpo: { email: contas.maria.usuario.email, senha: 'senhaDaMaria1' } });
  assert.doesNotMatch(login.texto, /SenhaHash|senhaHash|\$2[aby]\$/);
});
