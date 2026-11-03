// As datas do projeto andam como texto 'AAAA-MM-DD' (é assim que o MySQL devolve DATE).
// Nesse formato dá até para comparar com < e >, porque a ordem alfabética é a ordem das datas.

// Data de hoje no horário de Brasília (o toISOString() usa Londres e erraria depois das 21h)
export function hoje() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }
  // new Date('2026-02-31') "pula" para março; se mudou, a data não existe
  const data = new Date(texto + 'T00:00:00Z');
  return !isNaN(data) && data.toISOString().slice(0, 10) === texto;
}

// '2026-01-31' + 1 mês = '2026-02-28' (não pula para março)
export function somarMeses(texto, meses) {
  const partes = texto.split('-');
  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1 + meses;
  const dia = Number(partes[2]);

  const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const resultado = new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDiaDoMes)));
  return resultado.toISOString().slice(0, 10);
}

// '2026-11-03T13:45:10.123Z' (JS) → '2026-11-03 13:45:10' (DATETIME do MySQL, em UTC)
export function dataHoraParaBanco(iso) {
  if (!iso) {
    return null;
  }
  return iso.slice(0, 19).replace('T', ' ');
}

// '2026-11-03 13:45:10' (MySQL) → '2026-11-03T13:45:10Z' (o front entende como UTC)
export function dataHoraDoBanco(texto) {
  if (!texto) {
    return null;
  }
  return texto.replace(' ', 'T') + 'Z';
}
