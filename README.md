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
| `laptop.jpg` | Foto de capa (LCP) — 1536×1024 |
| `laptop-900.jpg` | Variante mobile da capa — 900×600 |
| `logo.png` | Wordmark jessicadev (topbar) |
| `icon.png` | Símbolo da marca — 512×512 |
| `og-image.jpg` | Card de compartilhamento — 1200×630 |
| `favicon.ico` / `favicon-32x32.png` / `favicon-16x16.png` / `apple-touch-icon.png` | Kit de favicons |
| `vercel.json` | Headers de cache e segurança |

## Ao trocar de domínio

Se o projeto sair do `*.vercel.app` para domínio próprio, atualizar a URL canônica em:

- `index.html` → `canonical`, `og:url`, `og:image`, `og:image:secure_url`, `twitter:image`
- `robots.txt` → `Sitemap:`
- `sitemap.xml` → `<loc>`

## Pendências antes de enviar para um lead

- Os dois CTAs finais (`Falar no WhatsApp` e `Ver projetos`) estão com `href="#"` — apontar para o `wa.me/<número>` e o link de portfólio reais.
- O campo "Preparado para" está com placeholder genérico — personalizar por lead.
