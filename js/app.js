/* ═══════════ APP INITIALIZATION & EVENT BINDINGS ═══════════ */
'use strict';

// ─── Inicialização ────────────────────────────────────────────────────────────
(function init() {
    load();

    document.documentElement.setAttribute('data-theme', S.theme);
    document.documentElement.style.setProperty('--font-size-chat', (S.fontSize || 14) + 'px');

    el('selModel').value = S.model;
    updBadge();
    renderList();
    renderMsgs();
    initScrollWatcher();

    if (window.innerWidth <= 768) sidebar.classList.add('hide');

    el('inp').focus();

    console.log('%c⚡ RicinusAI v2.0 inicializado!', 'color:#8b5cf6;font-weight:bold;font-size:14px');
})();

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Registra múltiplos eventos no mesmo elemento de uma vez */
function _on(target, events, handler, options) {
    const node = typeof target === 'string' ? el(target) : target;
    for (const ev of [].concat(events)) {
        node?.addEventListener(ev, handler, options);
    }
}

/** Atualiza o texto de um elemento */
function _setText(id, text) {
    const node = el(id);
    if (node) node.textContent = text;
}

// ─── Input de texto ───────────────────────────────────────────────────────────
const inp = el('inp');

_on(inp, 'input', () => {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 180) + 'px';
    updBtn();
    updCharCount();
});

_on(inp, 'keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    generating ? stopGen() : send();
});

// Colar imagens
_on(inp, 'paste', e => {
    const files = [...(e.clipboardData?.items ?? [])]
        .filter(i => i.type.startsWith('image/'))
        .map(i => i.getAsFile())
        .filter(Boolean);

    if (files.length) { e.preventDefault(); handleFiles(files); }
});

// ─── Botão enviar ─────────────────────────────────────────────────────────────
_on('btnSend', 'click', e => {
    e.preventDefault();
    generating ? stopGen() : send();
});

// ─── Avatar ───────────────────────────────────────────────────────────────────
_on('btnChangeAvatar', 'click', () => el('avatarInput').click());

_on('avatarInput', 'change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        updateSettings({ userAvatar: reader.result });
        loadAvatarPreview();
        toast('Avatar atualizado!', '✅');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

_on('btnRemoveAvatar', 'click', () => {
    updateSettings({ userAvatar: null });
    loadAvatarPreview();
    toast('Avatar removido', 'ℹ️');
});

// ─── Sidebar ──────────────────────────────────────────────────────────────────
_on('btnNew',  'click', () => newChat());
_on('btnMenu', 'click', toggleSidebar);
_on(sOverlay,  'click', closeMobile);

// ─── Settings — abertura / fechamento ─────────────────────────────────────────
_on('btnOpenSet', 'click',  openSet);
_on('btnClsSet',  'click',  closeSet);
_on('btnCancel',  'click',  closeSet);
_on('btnSave',    'click',  saveSet);
_on('btnReset',   'click',  resetSet);

_on(setModal, 'click', e => { if (e.target === setModal) closeSet(); });

// ─── Sliders de configuração ──────────────────────────────────────────────────
const SLIDERS = [
    { sl: 'tempSl',  val: 'tempV',  fmt: v => parseFloat(v).toFixed(1) },
    { sl: 'tokSl',   val: 'tokV',   fmt: v => v },
    { sl: 'topSl',   val: 'topV',   fmt: v => parseFloat(v).toFixed(2) },
    { sl: 'thinkSl', val: 'thinkV', fmt: v => v },
    {
        sl: 'fontSl', val: 'fontV', fmt: v => v + 'px',
        extra: v => document.documentElement.style.setProperty('--font-size-chat', v + 'px'),
    },
];

for (const { sl, val, fmt, extra } of SLIDERS) {
    _on(sl, 'input', function () {
        _setText(val, fmt(this.value));
        extra?.(this.value);
    });
}

// Toggle visibilidade do grupo thinking budget
_on('thinkTog', 'change', function () {
    el('thinkBudgetGrp').style.display = this.checked ? 'flex' : 'none';
});

// ─── Modo API ─────────────────────────────────────────────────────────────────
_on('apiModeDefault', 'click', () => setApiMode('default'));
_on('apiModeCustom',  'click', () => setApiMode('custom'));

_on('btnAddKey', 'click', () => {
    if (S.apiMode !== 'custom') return;
    if (S.apiKeys.length >= 10) { toast('Máximo 10 chaves', '⚠️'); return; }
    S.apiKeys.push('');
    renderKeysList();
});

// ─── Import / Export / Limpar ─────────────────────────────────────────────────
_on('btnExport', 'click', exportChats);
_on('btnImport', 'click', importChats);
_on('btnClear',  'click', clearAll);

// ─── Scroll para o fim ────────────────────────────────────────────────────────
_on(btnScrollBottom, 'click', () => scrollDown());

// ─── Busca de chats ───────────────────────────────────────────────────────────
_on('searchChats', 'input', e => {
    searchFilter = e.target.value.trim();
    renderList();
});

// ─── Temas ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.theme-opt').forEach(t => {
    _on(t, 'click', () => setTheme(t.dataset.theme));
});

// ─── Anexo de arquivos ────────────────────────────────────────────────────────
_on('btnAttach', 'click', () => el('fileInput').click());

_on('fileInput', 'change', e => {
    handleFiles(e.target.files);
    e.target.value = '';
});

// ─── Drag & Drop ──────────────────────────────────────────────────────────────
_on(document, 'dragover', e => {
    e.preventDefault();
    el('dropOverlay').classList.add('show');
});

_on(document, 'dragleave', e => {
    if (e.relatedTarget === null) el('dropOverlay').classList.remove('show');
});

_on(document, 'drop', e => {
    e.preventDefault();
    el('dropOverlay').classList.remove('show');
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
});

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function _closeLightbox() {
    el('lightbox').classList.remove('show');
    el('lbImg').src = '';
}

_on('lightbox', 'click', _closeLightbox);

// ─── Atalhos de teclado ───────────────────────────────────────────────────────
_on(document, 'keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); newChat(); return; }
    if (e.ctrlKey && e.key === '/')               { e.preventDefault(); toggleSidebar(); return; }

    if (e.key === 'Escape') {
        el('lightbox').classList.contains('show') ? _closeLightbox() : closeSet();
    }
});
