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

## Painel de edição (atualizado 2026-09-13)

Acesse **`https://proposta-jessicadev.vercel.app/admin`**.

Duas camadas de senha, nessa ordem:
1. **Autenticação do navegador (HTTP Basic)** — a própria página nem carrega sem isso. Usuário: `jessica` · Senha: o valor de `ADMIN_SECRET` na Vercel. (`/admin` é protegido no edge por `middleware.js`, antes de qualquer HTML ser entregue.)
2. **Senha do painel** — ao carregar, um segundo prompt pede a mesma senha (`ADMIN_SECRET`) — é o que autoriza o "Salvar e publicar" a gravar no GitHub. Fica salva no navegador depois da primeira vez.

O que dá pra fazer:
- **Texto** — clicar em qualquer texto e editar direto (`contenteditable`); botões A−/A+ na barra inferior ajustam o tamanho do texto selecionado.
- **Imagens** — passar o mouse mostra os controles de aumentar/diminuir (proporção travada — a logo não esticha mais) e trocar por upload. Na foto de capa, os controles ajustam a largura da área que ela ocupa na composição (ela usa `object-fit:cover`, então "redimensionar a imagem" não se aplica do mesmo jeito).
- **Espaçamento** — o botão "↕" ao lado das setas de cada seção abre um slider pra ajustar o respiro vertical dela; nas grades (planos, diagnóstico, escopo, processo) tem um "↕" próprio pra ajustar o espaço entre os itens.
- **Blocos** — mover/adicionar/remover itens de diagnóstico, escopo, processo e planos, e mover seções inteiras — a numeração (01, 02...) se ajusta sozinha.

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
