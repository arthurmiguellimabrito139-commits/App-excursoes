import mysql from 'mysql2/promise';
import { config } from './env.js';

export const db = mysql.createPool({
  host: config.banco.host,
  port: config.banco.porta,
  user: config.banco.usuario,
  password: config.banco.senha,
  database: config.banco.nome,
  dateStrings: true,     // DATE vem como '2026-12-04', sem fuso bagunçando
  decimalNumbers: true,  // DECIMAL vem como número (1890.5), não como texto
});
