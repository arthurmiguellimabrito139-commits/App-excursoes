# Segurança — checklist de 21 itens

Cada item tem **como foi feito**, **onde está no código** e **qual teste prova** (`backend/testes/seguranca.test.js`, rodar com `npm test`).

| # | Item | Como foi feito | Onde | Teste |
|---|---|---|---|---|
| 1 | Chave de API protegida | Nenhum segredo no front: só `VITE_USE_MOCK` e `VITE_API_URL` (públicos). Chaves só no `.env` do back | `frontend/.env.example`, `config/env.js` | 01 (procura os valores do `.env` em todos os arquivos do projeto) |
| 2 | `.env` nunca exposto | `.env` no `.gitignore`; `.env.example` sem valores; a API só serve a pasta `uploads` | `.gitignore`, `app.js` | 02 (tenta baixar `/.env` por 6 caminhos, incluindo `../`) |
| 3 | Nada de senha no código | Tudo vem de variável de ambiente; a API não sobe sem `JWT_SECRET` de 32+ caracteres | `config/env.js` | 03 (procura `senha = "..."` no código) |
| 4 | Login de verdade | bcrypt custo 12; JWT HS256 com emissor, público e validade; mesma resposta e mesmo tempo para "e-mail não existe" e "senha errada" | `services/authService.js`, `middlewares/autenticar.js` | 04 (hash no banco; token adulterado, de outra chave, vencido e `alg: none`) |
| 5 | Permissão no servidor | `autenticar` + `exigirPapel('Admin' / 'Passageiro')` em cada rota; o service ainda confere no banco | `routes/index.js` | 05 |
| 6 | Não confia no ID da tela | Quem é o usuário sai do token; o zod descarta campos extras; o valor da compra vem do banco | `controllers/*`, `validacoes/esquemas.js` | 06 (`tipo: "Admin"` no cadastro; `valor: 1` e `passageiroId` na compra) |
| 7 | Cada um só vê o seu | `compra.pertenceA()`, `admin.ehDono()`; o que é de outro responde **404** (não confirma que existe) | `models/Admin.js`, `services/compraService.js` | 07 |
| 8 | Banco travado | A API usa o usuário `excursoes_app` com só `SELECT, INSERT, UPDATE, DELETE`; SQL sempre com `?` | README, `repositories/*` | 08 (confere as permissões do usuário conectado) |
| 9 | Storage protegido | Pasta `uploads` sem listagem; nome sorteado (UUID); só imagens conferidas | `services/imagemStorage.js` | 09 |
| 10 | Admin protegido | Não existe cadastro de admin pela tela; o primeiro admin vem do `.env` com senha de 12+ | `authService.criarAdminInicial` | 10 |
| 11 | Debug desligado | Sem `X-Powered-By`; erros inesperados só no log do servidor | `app.js`, `middlewares/erros.js` | 11 |
| 12 | Erro sem detalhe | Erro esperado → mensagem amigável; inesperado → "Erro interno" (sem stack, SQL ou caminho) | `middlewares/erros.js` | 12 |
| 13 | Valida tudo no servidor | zod no formato + regras nos models (datas, valor, vagas, parcelas, tamanho dos textos) | `validacoes/esquemas.js`, `models/*` | 13 (8 formulários inválidos) |
| 14 | Limpa o que o usuário manda | `trim`, e-mail minúsculo, campos extras descartados; HTML guardado como texto e exibido pelo React sem executar | `esquemas.js`, `models/Usuario.js` | 14 (+ conferido no navegador: título `<img onerror=alert(1)>` aparece como texto) |
| 15 | Upload protegido | Tipo pelo conteúdo (JPG/PNG/WEBP), 5 MB por foto, 10 fotos, nome sorteado, `nosniff` | `middlewares/upload.js`, `imagemStorage.js` | 15 (texto, SVG com script, HTML, `.exe`, 6 MB, 11 fotos, nome `../../src/app.js`) |
| 16 | Sem injeção de SQL | Só consultas com `?` (o mysql2 escapa); ids validados como número | `repositories/*` | 16 (login, URL, título com `DROP TABLE`, query string) |
| 17 | Limite de tentativas | 5 logins/cadastros por minuto por IP; 300 req/min no geral; última vaga protegida pela coluna `Versao` | `middlewares/limites.js`, `compraRepository.inserir` | 17 (6º login → 429; duas compras simultâneas da última vaga → só 1 vende) |
| 18 | Git sem senha vazada | `.gitignore` cobre `.env`, `node_modules`, `uploads`; teste 01 varre o projeto | `.gitignore` | 18 |
| 19 | Headers e CORS certos | helmet (CSP, HSTS, nosniff, frame, referrer); CORS só para `CORS_ORIGEM`; JSON até 1 MB | `app.js` | 19 |
| 20 | Testa como um estranho | Suíte inteira sobe a API e ataca sem saber nada por dentro | `testes/seguranca.test.js` | 20 + todos |
| 21 | Auditoria completa com a IA | Projeto revisado item por item com o Claude; testes de mutação (tirar uma proteção faz o teste falhar) | este arquivo | — |

## Limitações conhecidas (honestas)

- **Pagamento simulado:** o botão "Pagar" marca a parcela como paga (`PAGAMENTO_SIMULADO=true`). Num produto real, quem confirma é o gateway (Mercado Pago, Stripe) via webhook — o app nunca recebe número de cartão.
- **Token no `localStorage`:** prático, mas um XSS conseguiria lê-lo. Mitigado porque o React escapa todo texto e não há `dangerouslySetInnerHTML`. Evolução: cookie `httpOnly` + CSP no front.
- **Limite de tentativas em memória:** zera se a API reiniciar e não é dividido entre várias instâncias. Para escalar: Redis.
- **Fotos no disco local:** no Render o disco é apagado a cada deploy. Em produção, trocar o `imagemStorage` por Cloudinary/S3 (a interface `salvarTodas` / `removerTodas` continua a mesma).
- **Sem logout no servidor nem verificação de e-mail:** o token vale 1 hora.
