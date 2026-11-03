import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
import { RegraNegocioErro } from '../utils/erros.js';

export const PASTA_UPLOADS = fileURLToPath(new URL('../../uploads', import.meta.url));

export async function prepararPasta() {
  await fs.mkdir(PASTA_UPLOADS, { recursive: true });
}

// Descobre o tipo pelo CONTEÚDO (os primeiros bytes), não pelo nome nem pelo que o navegador diz.
// Um "virus.exe" renomeado para "foto.jpg" é recusado aqui.
export function detectarExtensao(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return '.jpg';
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return '.png';
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return '.webp';
  }
  return null;
}

// Confere TODAS antes de gravar qualquer uma. Devolve os caminhos: ['/uploads/3f2a....webp', ...]
export async function salvarTodas(arquivos) {
  const extensoes = [];
  for (const arquivo of arquivos) {
    const extensao = detectarExtensao(arquivo.buffer);
    if (extensao === null) {
      throw new RegraNegocioErro('Só são aceitas imagens JPG, PNG ou WEBP.');
    }
    extensoes.push(extensao);
  }

  const urls = [];
  for (let i = 0; i < arquivos.length; i++) {
    // o nome é sorteado: o nome original do arquivo nunca é usado
    const nome = randomUUID() + extensoes[i];
    await fs.writeFile(path.join(PASTA_UPLOADS, nome), arquivos[i].buffer);
    urls.push('/uploads/' + nome);
  }
  return urls;
}

export async function removerTodas(urls) {
  for (const url of urls) {
    // só o nome do arquivo, e só se tiver o formato que nós mesmos geramos:
    // impede apagar algo fora da pasta com "../../"
    const nome = path.basename(String(url));
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nome)) {
      continue;
    }
    try {
      await fs.unlink(path.join(PASTA_UPLOADS, nome));
    } catch (erro) {
      // o arquivo já não existia: tudo bem
    }
  }
}
