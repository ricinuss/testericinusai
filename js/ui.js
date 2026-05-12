/* ═══════════ UI CONTROLS ═══════════ */
'use strict';

// ─── Referências DOM fixas ────────────────────────────────────────────────────
const sidebar         = el('sidebar');
const sOverlay        = el('sOverlay');
const btnSend         = el('btnSend');
const btnScrollBottom = el('btnScrollBottom');
const charCountEl     = el('charCount');

// ─── Breakpoint mobile ────────────────────────────────────────────────────────
const MOBILE_BP = 768;
const isMobile  = () => window.innerWidth <= MOBILE_BP;

// ─── Limiares de contagem de caracteres ──────────────────────────────────────
const CHAR_WARN = 20_000;
const CHAR_OVER = 30_000;

// ─── SVGs do botão de envio ───────────────────────────────────────────────────
const SVG_SEND = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
</svg>`;

const SVG_STOP = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2"/>
</svg>`;

// ─── Botão enviar / parar ─────────────────────────────────────────────────────
/**
 * Atualiza o estado visual do botão de envio.
 * Em geração: botão de parar (sempre habilitado).
 * Em idle: botão de enviar (desabilitado se sem conteúdo).
 */
function updBtn() {
    const hasContent = el('inp').value.trim().length > 0 || pendingImages.length > 0;

    if (generating) {
        btnSend.disabled  = false;
        btnSend.className = 'btn-send stop';
        btnSend.innerHTML = SVG_STOP;
    } else {
        btnSend.disabled  = !hasContent;
        btnSend.className = 'btn-send';
        btnSend.innerHTML = SVG_SEND;
    }
}

// ─── Contagem de caracteres ───────────────────────────────────────────────────
/**
 * Atualiza o indicador de caracteres do input.
 * Classes: (vazio) → '' | normal → '' | warn → 'warn' | over → 'over'
 */
function updCharCount() {
    const len = el('inp').value.length;

    if (len === 0) {
        charCountEl.textContent = '';
        charCountEl.className   = 'char-count';
        return;
    }

    charCountEl.textContent = len.toLocaleString('pt-BR');
    charCountEl.className   = 'char-count' + (
        len > CHAR_OVER ? ' over'  :
        len > CHAR_WARN ? ' warn'  : ''
    );
}

// ─── Badge (reservado) ────────────────────────────────────────────────────────
/** Mantido para não quebrar chamadas externas. */
function updBadge() {}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
/**
 * Alterna visibilidade da sidebar.
 * Em mobile, sincroniza o overlay.
 */
function toggleSidebar() {
    const isHidden = sidebar.classList.toggle('hide');
    if (isMobile()) {
        sOverlay.classList.toggle('show', !isHidden);
    }
}

/**
 * Fecha a sidebar em mobile (ex: ao selecionar um chat).
 */
function closeMobile() {
    if (!isMobile()) return;
    sidebar.classList.add('hide');
    sOverlay.classList.remove('show');
}

// ─── Botão scroll-to-bottom ───────────────────────────────────────────────────
const SCROLL_THRESHOLD = 200; // px do fundo para mostrar o botão

/**
 * Registra o observer de scroll que controla a visibilidade
 * do botão "descer ao fim".
 * Usa uma flag para evitar escritas desnecessárias no DOM.
 */
function initScrollWatcher() {
    const cw = el('chatWrap');
    let   visible = false;

    cw.addEventListener('scroll', () => {
        const dist      = cw.scrollHeight - cw.scrollTop - cw.clientHeight;
        const shouldShow = dist > SCROLL_THRESHOLD;

        if (shouldShow === visible) return; // sem mudança, não toca o DOM
        visible = shouldShow;
        btnScrollBottom.style.display = shouldShow ? 'flex' : 'none';
    }, { passive: true });
}

function updTitle(state) {
    const base = 'RicinusAI';
    const chat = active();

    if (state === 'generating') {
        document.title = `⏳ ${base} — pensando...`;
    } else if (state === 'done') {
        document.title = `✅ Resposta pronta — ${base}`;
        setTimeout(() => updTitle('idle'), 3000);
    } else {
        document.title = chat?.title && chat.title !== 'Novo Chat'
            ? `${chat.title} — ${base}`
            : base;
    }
}
