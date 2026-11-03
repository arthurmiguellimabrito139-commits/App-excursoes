# Embarque — app de excursões

App de venda de passagens de excursão. O **admin** publica viagens (valor, fotos, descrição, vagas, parcelas máximas) e o **passageiro** vê, simula e paga em parcelas.

- **Back-end:** Node.js + Express 5 + MySQL (SQL puro com `mysql2`)
- **Front-end:** React 18 + Vite + styled-components (responsivo)
- **Pagamento parcelado com o padrão Strategy:** Pix (5% de desconto), Cartão (3x sem juros, depois 2,5% a.m.) e Boleto
- **Segurança:** checklist de 21 itens com testes automáticos → [SEGURANCA.md](SEGURANCA.md)

## Arquitetura do back-end (camadas + model rico)

```
backend/src/
├── models/          regras de negócio nas classes (Usuario abstrato → Admin / Passageiro, Viagem, Compra, Parcela)
├── strategies/      PagamentoStrategy (base + Template Method) → Pix, Cartao, Boleto; PagamentoContext escolhe
├── repositories/    só SQL (transações + concorrência otimista com a coluna Versao)
├── services/        a sequência de cada caso de uso (cadastrar, comprar, pagar parcela...)
├── controllers/     traduzem HTTP ↔ service
├── routes/          cada rota com os seus middlewares (autenticar → papel → upload → validar → controller)
├── middlewares/     JWT, papel, validação (zod), limite de tentativas, upload, erros
├── validacoes/      esquemas zod (o que entra)
├── dtos/            o formato do que sai (contrato em frontend/API.md)
└── config/          .env e conexão com o MySQL
```

Regra de ouro: **o model decide, o repository grava, o service orquestra, o controller só traduz.**

Exemplos de regras que moram nos models: passageiro não compra a mesma viagem duas vezes; não vende além das vagas; parcelas são pagas na ordem; admin só mexe nas viagens dele; viagem com passagem vendida não pode ser excluída.

## Como rodar (Windows / PowerShell)

Pré-requisitos: Node 20+ e MySQL 8.

**1. Banco** — no MySQL Workbench, como root:

```sql
CREATE DATABASE excursoes;
-- depois: File > Open SQL Script > backend/database/schema.sql > raio

-- usuário da API: só lê e grava dados (não apaga nem altera tabelas)
CREATE USER 'excursoes_app'@'localhost' IDENTIFIED BY 'troque-esta-senha';
CREATE USER 'excursoes_app'@'127.0.0.1' IDENTIFIED BY 'troque-esta-senha';
GRANT SELECT, INSERT, UPDATE, DELETE ON excursoes.* TO 'excursoes_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON excursoes.* TO 'excursoes_app'@'127.0.0.1';
```

**2. API**

```powershell
cd backend
npm install
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # cole em JWT_SECRET
# preencha DB_USER=excursoes_app, DB_PASS, ADMIN_EMAIL e ADMIN_SENHA (12+ caracteres)
npm run dev        # http://localhost:5002 — o admin é criado na primeira vez
```

**3. Front**

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev        # http://localhost:5173
```

Sem back-end? Use `VITE_USE_MOCK=true` no `frontend/.env`: tudo roda no navegador com dados simulados.

## Testes

```powershell
cd backend
npm test           # 30 testes de segurança, um bloco por item do checklist (API ligada não é necessária)
```

Os testes sobem a API numa porta livre e atacam como um estranho: token falsificado, SQL injection, upload de arquivo falso, acessar a compra de outra pessoa, comprar a última vaga ao mesmo tempo etc.

Na pasta `backend/testes/passo-a-passo/` ficam os scripts usados para testar cada camada durante a construção (`node testes/passo-a-passo/teste-compra.js`).

## Publicação

| Parte | Onde |
|---|---|
| Banco | MySQL na nuvem (Aiven, Clever Cloud...) — rodar `schema.sql` |
| API | Render (Node) — variáveis do `.env.example`, com `NODE_ENV=production` |
| Front | Vercel — Root Directory `frontend`, `VITE_API_URL` apontando para a API |

Em produção: `CORS_ORIGEM` = endereço do front, `URL_PUBLICA` = endereço da API. Como o disco do Render é apagado a cada deploy, as fotos devem ir para um storage (ex.: Cloudinary) — veja as limitações em [SEGURANCA.md](SEGURANCA.md).

## Contrato da API

Rotas, formatos e status em [frontend/API.md](frontend/API.md).
