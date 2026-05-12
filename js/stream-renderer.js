/* ═══════════ STREAM RENDERER ═══════════ */
'use strict';

/**
 * Renderizador progressivo de markdown para streaming SSE.
 *
 * Divide o texto acumulado em "blocos lógicos" (parágrafos, code blocks, headings, etc.)
 * Blocos completos são renderizados via md() uma única vez e congelados no DOM.
 * O último bloco (possivelmente incompleto) é re-renderizado a cada chunk.
 * Blocos congelados nunca são tocados novamente — preserva botões, estado, etc.
 */
class StreamRenderer {
    /**
     * @param {HTMLElement} container - div.msg-text.streaming onde o conteúdo é inserido
     */
    constructor(container) {
        this._container = container;
        this._fullText = '';
        this._frozenCount = 0;
        this._frozenText = '';
        this._pendingEl = null;
        this._rafQueued = false;
        this._dirty = false;
    }

    /**
     * Alimenta o renderer com o texto COMPLETO acumulado até agora.
     * @param {string} fullText
     */
    update(fullText) {
        this._fullText = fullText;
        this._dirty = true;

        if (!this._rafQueued) {
            this._rafQueued = true;
            requestAnimationFrame(() => {
                this._rafQueued = false;
                if (this._dirty) {
                    this._dirty = false;
                    this._flush();
                }
            });
        }
    }

