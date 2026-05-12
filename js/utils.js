/* ═══════════ UTILITIES ═══════════ */
'use strict';

// ─── Referências DOM fixas ────────────────────────────────────────────────────
const toastsEl = el('toasts');

// ─── IDs únicos ───────────────────────────────────────────────────────────────
/**
 * Gera um ID único para chats e elementos de streaming.
 * Usa crypto.randomUUID quando disponível; fallback para Date + random.
 */
function uid() {
    if (typeof crypto?.randomUUID === 'function') {
        return 'c' + crypto.randomUUID().replace(/-/g, '');
    }
    return 'c' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
const TOAST_DURATION = 3000;

/**
 * Exibe uma notificação temporária no canto da tela.
 * @param {string} msg  - texto da mensagem
 * @param {string} icon - emoji ou texto curto de ícone
 */
function toast(msg, icon = 'ℹ️') {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.innerHTML = `<span aria-hidden="true">${icon}</span><span>${esc(msg)}</span>`;
    toastsEl.appendChild(t);

    const cleanup = () => { if (t.isConnected) t.remove(); };
    t.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, TOAST_DURATION);
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────
const _escNode = document.createElement('div');

/**
 * Escapa uma string para uso seguro em innerHTML.
 * @param {string} s
 * @returns {string}
 */
function esc(s) {
    if (!s) return '';
    _escNode.textContent = s;
    return _escNode.innerHTML;
}

// ─── Contagem de palavras ─────────────────────────────────────────────────────
/**
 * Conta palavras num texto.
 * Ignora espaços múltiplos e tokens vazios.
 * @param {string} text
 * @returns {number}
 */
function wordCount(text) {
    if (!text?.trim()) return 0;
    return text.trim().split(/\s+/).length;
}

// ─── Markdown → HTML ──────────────────────────────────────────────────────────

const _BLOCK_TAGS = ['h1','h2','h3','ul','ol','div','blockquote','hr','pre'];

const _RE = {
    codeBlock:   /```(\w*)\n([\s\S]*?)```/g,
    inlineCode:  /`([^`]+)`/g,
    restoreInl:  /%%INLINE_(\d+)%%/g,
    restoreBlk:  /%%CODEBLOCK_(\d+)%%/g,
    bold:        /\*\*(.+?)\*\*/g,
    italic:      /\*(.+?)\*/g,
    strike:      /~~(.+?)~~/g,
    h3:          /^### (.+)$/gm,
    h2:          /^## (.+)$/gm,
    h1:          /^# (.+)$/gm,
    blockquote:  /^&gt; (.+)$/gm,
    hr:          /^---$/gm,
    link:        /\[([^\]]+)\]\(([^)]+)\)/g,
    oliLine:     /^(\d+)\. (.+)$/gm,
    oliGroup:    /((?:<oli>[\s\S]*?<\/oli>\n?)+)/g,
    uliLine:     /^[\-\*] (.+)$/gm,
    uliGroup:    /((?:<uli>[\s\S]*?<\/uli>\n?)+)/g,
    emptyP:      /<p><\/p>/g,
    doubleNL:    /\n\n/g,
};

/**
 * Converte um subconjunto de Markdown para HTML seguro.
 * Protege blocos de código antes de qualquer transformação e restaura ao final.
 *
 * @param {string} text
 * @returns {string} HTML sanitizado
 */
function md(text) {
    if (!text) return '';

    let h = text;
    const codeBlocks = [];
    const inlineCodes = [];

    // 1. Protege blocos de código (``` ... ```)
    h = h.replace(_RE.codeBlock, (_, lang, code) => {
        codeBlocks.push({ lang, code: code.trimEnd() });
        return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
    });

    // 2. Protege código inline (` ... `)
    h = h.replace(_RE.inlineCode, (_, code) => {
        inlineCodes.push(code);
        return `%%INLINE_${inlineCodes.length - 1}%%`;
    });

    // 3. Escapa o HTML restante
    h = esc(h);

    // 4. Restaura código inline
    h = h.replace(_RE.restoreInl, (_, i) =>
        `<code>${esc(inlineCodes[+i])}</code>`
    );

    // 5. Restaura blocos de código com header + botão copiar
    h = h.replace(_RE.restoreBlk, (_, i) => {
        const { lang, code } = codeBlocks[+i];
        return `<div class="code-wrap">
            <div class="code-head">
                <span>${esc(lang) || 'code'}</span>
                <button class="copy-btn" onclick="R.copyEl(this)">Copiar</button>
            </div>
            <pre><code>${esc(code)}</code></pre>
        </div>`;
    });

    // 6. Formatação inline
    h = h
        .replace(_RE.bold,       '<strong>$1</strong>')
        .replace(_RE.italic,     '<em>$1</em>')
        .replace(_RE.strike,     '<del>$1</del>');

    // 7. Headings
    h = h
        .replace(_RE.h3, '<h3>$1</h3>')
        .replace(_RE.h2, '<h2>$1</h2>')
        .replace(_RE.h1, '<h1>$1</h1>');

    // 8. Blockquote e HR
    h = h
        .replace(_RE.blockquote, '<blockquote>$1</blockquote>')
        .replace(_RE.hr,         '<hr>');

    // 9. Links
    h = h.replace(_RE.link,
        (_, label, href) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`
    );

    // 10. Listas ordenadas
    h = h
        .replace(_RE.oliLine,  '<oli>$2</oli>')
        .replace(_RE.oliGroup, m => '<ol>' + m.replace(/<\/?oli>/g, t => t.replace('oli','li')) + '</ol>');

    // 11. Listas não-ordenadas
    h = h
        .replace(_RE.uliLine,  '<uli>$1</uli>')
        .replace(_RE.uliGroup, m => '<ul>' + m.replace(/<\/?uli>/g, t => t.replace('uli','li')) + '</ul>');

    // 12. Parágrafos
    h = '<p>' + h.replace(_RE.doubleNL, '</p><p>') + '</p>';
    h = h.replace(_RE.emptyP, '');

    // 13. Remove <p> em torno de elementos de bloco
    for (const tag of _BLOCK_TAGS) {
        h = h
            .replace(new RegExp(`<p>(<${tag}[> ])`, 'g'), '$1')
            .replace(new RegExp(`(</${tag}>)<\\/p>`,  'g'), '$1');
    }
    h = h
        .replace(/<p>(<hr>)/g,  '$1')
        .replace(/(<hr>)<\/p>/g, '$1');

    return h;
}

// ─── Avatares SVG ─────────────────────────────────────────────────────────────
const SVG = {
    get userAvatar() {
        if (S.userAvatar) {
            return `<img src="${S.userAvatar}"
                style="width:100%;height:100%;object-fit:cover;border-radius:50%"
                alt="Seu avatar">`;
        }
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
            style="color:var(--tx-3)" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/>
            <path d="M5.5 21c0-4.14 2.91-7.5 6.5-7.5s6.5 3.36 6.5 7.5"/>
        </svg>`;
    },

    botAvatar: `<svg viewBox="0 0 24 24" fill="none" stroke="white"
        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.73 12.73l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>`,
};

// ─── API global para botões gerados via innerHTML ─────────────────────────────
window.R = {
    /** Copia o conteúdo do bloco de código mais próximo ao botão clicado. */
    copyEl(btn) {
        const code = btn.closest('.code-wrap')?.querySelector('pre code');
        if (!code) return;
        navigator.clipboard.writeText(code.textContent).then(() => {
            btn.textContent = 'Copiado!';
            setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
        });
    },

    /** Abre o lightbox com a imagem fornecida. */
    openLightbox(src) {
        el('lbImg').src = src;
        el('lightbox').classList.add('show');
    },
};
