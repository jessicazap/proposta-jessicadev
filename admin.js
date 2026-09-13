/* ══════════════════════════════════════════════════════════════
   Painel de edição da proposta jessicadev — acesso em /admin
   (protegido por HTTP Basic no edge, ver middleware.js).
   "Salvar e publicar" grava direto no GitHub via /api/save — o
   próprio commit dispara o redeploy automático da Vercel (~30-60s).
   A proteção de escrita de verdade é no servidor (/api/save exige
   o ADMIN_SECRET); isso aqui é só a experiência de edição.
   ══════════════════════════════════════════════════════════════ */
(function(){
  var isAdmin = (location.pathname === '/admin' || location.pathname === '/admin/' || location.pathname === '/admin.html');
  if (!isAdmin) return;

  var SECRET_KEY = 'jd_admin_secret';
  var lastFocused = null;

  function getSecret(forcePrompt){
    var s = null;
    try { s = localStorage.getItem(SECRET_KEY); } catch(e){}
    if (!s || forcePrompt){
      s = window.prompt('Senha do painel (a mesma cadastrada em ADMIN_SECRET na Vercel):', '');
      if (s) { s = s.trim(); if (s) { try { localStorage.setItem(SECRET_KEY, s); } catch(e){} } } // trim: espaço colado sem querer é a causa nº1 de "senha incorreta"
    }
    return (s || '').trim();
  }
  function forgetSecret(){
    try { localStorage.removeItem(SECRET_KEY); } catch(e){}
  }

  /* ═══ TEXTO ═══ */
  function isInlineTag(tag){ return ['SPAN','STRONG','EM','B','I','SVG','USE','BR'].indexOf(tag) !== -1; }
  function isEditableLeaf(el){
    var kids = Array.prototype.slice.call(el.children);
    return kids.every(function(c){ return isInlineTag(c.tagName); });
  }
  var LOCKED_LABELS = '.colophon dt'; // rótulos fixos da metadata ("PREPARADO PARA" etc.) — só o valor (dd) é editável, evita editar o rótulo sem querer
  function enableTextEditing(root){
    var candidates = root.querySelectorAll('h1,h2,h3,h4,p,dd,dt,li,span,div');
    candidates.forEach(function(el){
      if (el.closest('.adm-ui')) return;
      if (el.closest('[contenteditable="true"]')) return;
      if (el.matches && el.matches(LOCKED_LABELS)) return;
      if (!isEditableLeaf(el)) return;
      if (!el.textContent.trim()) return;
      el.setAttribute('contenteditable', 'true');
    });
  }

  /* ═══ IMAGENS — redimensiona com proporção travada (largura em px + altura auto),
     nunca só "width: X%", que é o que deixava a logo esticada (a altura dela
     era fixa no CSS). Base = tamanho renderizado real na primeira vez que
     o painel abre, não o tamanho intrínseco do arquivo. ═══ */
  function baseWidth(img){
    if (!img.dataset.admBaseW){
      var w = img.getBoundingClientRect().width || img.naturalWidth || 100;
      img.dataset.admBaseW = String(w);
    }
    return parseFloat(img.dataset.admBaseW);
  }
  function currentScale(img){
    var v = parseFloat(img.dataset.admScale || '1');
    return isNaN(v) ? 1 : v;
  }
  function applyImgScale(img, scale){
    scale = Math.max(0.25, Math.min(3, scale));
    img.dataset.admScale = String(scale);
    img.style.width = Math.round(baseWidth(img) * scale) + 'px';
    img.style.height = 'auto';
  }

  function enableImageEditing(root){
    var imgs = root.querySelectorAll('img');
    imgs.forEach(function(img){
      if (img.closest('.adm-imgwrap')) return;
      var isCoverPhoto = !!img.closest('.cover__photo');
      var wrap = document.createElement('span');
      wrap.className = 'adm-imgwrap' + (isCoverPhoto ? ' adm-imgwrap--fill' : '');
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);

      var ctrl = document.createElement('span');
      ctrl.className = 'adm-imgctrl adm-ui';
      if (isCoverPhoto){
        // a foto de capa preenche o container (object-fit:cover) — redimensionar
        // o <img> não faz sentido aqui; quem controla o tamanho dela na composição
        // é a largura do próprio container .cover__photo.
        ctrl.innerHTML = '<button type="button" data-a="cw-dn" title="Diminuir área da foto">− largura</button><button type="button" data-a="cw-up" title="Aumentar área da foto">+ largura</button><button type="button" data-a="swap" title="Trocar imagem">⇄ Trocar</button>';
      } else {
        ctrl.innerHTML = '<button type="button" data-a="dn" title="Diminuir">−</button><button type="button" data-a="up" title="Aumentar">+</button><button type="button" data-a="swap" title="Trocar imagem">⇄ Trocar</button>';
      }
      wrap.appendChild(ctrl);

      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
      wrap.appendChild(input);

      if (isCoverPhoto){
        var container = img.closest('.cover__photo');
        ctrl.querySelector('[data-a="cw-dn"]').addEventListener('click', function(){
          var w = parseFloat((container.style.width || getComputedStyle(container).width));
          var pct = container.style.width && container.style.width.indexOf('%')>-1 ? parseFloat(container.style.width) : 57;
          container.style.width = Math.max(30, pct - 5) + '%';
        });
        ctrl.querySelector('[data-a="cw-up"]').addEventListener('click', function(){
          var pct = container.style.width && container.style.width.indexOf('%')>-1 ? parseFloat(container.style.width) : 57;
          container.style.width = Math.min(85, pct + 5) + '%';
        });
      } else {
        ctrl.querySelector('[data-a="dn"]').addEventListener('click', function(){ applyImgScale(img, currentScale(img) - 0.1); });
        ctrl.querySelector('[data-a="up"]').addEventListener('click', function(){ applyImgScale(img, currentScale(img) + 0.1); });
      }
      ctrl.querySelector('[data-a="swap"]').addEventListener('click', function(){ input.click(); });
      input.addEventListener('change', function(){
        var f = input.files && input.files[0];
        if (!f) return;
        if (f.size > 3*1024*1024){ showAdmToast('Imagem grande (>3MB) deixa a página pesada — prefira algo menor.', true); }
        var reader = new FileReader();
        reader.onload = function(){
          img.src = reader.result;
          img.removeAttribute('srcset');
          img.removeAttribute('sizes');
          delete img.dataset.admBaseW; // recalcula a base no próximo resize
        };
        reader.readAsDataURL(f);
      });
    });
  }

  /* ═══ ESPAÇAMENTO — seções, capa, grids (gap) e padding interno dos itens.
     Um popover genérico com slider; cada alvo diz "de onde eu leio" e
     "onde eu aplico" (pode ser 1 elemento ou vários, ex.: todas as células
     da metadata de uma vez). ═══ */
  function makeSpacingPopover(opts){
    // opts: { label, min, max, step, get(), set(px) }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'adm-spc-btn adm-ui';
    btn.title = opts.label;
    btn.textContent = '↕';

    var pop = document.createElement('div');
    pop.className = 'adm-spc-pop adm-ui';
    var curVal = Math.round(opts.get());
    pop.innerHTML = '<span class="adm-spc-pop__label">' + opts.label + '</span>'
      + '<input type="range" min="' + opts.min + '" max="' + opts.max + '" step="' + opts.step + '" value="' + curVal + '">'
      + '<span class="adm-spc-pop__val">' + curVal + 'px</span>';
    var input = pop.querySelector('input');
    var valLabel = pop.querySelector('.adm-spc-pop__val');
    input.addEventListener('input', function(){
      opts.set(Number(input.value));
      valLabel.textContent = input.value + 'px';
    });
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      document.querySelectorAll('.adm-spc-pop.open').forEach(function(p){ if (p !== pop) p.classList.remove('open'); });
      pop.classList.toggle('open');
    });
    document.addEventListener('click', function(e){
      if (!pop.contains(e.target) && e.target !== btn) pop.classList.remove('open');
    });
    return { btn: btn, pop: pop };
  }

  function mountInGroup(hostEl, groupClass, pieces){
    var group = hostEl.querySelector(':scope > .' + groupClass);
    if (!group) return;
    group.appendChild(pieces.btn);
    group.appendChild(pieces.pop); // pop ancorado no grupinho pequeno, não no bloco inteiro
  }
  function mountStandalone(beforeEl, pieces){
    var holder = document.createElement('div');
    holder.className = 'adm-spc-holder adm-ui';
    holder.appendChild(pieces.btn);
    holder.appendChild(pieces.pop);
    beforeEl.parentNode.insertBefore(holder, beforeEl);
  }

  function setPaddingBlock(el, px){ el.style.paddingBlock = px + 'px'; }
  function getPaddingBlockAvg(el){
    var cs = getComputedStyle(el);
    return (parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) / 2;
  }
  function setPaddingAll(els, px){ els.forEach(function(el){ el.style.padding = px + 'px'; }); }
  function setPaddingBlockAll(els, px){ els.forEach(function(el){ el.style.paddingBlock = px + 'px'; }); }
  function setPaddingTopAll(els, px){ els.forEach(function(el){ el.style.paddingTop = px + 'px'; }); }

  function enableSpacingControls(){
    // capa: espaçamento no topo
    var cover = document.querySelector('.cover');
    if (cover){
      var p = makeSpacingPopover({
        label: 'Espaçamento no topo da capa',
        min: 60, max: 220, step: 4,
        get: function(){ return parseFloat(getComputedStyle(cover).paddingTop); },
        set: function(px){ cover.style.paddingTop = px + 'px'; }
      });
      mountStandalone(cover, p);
    }

    // metadata da capa (Preparado para / por / Validade): padding interno das células
    var colophonCells = document.querySelectorAll('.colophon > div');
    if (colophonCells.length){
      var pc = makeSpacingPopover({
        label: 'Respiro da metadata (Preparado para/por/Validade)',
        min: 8, max: 48, step: 2,
        get: function(){ return getPaddingBlockAvg(colophonCells[0]); },
        set: function(px){ setPaddingBlockAll(Array.prototype.slice.call(colophonCells), px); }
      });
      mountStandalone(document.querySelector('.colophon'), pc);
    }

    // seções: espaçamento vertical, controle ao lado das setas de mover
    document.querySelectorAll('main > section.section, section.cta').forEach(function(sec){
      var pieces = makeSpacingPopover({
        label: 'Espaçamento vertical da seção',
        min: 32, max: 220, step: 4,
        get: function(){ return getPaddingBlockAvg(sec); },
        set: function(px){ setPaddingBlock(sec, px); }
      });
      mountInGroup(sec, 'adm-section-ctrl', pieces);
    });

    // grids: espaço ENTRE os itens + padding INTERNO de cada item, os dois controles
    var gridDefs = [
      { sel: '.plans', itemSel: '.plan', label: 'planos', padType: 'all' },
      { sel: '.diag', itemSel: '.diag__item', label: 'itens de diagnóstico', padType: 'block' },
      { sel: '.scope', itemSel: '.scope__item', label: 'itens de escopo', padType: 'block' },
      { sel: '.process', itemSel: '.step', label: 'etapas do processo', padType: 'top' }
    ];
    gridDefs.forEach(function(g){
      var el = document.querySelector(g.sel);
      if (!el) return;
      var gapPieces = makeSpacingPopover({
        label: 'Espaço entre os ' + g.label,
        min: 0, max: 64, step: 2,
        get: function(){ return parseFloat(getComputedStyle(el).gap) || 0; },
        set: function(px){ el.style.gap = px + 'px'; }
      });
      mountStandalone(el, gapPieces);

      var items = Array.prototype.slice.call(el.querySelectorAll(':scope > ' + g.itemSel));
      if (!items.length) return;
      var padPieces = makeSpacingPopover({
        label: 'Espaço interno dos ' + g.label,
        min: 8, max: 64, step: 2,
        get: function(){
          var cs = getComputedStyle(items[0]);
          return g.padType === 'top' ? parseFloat(cs.paddingTop) : getPaddingBlockAvg(items[0]);
        },
        set: function(px){
          if (g.padType === 'all') setPaddingAll(items, px);
          else if (g.padType === 'top') setPaddingTopAll(items, px);
          else setPaddingBlockAll(items, px);
        }
      });
      mountStandalone(el, padPieces);
    });
  }

  /* ═══ LINKS — todo botão (<a class="btn">) ganha um controle pra definir
     pra onde ele aponta. Editar o texto (contenteditable) nunca muda o href;
     é por isso que "Falar no WhatsApp" e "Ver projetos" ficavam mortos. ═══ */
  function normalizeUrl(raw){
    var v = raw.trim();
    if (!v) return '';
    if (/^(#|mailto:|tel:|https?:\/\/)/i.test(v)) return v;
    if (/^\+?[\d\s().-]{8,}$/.test(v)) { // só números/formatação de telefone -> vira link do WhatsApp
      var digits = v.replace(/\D/g, '');
      return 'https://wa.me/' + digits;
    }
    return 'https://' + v;
  }

  function enableLinkEditing(root){
    var links = root.querySelectorAll('a.btn');
    links.forEach(function(a){
      if (a.querySelector(':scope > .adm-link-ctrl')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'adm-link-ctrl adm-ui';
      btn.title = 'Definir link deste botão';
      btn.textContent = '🔗';
      a.appendChild(btn);
      btn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        var current = a.getAttribute('href') || '';
        var raw = window.prompt('Link deste botão (número de WhatsApp com DDD, ou uma URL completa):', current === '#' ? '' : current);
        if (raw === null) return; // cancelou
        var url = normalizeUrl(raw);
        if (!url){ showAdmToast('Link vazio — mantido como estava.', true); return; }
        a.setAttribute('href', url);
        if (/^https?:\/\//i.test(url)) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); }
        else { a.removeAttribute('target'); a.removeAttribute('rel'); }
        showAdmToast('Link definido: ' + url);
      });
      // clique no botão em si (fora do 🔗) não deve navegar enquanto edita
      a.addEventListener('click', function(e){
        if (e.target === btn) return;
        e.preventDefault();
      });
    });
  }

  /* ═══ MOVER / ADICIONAR / REMOVER ITENS ═══ */
  function makeSortableList(containerSel, itemSel, numSel, allowMove, allowAddDel){
    var container = document.querySelector(containerSel);
    if (!container) return;

    function renumber(){
      var items = Array.prototype.slice.call(container.querySelectorAll(':scope > ' + itemSel));
      items.forEach(function(item, idx){
        if (numSel){
          var n = item.querySelector(numSel);
          if (n) n.textContent = String(idx+1).length < 2 ? '0'+(idx+1) : String(idx+1);
        }
      });
    }

    function attach(){
      var items = Array.prototype.slice.call(container.querySelectorAll(':scope > ' + itemSel));
      items.forEach(function(item){
        item.classList.add('adm-block');
        var old = item.querySelector(':scope > .adm-ctrl');
        if (old) old.remove();
        if (!allowMove && !allowAddDel) return;
        var ctrl = document.createElement('div');
        ctrl.className = 'adm-ctrl adm-ui';
        var html = '';
        if (allowMove) html += '<button type="button" data-a="up" title="Mover para cima">↑</button><button type="button" data-a="down" title="Mover para baixo">↓</button>';
        if (allowAddDel) html += '<button type="button" data-a="del" title="Remover">×</button>';
        ctrl.innerHTML = html;
        item.appendChild(ctrl);
        if (allowMove){
          ctrl.querySelector('[data-a="up"]').addEventListener('click', function(){
            var prev = item.previousElementSibling;
            if (prev && prev.matches(itemSel)) container.insertBefore(item, prev);
            renumber();
          });
          ctrl.querySelector('[data-a="down"]').addEventListener('click', function(){
            var next = item.nextElementSibling;
            if (next && next.matches(itemSel)) container.insertBefore(next, item);
            renumber();
          });
        }
        if (allowAddDel){
          ctrl.querySelector('[data-a="del"]').addEventListener('click', function(){
            if (container.querySelectorAll(':scope > ' + itemSel).length <= 1){ showAdmToast('Precisa manter pelo menos 1 item.', true); return; }
            if (confirm('Remover este item?')){ item.remove(); renumber(); }
          });
        }
      });
      if (allowAddDel){
        var addBtn = container.querySelector(':scope > .adm-add');
        if (!addBtn){
          addBtn = document.createElement('button');
          addBtn.type = 'button'; addBtn.className = 'adm-add adm-ui';
          addBtn.textContent = '+ Adicionar item';
          addBtn.addEventListener('click', function(){
            var list = container.querySelectorAll(':scope > ' + itemSel);
            var last = list[list.length-1];
            if (!last) return;
            var clone = last.cloneNode(true);
            var oc = clone.querySelector('.adm-ctrl'); if (oc) oc.remove();
            container.insertBefore(clone, addBtn);
            attach();
            renumber();
          });
        }
        container.appendChild(addBtn);
      }
    }
    attach();
  }

  function enableSectionReorder(){
    var main = document.querySelector('main');
    if (!main) return;
    var sections = Array.prototype.slice.call(main.querySelectorAll(':scope > section.section'));
    sections.forEach(function(sec){
      var old = sec.querySelector(':scope > .adm-section-ctrl');
      if (old) old.remove();
      var ctrl = document.createElement('div');
      ctrl.className = 'adm-section-ctrl adm-ui';
      ctrl.innerHTML = '<button type="button" data-a="up" title="Mover seção pra cima">↑</button><button type="button" data-a="down" title="Mover seção pra baixo">↓</button>';
      sec.appendChild(ctrl);
      ctrl.querySelector('[data-a="up"]').addEventListener('click', function(){
        var prev = sec.previousElementSibling;
        if (prev && prev.matches('section.section')) main.insertBefore(sec, prev);
        renumberSections();
      });
      ctrl.querySelector('[data-a="down"]').addEventListener('click', function(){
        var next = sec.nextElementSibling;
        if (next && next.matches('section.section')) main.insertBefore(next, sec);
        renumberSections();
      });
    });
  }
  function renumberSections(){
    var main = document.querySelector('main');
    if (!main) return;
    var sections = Array.prototype.slice.call(main.querySelectorAll(':scope > section.section'));
    sections.forEach(function(sec, idx){
      var num = sec.querySelector(':scope .rail__num');
      if (num) num.textContent = String(idx+1).length < 2 ? '0'+(idx+1) : String(idx+1);
    });
  }

  function resizeFocused(delta){
    if (!lastFocused){ showAdmToast('Clique dentro de um texto primeiro.', true); return; }
    var cs = window.getComputedStyle(lastFocused);
    var px = parseFloat(cs.fontSize) || 16;
    var next = Math.max(9, Math.min(140, px + delta));
    lastFocused.style.fontSize = next + 'px';
  }

  function showAdmToast(msg, isErr){
    var t = document.getElementById('adm-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(function(){ t.classList.remove('show'); }, 4200);
  }

  /* ═══ SALVAR ═══ */
  async function saveAndPublish(){
    var secret = getSecret(false);
    if (!secret){ showAdmToast('Sem senha, não dá pra publicar.', true); return; }

    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('.adm-ui').forEach(function(el){ el.remove(); });
    clone.querySelectorAll('.adm-block').forEach(function(el){ el.classList.remove('adm-block'); });
    clone.querySelectorAll('[contenteditable]').forEach(function(el){ el.removeAttribute('contenteditable'); });
    clone.querySelectorAll('.is-in').forEach(function(el){ el.classList.remove('is-in'); el.style.transitionDelay=''; });
    clone.classList.remove('adm-on');
    clone.querySelectorAll('[data-adm-scale],[data-adm-base-w]').forEach(function(el){
      delete el.dataset.admScale; delete el.dataset.admBaseW;
    });
    clone.querySelectorAll('.adm-imgwrap').forEach(function(w){
      var img = w.querySelector('img');
      if (img) w.replaceWith(img); else w.remove();
    });
    var toastEl = clone.querySelector('#adm-toast'); if (toastEl) toastEl.remove();
    var barEl = clone.querySelector('.adm-bar'); if (barEl) barEl.remove();

    var full = '<!doctype html>\n' + clone.outerHTML;

    showAdmToast('Publicando…');
    try {
      var resp = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + secret },
        body: JSON.stringify({ html: full })
      });
      if (resp.status === 401){
        forgetSecret();
        showAdmToast('Senha incorreta (' + secret.length + ' caracteres digitados) — confira maiúsculas/minúsculas e espaço extra. Clique em Salvar de novo pra digitar outra vez.', true);
        return;
      }
      var data = null;
      try { data = await resp.json(); } catch(e){}
      if (!resp.ok || !data || !data.ok){
        showAdmToast('Não consegui publicar (' + (data && data.error || resp.status) + ').', true);
        return;
      }
      showAdmToast('Publicado! O site atualiza sozinho em ~30-60s.');
    } catch (err) {
      showAdmToast('Erro de conexão ao publicar.', true);
    }
  }

  /* ═══ PRÉVIA MOBILE — abre um "telefone" com a própria /admin dentro de um
     iframe (viewport de verdade, então os @media reais entram em ação —
     não é só encolher a janela). Dá pra editar direto ali dentro; ela tem
     sua própria barra "Salvar e publicar" (é uma segunda sessão do painel,
     mostra a última versão PUBLICADA — se você tiver edição não salva na
     tela principal, salve antes de abrir a prévia pra ela aparecer lá). ═══ */
  var PHONE_PRESETS = [
    { label: 'iPhone', w: 390, h: 780 },
    { label: 'Android', w: 412, h: 820 },
    { label: 'Mini', w: 360, h: 740 }
  ];
  var phonePresetIdx = 0;

  function buildMobilePreview(){
    var overlay = document.createElement('div');
    overlay.className = 'adm-preview-overlay adm-ui';
    overlay.innerHTML = ''
      + '<div class="adm-preview-bar">'
        + '<span class="adm-preview-bar__label">Prévia mobile — edição funciona normalmente aqui dentro</span>'
        + '<div class="adm-preview-bar__actions">'
          + '<button type="button" class="btn btn--tertiary btn--sm" id="adm-preview-size"><span class="btn__face">iPhone</span></button>'
          + '<button type="button" class="btn btn--tertiary btn--sm" id="adm-preview-reload"><span class="btn__face">↻ Atualizar</span></button>'
          + '<button type="button" class="btn btn--primary btn--sm" id="adm-preview-close"><span class="btn__face">Fechar</span></button>'
        + '</div>'
      + '</div>'
      + '<div class="adm-preview-frame-wrap">'
        + '<div class="adm-preview-phone" id="adm-preview-phone"><div class="adm-preview-notch"></div><iframe id="adm-preview-iframe" title="Prévia mobile"></iframe></div>'
      + '</div>';
    document.body.appendChild(overlay);

    function applySize(){
      var p = PHONE_PRESETS[phonePresetIdx];
      var phone = document.getElementById('adm-preview-phone');
      phone.style.width = p.w + 'px';
      phone.style.height = p.h + 'px';
      document.getElementById('adm-preview-size').querySelector('.btn__face').textContent = p.label;
    }
    function reload(){
      document.getElementById('adm-preview-iframe').src = '/admin?_pv=' + Date.now();
    }
    applySize();
    reload();

    document.getElementById('adm-preview-size').addEventListener('click', function(){
      phonePresetIdx = (phonePresetIdx + 1) % PHONE_PRESETS.length;
      applySize();
    });
    document.getElementById('adm-preview-reload').addEventListener('click', reload);
    document.getElementById('adm-preview-close').addEventListener('click', function(){ overlay.remove(); });
    overlay.addEventListener('click', function(e){ if (e.target === overlay) overlay.remove(); });
  }

  function injectAdminBar(){
    var bar = document.createElement('div');
    bar.className = 'adm-bar adm-ui';
    bar.innerHTML = ''
      + '<div class="adm-bar__group"><span class="adm-bar__label">● Área de edição</span><span class="adm-bar__hint">texto: clique e edite · imagem/seção: passe o mouse pros controles · ↕ ajusta espaçamento</span></div>'
      + '<div class="adm-bar__group">'
        + '<div class="adm-mini"><span>Texto</span><button type="button" id="adm-txt-dn">A−</button><button type="button" id="adm-txt-up">A+</button></div>'
        + '<button type="button" class="btn btn--tertiary" id="adm-preview-open"><span class="btn__face">📱 Ver mobile</span></button>'
        + '<button type="button" class="btn btn--tertiary" id="adm-pass" title="Trocar a senha salva neste navegador"><span class="btn__face">🔑</span></button>'
        + '<button type="button" class="btn btn--tertiary" id="adm-exit"><span class="btn__face">Sair</span></button>'
        + '<button type="button" class="btn btn--primary" id="adm-save"><span class="btn__face">Salvar e publicar</span></button>'
      + '</div>';
    document.body.appendChild(bar);
    var toast = document.createElement('div');
    toast.className = 'adm-toast adm-ui'; toast.id = 'adm-toast';
    document.body.appendChild(toast);

    document.getElementById('adm-txt-dn').addEventListener('click', function(){ resizeFocused(-1); });
    document.getElementById('adm-txt-up').addEventListener('click', function(){ resizeFocused(1); });
    document.getElementById('adm-preview-open').addEventListener('click', buildMobilePreview);
    document.getElementById('adm-pass').addEventListener('click', function(){
      forgetSecret();
      var s = getSecret(true);
      showAdmToast(s ? 'Senha atualizada neste navegador (' + s.length + ' caracteres).' : 'Nenhuma senha salva.');
    });
    document.getElementById('adm-exit').addEventListener('click', function(){ location.href = '/'; });
    document.getElementById('adm-save').addEventListener('click', saveAndPublish);
  }

  function boot(){
    document.body.classList.add('adm-on');
    enableTextEditing(document.body);
    enableImageEditing(document.body);
    enableLinkEditing(document.body);
    makeSortableList('.diag', '.diag__item', '.diag__n', true, true);
    makeSortableList('.scope', '.scope__item', '.scope__n', true, true);
    makeSortableList('.process', '.step', '.step__n', true, true);
    makeSortableList('.plans', '.plan', null, true, false);
    enableSectionReorder();
    enableSpacingControls();
    injectAdminBar();
    document.addEventListener('focusin', function(e){
      if (e.target.closest && e.target.closest('[contenteditable="true"]')) lastFocused = e.target.closest('[contenteditable="true"]');
    });
    getSecret(false); // pede a senha uma vez, já deixa pronta pro clique em Salvar
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
