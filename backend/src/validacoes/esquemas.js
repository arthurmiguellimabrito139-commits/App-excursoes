import { z } from 'zod';

// O zod confere o FORMATO do que chega e joga fora qualquer campo que não está aqui.
// Ex.: se alguém mandar { "tipo": "Admin" } no cadastro, esse campo simplesmente some.

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const login = z.object({
  email: z.string({ error: 'Informe o e-mail.' }).max(150),
  senha: z.string({ error: 'Informe a senha.' }).max(200),
});

export const cadastro = z.object({
  nome: z.string({ error: 'Informe o nome.' }).trim().min(2, 'O nome deve ter entre 2 e 100 caracteres.').max(100, 'O nome deve ter entre 2 e 100 caracteres.'),
  email: z.string({ error: 'Informe o e-mail.' }).trim().toLowerCase().max(150, 'E-mail inválido.').email('E-mail inválido.'),
  senha: z.string({ error: 'Informe a senha.' }).min(8, 'A senha deve ter entre 8 e 72 caracteres.').max(72, 'A senha deve ter entre 8 e 72 caracteres.'),
});

// No formulário com fotos (multipart) TUDO chega como texto: o coerce converte para número.
export const viagem = z.object({
  titulo: z.string({ error: 'Informe o título.' }).trim().min(3, 'O título deve ter entre 3 e 150 caracteres.').max(150, 'O título deve ter entre 3 e 150 caracteres.'),
  destino: z.string({ error: 'Informe o destino.' }).trim().min(2, 'Informe o destino.').max(150, 'Destino muito longo.'),
  descricao: z.string().trim().max(4000, 'Descrição muito longa (máximo 4000 caracteres).').default(''),
  dataSaida: z.string({ error: 'Informe a data de ida.' }).regex(DATA, 'Data de ida inválida.'),
  dataRetorno: z.string({ error: 'Informe a data de volta.' }).regex(DATA, 'Data de volta inválida.'),
  valor: z.coerce.number({ error: 'Valor inválido.' }).positive('Valor inválido.').max(1000000, 'Valor inválido.'),
  vagas: z.coerce.number({ error: 'Vagas inválidas.' }).int('Vagas inválidas.').min(1, 'Vagas entre 1 e 500.').max(500, 'Vagas entre 1 e 500.'),
  maxParcelas: z.coerce.number({ error: 'Parcelas inválidas.' }).int('Parcelas inválidas.').min(1, 'Parcelas máximas entre 1 e 12.').max(12, 'Parcelas máximas entre 1 e 12.'),
  // um id só chega como texto; vários chegam como lista. Aqui vira sempre lista de números.
  imagensRemover: z.preprocess(
    function (valor) {
      if (valor === undefined) {
        return [];
      }
      if (Array.isArray(valor)) {
        return valor;
      }
      return [valor];
    },
    z.array(z.coerce.number().int().positive(), { error: 'Imagens inválidas.' })
  ),
});

export const compra = z.object({
  metodo: z.string({ error: 'Escolha a forma de pagamento.' }).max(20, 'Forma de pagamento inválida.'),
  numParcelas: z.coerce.number({ error: 'Número de parcelas inválido.' }).int('Número de parcelas inválido.').min(1, 'Número de parcelas inválido.').max(12, 'Número de parcelas inválido.'),
});

export const simulacao = z.object({
  metodo: z.string({ error: 'Escolha a forma de pagamento.' }).max(20, 'Forma de pagamento inválida.'),
  parcelas: z.coerce.number({ error: 'Número de parcelas inválido.' }).int('Número de parcelas inválido.').min(1, 'Número de parcelas inválido.').max(12, 'Número de parcelas inválido.'),
});

export const listagem = z.object({
  disponiveis: z.enum(['true', 'false']).optional(),
});

export const id = z.object({
  id: z.coerce.number({ error: 'Id inválido.' }).int('Id inválido.').positive('Id inválido.'),
});
