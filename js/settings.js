/* ═══════════ SETTINGS MODAL ═══════════ */
'use strict';

const setModal = el('setModal');

// ─── Mapa declarativo dos campos do modal ─────────────────────────────────────
/**
 * Cada entrada descreve como popular e ler um campo do modal.
 *
 * populate : (node, value) → void   — preenche o elemento ao abrir
 * collect  : (node)        → value  — lê o valor ao salvar
 * display  : id do label   — atualizado via slider (opcional)
 * fmt      : formata o valor para o label (opcional)
 */
const FIELD_MAP = [
    {
        id: 'sysInp',
        populate: (n, v) => { n.value = v ?? ''; },
        collect:  n      => n.value.trim(),
        key: 'systemPrompt',
    },
    {
        id: 'tempSl', display: 'tempV', fmt: v => parseFloat(v).toFixed(1),
        populate: (n, v) => { n.value = v; },
        collect:  n      => parseFloat(n.value),
        key: 'temperature',
    },
    {
        id: 'tokSl', display: 'tokV', fmt: v => v,
        populate: (n, v) => { n.value = v; },
        collect:  n      => parseInt(n.value),
        key: 'maxTokens',
    },
    {
        id: 'topSl', display: 'topV', fmt: v => parseFloat(v).toFixed(2),
        populate: (n, v) => { n.value = v; },
        collect:  n      => parseFloat(n.value),
        key: 'topP',
    },
    {
        id: 'thinkTog',
        populate: (n, v) => { n.checked = v; },
        collect:  n      => n.checked,
        key: 'thinking',
    },
    {
        id: 'thinkSl', display: 'thinkV', fmt: v => v,
        populate: (n, v) => { n.value = v; },
        collect:  n      => parseInt(n.value),
        key: 'thinkingBudget',
    },
    {
        id: 'streamTog',
        populate: (n, v) => { n.checked = v; },
        collect:  n      => n.checked,
        key: 'streaming',
    },
    {
        id: 'fontSl', display: 'fontV', fmt: v => v + 'px',
        populate: (n, v) => { n.value = v ?? 14; },
        collect:  n      => parseInt(n.value),
        key: 'fontSize',
        onCollect: v => document.documentElement.style.setProperty('--font-size-chat', v + 'px'),
    },
];

// ─── Chaves API ───────────────────────────────────────────────────────────────
function renderKeysList() {
    const list = el('keysList');

    // Event delegation: remove listener anterior e adiciona um novo
    const fresh = list.cloneNode(false); // limpa listeners sem innerHTML = ''
    list.replaceWith(fresh);

    S.apiKeys.forEach((k, i) => {
        const row = document.createElement('div');
        row.className = 'key-row';
        row.innerHTML = `
            <span class="key-num">${i + 1}</span>
            <input type="password" class="sg-input mono key-inp"
                value="${esc(k || '')}" placeholder="AIzaSy..." data-idx="${i}">
            <button class="key-rm" data-idx="${i}" aria-label="Remover chave ${i + 1}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6"  y1="6" x2="18" y2="18"/>
                </svg>
            </button>`;
        el('keysList').appendChild(row);
    });

    // Delegation: um listener para todos os botões de remoção
    el('keysList').addEventListener('click', e => {
        const btn = e.target.closest('.key-rm');
        if (!btn) return;
        const idx = Number(btn.dataset.idx);
        if (S.apiKeys.length <= 1) S.apiKeys = [''];
        else S.apiKeys.splice(idx, 1);
        renderKeysList();
    });
}

// ─── Modo API ─────────────────────────────────────────────────────────────────
function setApiMode(mode) {
    S.apiMode = mode;
    el('apiModeDefault').classList.toggle('active', mode === 'default');
    el('apiModeCustom').classList.toggle('active', mode === 'custom');
    el('customKeysSection').style.display = mode === 'custom' ? 'flex' : 'none';
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function loadAvatarPreview() {
    const preview = el('avatarPreview');
    preview.innerHTML = S.userAvatar
        ? `<img src="${S.userAvatar}" style="width:100%;height:100%;object-fit:cover" alt="Avatar">`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5">
               <circle cx="12" cy="8" r="4"/>
               <path d="M5.5 21c0-4.14 2.91-7.5 6.5-7.5s6.5 3.36 6.5 7.5"/>
           </svg>`;
}

// ─── Tema ─────────────────────────────────────────────────────────────────────
function updThemeUI() {
    document.querySelectorAll('.theme-opt').forEach(t => {
        t.classList.toggle('active', t.dataset.theme === S.theme);
    });
}

function setTheme(theme) {
    updateSettings({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    updThemeUI();
}

// ─── Abrir modal ──────────────────────────────────────────────────────────────
function openSet() {
    setApiMode(S.apiMode || 'default');
    renderKeysList();

    // Popula todos os campos via FIELD_MAP
    for (const f of FIELD_MAP) {
        const node = el(f.id);
        if (!node) continue;
        f.populate(node, S[f.key]);
        if (f.display) el(f.display).textContent = f.fmt(S[f.key]);
    }

    el('thinkBudgetGrp').style.display = S.thinking ? 'flex' : 'none';

    loadAvatarPreview();
    updThemeUI();
    setModal.classList.add('show');
}

// ─── Fechar modal ─────────────────────────────────────────────────────────────
function closeSet() {
    setModal.classList.remove('show');
}

// ─── Salvar configurações ─────────────────────────────────────────────────────
function saveSet() {
    const patch = {};

    // Coleta todos os campos via FIELD_MAP
    for (const f of FIELD_MAP) {
        const node = el(f.id);
        if (!node) continue;
        const value  = f.collect(node);
        patch[f.key] = value;
        f.onCollect?.(value);
    }

    // Modo API e chaves
    patch.apiMode = el('apiModeDefault').classList.contains('active') ? 'default' : 'custom';

    if (patch.apiMode === 'custom') {
        const keys = Array.from(document.querySelectorAll('.key-inp'))
            .map(i => i.value.trim())
            .filter(Boolean)
            .slice(0, 10);
        patch.apiKeys = keys.length ? keys : [''];
    }

    patch.currentKeyIdx = 0; // reseta rotação ao salvar

    updateSettings(patch);
    updBadge();
    closeSet();
    toast('Configurações salvas!', '✅');
}

// ─── Resetar configurações ────────────────────────────────────────────────────
async function resetSet() {
    if (!await customConfirm('Resetar todas as configurações para o padrão?', { danger: true, confirmText: 'Resetar' })) return;

    resetSettings(); // do state.js
    updBadge();
    el('selModel').value = S.model;
    document.documentElement.setAttribute('data-theme', S.theme);
    openSet();
    toast('Configurações resetadas', 'ℹ️');
}
