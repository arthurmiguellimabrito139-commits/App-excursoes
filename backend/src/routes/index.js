import { Router } from 'express';
import * as esquemas from '../validacoes/esquemas.js';
import { validar } from '../middlewares/validar.js';
import { autenticar, exigirPapel } from '../middlewares/autenticar.js';
import { limiteLogin } from '../middlewares/limites.js';
import { receberImagens } from '../middlewares/upload.js';
import * as authController from '../controllers/authController.js';
import * as viagensController from '../controllers/viagensController.js';
import * as pagamentosController from '../controllers/pagamentosController.js';
import * as comprasController from '../controllers/comprasController.js';

export const rotas = Router();

const soAdmin = [autenticar, exigirPapel('Admin')];
const soPassageiro = [autenticar, exigirPapel('Passageiro')];
const comId = validar(esquemas.id, 'params');

// ---------- auth (público, com limite de tentativas) ----------
rotas.post('/auth/login', limiteLogin, validar(esquemas.login, 'body'), authController.login);
rotas.post('/auth/cadastro', limiteLogin, validar(esquemas.cadastro, 'body'), authController.cadastrar);

// ---------- viagens ----------
rotas.get('/viagens', validar(esquemas.listagem, 'query'), viagensController.listar);
rotas.get('/viagens/:id', comId, viagensController.buscar);
rotas.post('/viagens', soAdmin, receberImagens, validar(esquemas.viagem, 'body'), viagensController.criar);
rotas.put('/viagens/:id', soAdmin, comId, receberImagens, validar(esquemas.viagem, 'body'), viagensController.editar);
rotas.delete('/viagens/:id', soAdmin, comId, viagensController.excluir);
rotas.get('/viagens/:id/passageiros', soAdmin, comId, viagensController.passageiros);

// ---------- pagamentos (Strategy) ----------
rotas.get('/pagamentos/metodos', pagamentosController.metodos);
rotas.get('/viagens/:id/simular', comId, validar(esquemas.simulacao, 'query'), pagamentosController.simular);
rotas.post('/viagens/:id/comprar', soPassageiro, comId, validar(esquemas.compra, 'body'), pagamentosController.comprar);

// ---------- compras do passageiro ----------
rotas.get('/compras/minhas', soPassageiro, comprasController.minhas);
rotas.post('/parcelas/:id/pagar', soPassageiro, comId, comprasController.pagarParcela);
