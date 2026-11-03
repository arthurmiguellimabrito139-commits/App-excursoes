import { db } from '../config/db.js';
import { Viagem } from '../models/Viagem.js';
import { ViagemImagem } from '../models/ViagemImagem.js';
import { ConflitoErro, RegraNegocioErro } from '../utils/erros.js';
import { montarCompras } from './compraRepository.js';

// ==================== READ ====================

// monta as viagens com imagens e compras ativas (para contar as vagas).
// Poucas consultas no total, em vez de várias por viagem.
async function montarViagens(linhasViagens) {
  if (linhasViagens.length === 0) {
    return [];
  }

  const ids = [];
  for (const linha of linhasViagens) {
    ids.push(linha.Id);
  }
  const [linhasImagens] = await db.query('SELECT * FROM ViagemImagens WHERE ViagemId IN (?) ORDER BY Id', [ids]);
  const [linhasCompras] = await db.query("SELECT * FROM Compras WHERE ViagemId IN (?) AND Status <> 'cancelado'", [ids]);
  const compras = await montarCompras(linhasCompras);

  const viagens = [];
  for (const linha of linhasViagens) {
    const viagem = Viagem.doBanco(linha);

    const imagens = [];
    for (const linhaImagem of linhasImagens) {
      if (linhaImagem.ViagemId === viagem.id) {
        imagens.push(new ViagemImagem(linhaImagem.Url, linhaImagem.Id));
      }
    }

    const comprasDaViagem = [];
    for (const compra of compras) {
      if (compra.viagemId === viagem.id) {
        comprasDaViagem.push(compra);
      }
    }

    viagem.carregarImagens(imagens);
    viagem.carregarCompras(comprasDaViagem);
    viagens.push(viagem);
  }
  return viagens;
}

export async function listar() {
  const [linhas] = await db.query('SELECT * FROM Viagens ORDER BY DataSaida, Id');
  return montarViagens(linhas);
}

export async function buscar(id) {
  const [linhas] = await db.query('SELECT * FROM Viagens WHERE Id = ?', [id]);
  const viagens = await montarViagens(linhas);
  if (viagens.length === 0) {
    return null;
  }
  return viagens[0];
}

export async function buscarVarias(ids) {
  if (ids.length === 0) {
    return [];
  }
  const [linhas] = await db.query('SELECT * FROM Viagens WHERE Id IN (?)', [ids]);
  return montarViagens(linhas);
}

// ==================== CREATE ====================
export async function inserir(viagem) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    const [resultado] = await conexao.query(
      `INSERT INTO Viagens (AdminId, Titulo, Destino, Descricao, DataSaida, DataRetorno,
                            Valor, Vagas, MaxParcelas, Versao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [viagem.adminId, viagem.titulo, viagem.destino, viagem.descricao, viagem.dataSaida,
       viagem.dataRetorno, viagem.valor, viagem.vagas, viagem.maxParcelas, viagem.versao]
    );
    viagem.definirId(resultado.insertId);

    await inserirImagensNovas(conexao, viagem);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

// ==================== UPDATE ====================
export async function atualizar(viagem, versaoAntiga) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    const [resultado] = await conexao.query(
      `UPDATE Viagens
          SET Titulo = ?, Destino = ?, Descricao = ?, DataSaida = ?, DataRetorno = ?,
              Valor = ?, Vagas = ?, MaxParcelas = ?, Versao = ?
        WHERE Id = ? AND Versao = ?`,
      [viagem.titulo, viagem.destino, viagem.descricao, viagem.dataSaida, viagem.dataRetorno,
       viagem.valor, viagem.vagas, viagem.maxParcelas, viagem.versao, viagem.id, versaoAntiga]
    );
    // nenhuma linha mudou = alguém alterou (ou vendeu) entre a leitura e agora
    if (resultado.affectedRows === 0) {
      throw new ConflitoErro('Esta viagem foi alterada enquanto você editava. Recarregue e tente de novo.');
    }

    // imagens: apaga as que saíram da lista e insere as novas
    const idsQueFicam = [];
    for (const imagem of viagem.imagens) {
      if (imagem.id !== null) {
        idsQueFicam.push(imagem.id);
      }
    }
    if (idsQueFicam.length === 0) {
      await conexao.query('DELETE FROM ViagemImagens WHERE ViagemId = ?', [viagem.id]);
    } else {
      await conexao.query('DELETE FROM ViagemImagens WHERE ViagemId = ? AND Id NOT IN (?)', [viagem.id, idsQueFicam]);
    }

    await inserirImagensNovas(conexao, viagem);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

// ==================== DELETE ====================
export async function excluir(viagem) {
  try {
    // as imagens somem junto (ON DELETE CASCADE no schema.sql);
    // a Versao no WHERE impede apagar se alguém comprou depois da leitura
    const [resultado] = await db.query('DELETE FROM Viagens WHERE Id = ? AND Versao = ?', [viagem.id, viagem.versao]);
    if (resultado.affectedRows === 0) {
      throw new ConflitoErro('Esta viagem foi alterada. Recarregue e tente de novo.');
    }
  } catch (erro) {
    if (erro.code === 'ER_ROW_IS_REFERENCED_2') {   // existe compra apontando para ela
      throw new RegraNegocioErro('Não é possível excluir: já existem passagens vendidas.');
    }
    throw erro;
  }
}

// ==================== auxiliar ====================
async function inserirImagensNovas(conexao, viagem) {
  for (const imagem of viagem.imagens) {
    if (imagem.id !== null) {
      continue;   // já está no banco
    }
    const [resultado] = await conexao.query(
      'INSERT INTO ViagemImagens (ViagemId, Url) VALUES (?, ?)', [viagem.id, imagem.url]
    );
    imagem.definirId(resultado.insertId);
  }
}
