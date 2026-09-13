# Proposta Comercial — jessicadev

Proposta comercial digital da marca **jessicadev** (sites, sistemas, automações e agentes de IA).
Template reenviável para leads — nicho dentistas e advogados.

## Stack

HTML5 + CSS puro (custom properties, `clip-path`, grid) + JS vanilla (scroll reveal, header sticky).
**Zero framework, zero build step, zero dependência** além do Google Fonts via CDN.

## Deploy

Site estático. Na Vercel: framework preset **Other**, sem build command, root directory = raiz do repo.
A configuração de headers/cache já está em `vercel.json`.

```
Framework Preset : Other
Build Command    : (vazio)
Output Directory : .
Install Command  : (vazio)
```

## Estrutura

| Arquivo | Papel |
|---|---|
| `index.html` | A proposta inteira (HTML + CSS + JS inline, autocontido) |
| `admin.js` | Painel de edição — só ativa com `?admin=jessicadev` na URL |
| `api/save.js` | Serverless function — grava o HTML editado direto no GitHub |
| `laptop.jpg` | Foto de capa (LCP) — 1536×1024 |
| `laptop-900.jpg` | Variante mobile da capa — 900×600 |
| `logo.png` | Wordmark jessicadev (topbar) |
| `icon.png` | Símbolo da marca — 512×512 |
| `og-image.jpg` | Card de compartilhamento — 1200×630 |
| `favicon.ico` / `favicon-32x32.png` / `favicon-16x16.png` / `apple-touch-icon.png` | Kit de favicons |
| `vercel.json` | Headers de cache e segurança |
| `package.json` | Só fixa a versão do Node (20.x) pra rodar `api/save.js` |

## Painel de edição (2026-09-13)

Acesse `https://proposta-jessicadev.vercel.app/?admin=jessicadev`. Na primeira vez, o navegador pede a senha — é a mesma cadastrada em **Vercel → Settings → Environment Variables → `ADMIN_SECRET`**. Depois de digitada uma vez, fica salva nesse navegador.

O que dá pra fazer: clicar em qualquer texto e editar direto (`contenteditable`), aumentar/diminuir o tamanho do texto selecionado, trocar ou redimensionar qualquer imagem, mover/adicionar/remover itens de diagnóstico, escopo, processo e planos, e mover seções inteiras — a numeração se ajusta sozinha.

**"Salvar e publicar" grava direto no GitHub** (via `api/save.js`, que usa a variável `GITHUB_TOKEN`) — o commit sozinho dispara um novo deploy na Vercel, e o site atualiza em ~30-60 segundos. Ninguém que abrir o link sem `?admin=jessicadev` vê qualquer parte desse sistema.

**Variáveis de ambiente obrigatórias na Vercel** (Settings → Environment Variables, em Production + Preview):

| Nome | O que é |
|---|---|
| `GITHUB_TOKEN` | Fine-grained personal access token, escopo só neste repositório, permissão Contents: Read and write |
| `ADMIN_SECRET` | Senha escolhida por você — protege o `/api/save` de verdade (a checagem é no servidor, não só esconder o botão) |

Se alguma delas for trocada/revogada, é só gerar de novo e atualizar na Vercel — não precisa mexer no código.

## Ao trocar de domínio

Se o projeto sair do `*.vercel.app` para domínio próprio, atualizar a URL canônica em `index.html` → `canonical`, `og:url`, `og:image`, `og:image:secure_url`, `twitter:image`. (O `robots.txt` está bloqueando indexação por decisão da usuária — ver seção abaixo.)

## Indexação no Google

Bloqueada de propósito (`<meta name="robots" content="noindex, nofollow">` + `robots.txt` com `Disallow: /`) — decisão de 2026-09-13, é uma proposta pontual pra enviar por link direto, não uma página pública de vendas. Se isso mudar no futuro, remover os dois bloqueios.

## Pendências antes de enviar para um lead

- Os dois CTAs finais (`Falar no WhatsApp` e `Ver projetos`) estão com `href="#"` — apontar para o `wa.me/<número>` e o link de portfólio reais.
- O campo "Preparado para" está com placeholder genérico — personalizar por lead (dá pra fazer isso direto no painel de edição agora, sem precisar mexer em código).