    /**
     * Chamado ao final do stream — renderiza tudo que sobrou como definitivo.
     */
    finalize() {
        const blocks = this._splitBlocks(this._fullText);
        this._freezeUpTo(blocks, blocks.length);
        if (this._pendingEl) {
            this._pendingEl.remove();
            this._pendingEl = null;
        }
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    _flush() {
        const blocks = this._splitBlocks(this._fullText);

        if (blocks.length === 0) {
            this._updatePending('');
            return;
        }

        const completeCount = Math.max(0, blocks.length - 1);

        if (completeCount > this._frozenCount) {
            this._freezeUpTo(blocks, completeCount);
        }

        const lastBlock = blocks[blocks.length - 1];
        const isLastComplete = this._isBlockComplete(lastBlock);

        if (isLastComplete && blocks.length > this._frozenCount) {
            this._freezeUpTo(blocks, blocks.length);
            this._updatePending('');
        } else {
            this._updatePending(lastBlock);
        }
    }

    /**
     * Divide o texto em blocos lógicos de markdown.
     */
    _splitBlocks(text) {
        if (!text) return [];

        const blocks = [];
        let remaining = text;

        while (remaining.length > 0) {
            // Code block completo
            const cbMatch = remaining.match(/^([ \t]*```[\s\S]*?```[ \t]*\n?)/);
            if (cbMatch) {
                blocks.push(cbMatch[1]);
                remaining = remaining.slice(cbMatch[1].length);
                continue;
            }

            // Code block possivelmente incompleto
            const cbOpen = remaining.match(/^([ \t]*```)/);
            if (cbOpen) {
                const closeIdx = remaining.indexOf('```', cbOpen[1].length);
                if (closeIdx === -1) {
                    blocks.push(remaining);
                    break;
                }
                const endIdx = remaining.indexOf('\n', closeIdx + 3);
                const slice = endIdx === -1
                    ? remaining
                    : remaining.slice(0, endIdx + 1);
                blocks.push(slice);
                remaining = remaining.slice(slice.length);
                continue;
            }

            // Texto normal: separado por \n\n
            const dnl = remaining.indexOf('\n\n');
            if (dnl !== -1) {
                blocks.push(remaining.slice(0, dnl + 2));
                remaining = remaining.slice(dnl + 2);
                continue;
            }

            // Resto — bloco pendente
            blocks.push(remaining);
            break;
        }

        return blocks;
    }

    /**
     * Verifica se um bloco está completo para congelamento.
     */
    _isBlockComplete(block) {
        if (!block) return false;
        const trimmed = block.trimEnd();

        if (/^\s*```/.test(trimmed)) {
            return (trimmed.match(/```/g) || []).length >= 2;
        }

        if (block.endsWith('\n\n')) return true;
        if (/^#{1,3} .+\n/.test(trimmed)) return true;
        if (/^---\s*$/.test(trimmed)) return true;

        return false;
    }

    /**
     * Congela blocos de this._frozenCount até upTo.
     */
    _freezeUpTo(blocks, upTo) {
        const newBlocks = blocks.slice(this._frozenCount, upTo);
        if (newBlocks.length === 0) return;

        const newText = newBlocks.join('');
        const html = md(newText);

        const temp = document.createElement('div');
        temp.innerHTML = html;

        const ref = this._pendingEl;
        while (temp.firstChild) {
            if (ref) {
                this._container.insertBefore(temp.firstChild, ref);
            } else {
                this._container.appendChild(temp.firstChild);
            }
        }

        this._frozenCount = upTo;
        this._frozenText = blocks.slice(0, upTo).join('');
    }

    /**
     * Atualiza o elemento pendente (último bloco, possivelmente incompleto).
     */
    _updatePending(blockText) {
        if (!blockText) {
            if (this._pendingEl) {
                this._pendingEl.remove();
                this._pendingEl = null;
            }
            return;
        }

        if (!this._pendingEl) {
            this._pendingEl = document.createElement('div');
            this._pendingEl.className = 'sr-pending';
            this._container.appendChild(this._pendingEl);
        }

        const trimmed = blockText.trimStart();
        if (/^```/.test(trimmed) && (trimmed.match(/```/g) || []).length < 2) {
            this._pendingEl.innerHTML = this._renderPartialCodeBlock(trimmed);
        } else {
            this._pendingEl.innerHTML = this._renderPartialText(blockText);
        }
    }

    /**
     * Renderiza um code block ainda não fechado.
     */
    _renderPartialCodeBlock(text) {
        const firstLine = text.indexOf('\n');
        let lang = '';
        let code = '';

        if (firstLine !== -1) {
            lang = text.slice(3, firstLine).trim();
            code = text.slice(firstLine + 1);
        } else {
            lang = text.slice(3).trim();
        }

        return `<div class="code-wrap">
            <div class="code-head">
                <span>${esc(lang) || 'code'}</span>
                <button class="copy-btn" onclick="R.copyEl(this)">Copiar</button>
            </div>
            <pre><code>${esc(code)}</code></pre>
        </div>`;
    }

    /**
     * Renderiza texto parcial sanitizando construtos markdown incompletos.
     */
    _renderPartialText(text) {
        let safe = text;

        safe = this._balanceMarkers(safe, '**');
        safe = this._balanceMarkers(safe, '~~');

        const singleStars = (safe.match(/(?<!\*)\*(?!\*)/g) || []).length;
        if (singleStars % 2 !== 0) {
            const lastIdx = safe.lastIndexOf('*');
            if (lastIdx !== -1 && safe[lastIdx - 1] !== '*' && safe[lastIdx + 1] !== '*') {
                safe = safe.slice(0, lastIdx) + safe.slice(lastIdx + 1);
            }
        }

        safe = safe.replace(/\[([^\]]*)\]\([^)]*$/, '[$1](');
        safe = safe.replace(/\[([^\]]*)$/, '[$1');

        return md(safe);
    }

    /**
     * Remove última ocorrência de marcador se número de ocorrências é ímpar.
     */
    _balanceMarkers(text, marker) {
        let count = 0;
        let searchFrom = 0;
        let idx;

        while ((idx = text.indexOf(marker, searchFrom)) !== -1) {
            count++;
            searchFrom = idx + marker.length;
        }

        if (count % 2 !== 0) {
            const lastIdx = text.lastIndexOf(marker);
            return text.slice(0, lastIdx) + text.slice(lastIdx + marker.length);
        }

        return text;
    }
}
