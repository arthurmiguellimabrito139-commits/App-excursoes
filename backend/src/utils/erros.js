// Erro "esperado": a mensagem pode ir para a tela, e o status diz o código HTTP
export class ErroApp extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

export class RegraNegocioErro extends ErroApp {
  constructor(mensagem) {
    super(mensagem, 400);
  }
}

export class NaoAutorizadoErro extends ErroApp {
  constructor(mensagem) {
    super(mensagem, 401);
  }
}

export class NaoEncontradoErro extends ErroApp {
  constructor(mensagem) {
    super(mensagem, 404);
  }
}

export class ConflitoErro extends ErroApp {
  constructor(mensagem) {
    super(mensagem, 409);
  }
}
