/* ══════════════════════════════════════════════════════════════
   Painel de edição da proposta jessicadev
   Ativa só com ?admin=jessicadev na URL. "Salvar e publicar" grava
   direto no GitHub via /api/save — o próprio commit dispara o
   redeploy automático da Vercel (leva uns 30-60s pra ficar no ar).
   A proteção de verdade é no servidor (/api/save exige a senha);
   isso aqui é só a experiência de edição.
   ══════════════════════════════════════════════════════════════ */
(function(){
  var isAdmin = false;
  try { isAdmin = new URLSearchParams(location.search).get('admin') === 'jessicadev'; } catch(e){}
  if (!isAdmin) return;

  var SECRET_KEY = 'jd_admin_secret';
  var lastFocused = null;

  function getSecret(forcePrompt){
    var s = null;
    try { s = localStorage.getItem(SECRET_KEY); } catch(e){}
    if (!s || forcePrompt){
      s = window.prompt('Senha do painel de edição (a mesma cadastrada na Vercel em ADMIN_SECRET):', '');
      if (s) { try { localStorage.setItem(SECRET_KEY, s); } catch(e){} }
    }
    return s || '';
  }

  function isInlineTag(tag){ return ['SPAN','STRONG','EM','B','I','SVG','USE','BR'].indexOf(tag) !== -1; }
  function isEditableLeaf(el){
    var kids = Array.prototype.slice.call(el.children);
    return kids.every(function(c){ return isInlineTag(c.tagName); });
  }
  function enableTextEditing(root){
    var candidates = root.querySelectorAll('h1,h2,h3,h4,p,dd,dt,li,span,div');
    candidates.forEach(function(el){
      if (el.closest('.adm-ui')) return;
      if (el.closest('[contenteditable="true"]')) return;
      if (!isEditableLeaf(el)) return;
      if (!el.textContent.trim()) return;
      el.setAttribute('contenteditable', 'true');
    });
  }

  function enableImageEditing(root){
    var imgs = root.querySelectorAll('img');
    imgs.forEach(function(img){
      if (img.closest('.adm-imgwrap')) return;
      var wrap = document.createElement('span');
      wrap.className = 'adm-imgwrap' + (img.closest('.cover__photo') ? ' adm-imgwrap--fill' : '');
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
      var ctrl = document.createElement('span');
      ctrl.className = 'adm-imgctrl adm-ui';
      ctrl.innerHTML = '<button type="button" data-a="dn" title="Diminuir">−</button><button type="button" data-a="up" title="Aumentar">+</button><button type="button" data-a="swap" title="Trocar imagem">⇄ Trocar</button>';
      wrap.appendChild(ctrl);
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
      wrap.appendChild(input);
      function curPct(){ var m = /([\d.]+)%/.exec(img.style.width||''); return m ? parseFloat(m[1]) : 100; }
      ctrl.querySelector('[data-a="dn"]').addEventListener('click', function(){ img.style.width = Math.max(20, curPct()-10)+'%'; });
      ctrl.querySelector('[data-a="up"]').addEventListener('click', function(){ img.style.width = Math.min(160, curPct()+10)+'%'; });
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
        };
        reader.readAsDataURL(f);
      });
    });
  }

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

  async function saveAndPublish(){
    var secret = getSecret(false);
    if (!secret){ showAdmToast('Sem senha, não dá pra publicar.', true); return; }

    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('.adm-ui').forEach(function(el){ el.remove(); });
    clone.querySelectorAll('.adm-block').forEach(function(el){ el.classList.remove('adm-block'); });
    clone.querySelectorAll('[contenteditable]').forEach(function(el){ el.removeAttribute('contenteditable'); });
    clone.querySelectorAll('.is-in').forEach(function(el){ el.classList.remove('is-in'); el.style.transitionDelay=''; });
    clone.classList.remove('adm-on');
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
        showAdmToast('Senha incorreta. Tente de novo.', true);
        try { localStorage.removeItem(SECRET_KEY); } catch(e){}
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

  function injectAdminBar(){
    var bar = document.createElement('div');
    bar.className = 'adm-bar adm-ui';
    bar.innerHTML = ''
      + '<div class="adm-bar__group"><span class="adm-bar__label">● Área de edição</span><span class="adm-bar__hint">clique em qualquer texto pra editar · passe o mouse num bloco pra mover/remover</span></div>'
      + '<div class="adm-bar__group">'
        + '<div class="adm-mini"><span>Texto</span><button type="button" id="adm-txt-dn">A−</button><button type="button" id="adm-txt-up">A+</button></div>'
        + '<button type="button" class="btn btn--tertiary" id="adm-exit"><span class="btn__face">Sair</span></button>'
        + '<button type="button" class="btn btn--primary" id="adm-save"><span class="btn__face">Salvar e publicar</span></button>'
      + '</div>';
    document.body.appendChild(bar);
    var toast = document.createElement('div');
    toast.className = 'adm-toast adm-ui'; toast.id = 'adm-toast';
    document.body.appendChild(toast);

    document.getElementById('adm-txt-dn').addEventListener('click', function(){ resizeFocused(-1); });
    document.getElementById('adm-txt-up').addEventListener('click', function(){ resizeFocused(1); });
    document.getElementById('adm-exit').addEventListener('click', function(){
      var u = new URL(location.href); u.searchParams.delete('admin'); location.href = u.toString();
    });
    document.getElementById('adm-save').addEventListener('click', saveAndPublish);
  }

  function boot(){
    document.body.classList.add('adm-on');
    enableTextEditing(document.body);
    enableImageEditing(document.body);
    makeSortableList('.diag', '.diag__item', '.diag__n', true, true);
    makeSortableList('.scope', '.scope__item', '.scope__n', true, true);
    makeSortableList('.process', '.step', '.step__n', true, true);
    makeSortableList('.plans', '.plan', null, true, false);
    enableSectionReorder();
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
