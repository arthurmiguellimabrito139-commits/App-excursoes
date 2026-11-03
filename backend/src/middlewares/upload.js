import multer from 'multer';

export const TAMANHO_MAXIMO_MB = 5;

// As fotos ficam na MEMÓRIA primeiro: só vão para o disco depois de conferir
// que são imagens de verdade (o imagemStorage olha os primeiros bytes do arquivo).
export const receberImagens = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: TAMANHO_MAXIMO_MB * 1024 * 1024,   // por arquivo
    files: 10,
    fields: 30,
  },
}).array('imagens', 10);
