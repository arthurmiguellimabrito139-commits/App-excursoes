import multer from 'multer';
import { ErroApp } from '../utils/erros.js';
import { TAMANHO_MAXIMO_MB } from './upload.js';

// rota que não existe
export function naoEncontrado(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada.' });
}

// Todo erro cai aqui (o Express 5 já manda os erros dos "async" para cá).
// Precisa ter os 4 parâmetros para o Express saber que é o tratador de erros.
export function tratarErros(erro, req, res, next) {
  // erros "esperados": a mensagem pode ir para a tela
  if (erro instanceof ErroApp) {
    return res.status(erro.status).json({ erro: erro.message });
  }

  if (erro instanceof multer.MulterError) {
    if (erro.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ erro: 'Cada imagem pode ter no máximo ' + TAMANHO_MAXIMO_MB + ' MB.' });
    }
    if (erro.code === 'LIMIT_FILE_COUNT' || erro.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ erro: 'Envie no máximo 10 imagens, no campo "imagens".' });
    }
    return res.status(400).json({ erro: 'Envio de arquivos inválido.' });
  }

  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Requisição grande demais.' });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }

  // qualquer outra coisa: o detalhe fica só no log do servidor, nunca na resposta
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno. Tente de novo em instantes.' });
}
