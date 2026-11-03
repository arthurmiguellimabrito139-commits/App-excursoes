import { db } from '../config/db.js';
import { Compra } from '../models/Compra.js';
import { Parcela } from '../models/Parcela.js';
import { ConflitoErro } from '../utils/erros.js';
import { dataHoraParaBanco, dataHoraDoBanco } from '../utils/datas.js';

// ==================== READ ====================

// recebe as linhas de Compras e devolve objetos Compra já com as parcelas
// (2 consultas no total, não importa quantas compras sejam)
export async function montarCompras(linhasCompras, conexao) {
  const banco = conexao || db;
  if (linhasCompras.length === 0) {
    return [];
  }

  const ids = [];
  for (const linha of linhasCompras) {
    ids.push(linha.Id);
  }
  const [linhasParcelas] = await banco.query(
    'SELECT * FROM Parcelas WHERE CompraId IN (?) ORDER BY Numero', [ids]
  );

  const compras = [];
  for (const linha of linhasCompras) {
    const parcelas = [];
    for (const linhaParcela of linhasParcelas) {
      if (linhaParcela.CompraId === linha.Id) {
        linhaParcela.PagoEm = dataHoraDoBanco(linhaParcela.PagoEm);
        parcelas.push(Parcela.doBanco(linhaParcela));
      }
    }
    linha.CriadoEm = dataHoraDoBanco(linha.CriadoEm);
    compras.push(Compra.doBanco(linha, parcelas));
  }
  return compras;
}

export async function buscarPorParcela(parcelaId) {
  const [linhas] = await db.query(
    'SELECT c.* FROM Compras c JOIN Parcelas p ON p.CompraId = c.Id WHERE p.Id = ?', [parcelaId]
  );
  const compras = await montarCompras(linhas);
  if (compras.length === 0) {
    return null;
  }
  return compras[0];
}

export async function listarDoPassageiro(passageiroId) {
  const [linhas] = await db.query(
    'SELECT * FROM Compras WHERE PassageiroId = ? ORDER BY CriadoEm DESC, Id DESC', [passageiroId]
  );
  return montarCompras(linhas);
}

export async function listarDaViagem(viagemId) {
  const [linhas] = await db.query(
    'SELECT * FROM Compras WHERE ViagemId = ? ORDER BY CriadoEm, Id', [viagemId]
  );
  return montarCompras(linhas);
}

// ==================== CREATE ====================

// Salva a compra E "reserva" a viagem na mesma transação.
// Se outra pessoa comprou entre a leitura e agora, a versão mudou e o UPDATE não acha a linha.
export async function inserir(compra, viagem, versaoAntigaDaViagem) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    const [reserva] = await conexao.query(
      'UPDATE Viagens SET Versao = ? WHERE Id = ? AND Versao = ?',
      [viagem.versao, viagem.id, versaoAntigaDaViagem]
    );
    if (reserva.affectedRows === 0) {
      throw new ConflitoErro('A viagem acabou de ser alterada (talvez a última vaga tenha sido vendida). Tente de novo.');
    }

    const [resultado] = await conexao.query(
      'INSERT INTO Compras (PassageiroId, ViagemId, Metodo, ValorTotal, Status, CriadoEm) VALUES (?, ?, ?, ?, ?, ?)',
      [compra.passageiroId, compra.viagemId, compra.metodo, compra.valorTotal, compra.status, dataHoraParaBanco(compra.criadoEm)]
    );
    compra.definirId(resultado.insertId);

    for (const parcela of compra.parcelas) {
      const [resultadoParcela] = await conexao.query(
        'INSERT INTO Parcelas (CompraId, Numero, Valor, Vencimento, Paga) VALUES (?, ?, ?, ?, FALSE)',
        [compra.id, parcela.numero, parcela.valor, parcela.vencimento]
      );
      parcela.definirId(resultadoParcela.insertId);
    }

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();   // desfaz tudo: nada fica pela metade
    throw erro;
  } finally {
    conexao.release();          // devolve a conexão para o pool
  }
}

// ==================== UPDATE (pagamento) ====================
export async function salvarPagamento(compra, parcela) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    // "AND Paga = FALSE": se dois cliques chegarem juntos, só o primeiro paga
    const [resultado] = await conexao.query(
      'UPDATE Parcelas SET Paga = TRUE, PagoEm = ? WHERE Id = ? AND Paga = FALSE',
      [dataHoraParaBanco(parcela.pagoEm), parcela.id]
    );
    if (resultado.affectedRows === 0) {
      throw new ConflitoErro('Esta parcela já foi paga.');
    }

    await conexao.query('UPDATE Compras SET Status = ? WHERE Id = ?', [compra.status, compra.id]);
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}
