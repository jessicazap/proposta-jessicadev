// Protege a rota /admin com autenticação HTTP Basic, no edge — antes mesmo
// de qualquer HTML/JS ser entregue. É uma camada A MAIS de segurança;
// a gravação em si (/api/save) continua exigindo o ADMIN_SECRET por conta
// própria, então mesmo que essa camada falhe, a escrita continua protegida.

export const config = { matcher: ['/admin'] };

export default function middleware(request) {
  const expectedPass = process.env.ADMIN_SECRET;
  if (!expectedPass) {
    return new Response('ADMIN_SECRET não configurado nas variáveis de ambiente da Vercel.', { status: 500 });
  }

  const authHeader = request.headers.get('authorization') || '';
  const expected = 'Basic ' + btoa('jessica:' + expectedPass);

  if (authHeader === expected) {
    return; // segue pro rewrite normal (/admin -> /index.html)
  }

  return new Response('Autenticação necessária.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Painel jessicadev", charset="UTF-8"' }
  });
}
