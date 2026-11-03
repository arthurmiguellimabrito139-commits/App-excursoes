// validar(esquema, 'body' | 'query' | 'params')
// Se passar, o resultado LIMPO fica em req.validado.body (ou .query / .params).
// O controller usa só o req.validado, nunca o req.body cru.
export function validar(esquema, origem) {
  return function (req, res, next) {
    const resultado = esquema.safeParse(req[origem] || {});
    if (!resultado.success) {
      const primeiro = resultado.error.issues[0];
      return res.status(400).json({ erro: primeiro.message });
    }
    if (!req.validado) {
      req.validado = {};
    }
    req.validado[origem] = resultado.data;
    next();
  };
}
