/* ═══════════ SEND & STREAMING ═══════════ */
'use strict';

// ─── Detecção de dados sensíveis ──────────────────────────────────────────────
const SENSITIVE_PATTERNS = [
    /\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-\.\s]?\d{2}/,          // CPF
    /\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}/,            // Cartão
    /(senha|password|secret)\s*[:=]\s*\S+/i,                 // Credencial
];

function checkSensitiveData(text) {
    return SENSITIVE_PATTERNS.some(p => p.test(text));
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function _showTyping() {
    const div = document.createElement('div');
    div.className = 'msg';
    div.id        = 'typInd';
    div.innerHTML = `
        <div class="msg-av a">${SVG.botAvatar}</div>
        <div class="msg-body">
            <div class="msg-name">RicinusAI</div>
            <div class="typing">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
        </div>`;
    chatMsgs.appendChild(div);
    scrollDown();
}

function _removeTyping() {
    document.getElementById('typInd')?.remove();
}

// ─── Helpers de geração ───────────────────────────────────────────────────────
function _elapsedSec(t0) {
    return ((Date.now() - t0) / 1000).toFixed(1);
}

function _buildModelMsg(txt, think, u, t0, keyUsed) {
    return {
        role:     'model',
        content:  txt,
        thinking: think || null,
        meta: {
            inTok:    u.promptTokenCount,
            outTok:   u.candidatesTokenCount,
            thinkTok: u.thoughtsTokenCount,
            dur:      _elapsedSec(t0),
            model:    S.model,
            keyUsed,
        },
    };
}

/**
 * Lógica comum ao finalizar uma geração (send e regen).
 * Limpa estado, persiste e atualiza UI.
 */
function _afterGen() {
    generating = false;
    aborter    = null;
    updBtn();
    save();
    renderList();
    scrollDown();
}

/**
 * Exibe uma mensagem de erro inline no chat e mostra um toast.
 * @param {Chat}   c
 * @param {number} t0
 * @param {string} errText
 */
function _showErrorMsg(c, t0, errText) {
    const msg = {
        role:    'model',
        content: `❌ **Erro:** ${errText}`,
        meta:    { dur: _elapsedSec(t0) },
    };
    c.messages.push(msg);
    addMsgDOM(msg, c.messages.length - 1);
    toast('Nossos servidores estão enfrentando instabilidades. Tente novamente.', '⚠️');
}

// ─── Envio principal ──────────────────────────────────────────────────────────
async function send() {
    const inp  = el('inp');
    const text = inp.value.trim();

    if ((!text && pendingImages.length === 0) || generating) return;
    if (!getValidKeys().length) { toast('Configure uma chave API', '⚠️'); openSet(); return; }

    // FIX: usa customConfirm (async) em vez do confirm() nativo do browser
    // — mantém padrão visual do app e não bloqueia a thread
    if (checkSensitiveData(text)) {
        if (!await customConfirm(
            '⚠️ Detectamos o que pode ser um dado sensível (CPF, cartão ou senha). Deseja enviar mesmo assim?',
            { confirmText: 'Enviar mesmo assim' }
        )) return;
    }

    // Garante chat ativo
    let c = active() ?? newChat();

    // Monta e adiciona mensagem do usuário
    const uMsg = { role: 'user', content: text };
    if (pendingImages.length > 0) {
        uMsg.images  = [...pendingImages];
        pendingImages = [];
        renderAttachPreview();
    }
    c.messages.push(uMsg);
    autoTitle(c);
    save();

    // Limpa o input
    inp.value        = '';
    inp.style.height = 'auto';
    updBtn();
    updCharCount();

    // Renderiza a mensagem do usuário
    if (chatMsgs.querySelector('.welcome')) chatMsgs.innerHTML = '';
    addMsgDOM(uMsg, c.messages.length - 1);
    scrollDown();

    await _generate(c);
}

// ─── Parar geração ────────────────────────────────────────────────────────────
function stopGen() {
    aborter?.abort();
}

// ─── Regenerar ────────────────────────────────────────────────────────────────
async function regen() {
    const c = active();
    if (!c || generating) return;

    // Remove a última mensagem do modelo
    const lastModelIdx = [...c.messages].reverse().findIndex(m => m.role === 'model');
    if (lastModelIdx === -1) return;
    c.messages.splice(c.messages.length - 1 - lastModelIdx, 1);

    // Garante que a última mensagem restante é do usuário
    if (c.messages.at(-1)?.role !== 'user') return;

    save();
    renderMsgs();

    await _generate(c);
}

// ─── Núcleo de geração (compartilhado por send, regen e continuar) ────────────
/**
 * Exibe o typing indicator, chama a API e despacha para o handler correto.
 * Centraliza o try/catch/finally que antes estava duplicado em send e regen.
 *
 * @param {Chat} c - chat ativo
 */
async function _generate(c) {
    _showTyping();
    updTitle('generating');
    generating = true;
    updBtn();

    const t0 = Date.now();
    let aborted = false;

    try {
        const res = await callAPI(c.messages);
        _removeTyping();

        if (res.isStream) await handleStream(res.stream, c, t0, res.keyUsed);
        else               handleFull(res.data, c, t0, res.keyUsed);
    } catch (e) {
        _removeTyping();
        if (e.name === 'AbortError') {
            aborted = true;
            toast('Cancelado', '🛑');
        } else {
            _showErrorMsg(c, t0, e.message);
        }
    } finally {
        _afterGen();
        // FIX: título volta para 'idle' em cancelamento, não 'done'
        updTitle(aborted ? 'idle' : 'done');
    }
}

// ─── Handler: resposta completa (não-stream) ──────────────────────────────────
function handleFull(data, c, t0, keyUsed) {
    const cand = data.candidates?.[0];

    // FIX: quando !cand, cand é undefined — cand?.finishReason seria sempre undefined.
    // Verifica finishReason no cand existente quando o content está ausente/bloqueado.
    if (!cand || !cand.content?.parts?.length) {
        throw new Error(cand?.finishReason
            ? `Resposta bloqueada: ${cand.finishReason}`
            : 'Resposta vazia');
    }

    let txt = '', think = '';
    for (const p of cand.content.parts) {
        if (p.thought) think += p.text ?? '';
        else           txt   += p.text ?? '';
    }

    const msg = _buildModelMsg(txt, think, data.usageMetadata ?? {}, t0, keyUsed);
    c.messages.push(msg);
    addMsgDOM(msg, c.messages.length - 1);
    scrollDown();
}

// ─── Handler: stream SSE ──────────────────────────────────────────────────────
async function handleStream(stream, c, t0, keyUsed) {
    let txt = '', think = '', lastU = null;
    let aborted = false;
    const sid = uid();

    // Monta o nó de streaming
    const d = document.createElement('div');
    d.className = 'msg';
    d.innerHTML = `
        <div class="msg-av a">${SVG.botAvatar}</div>
        <div class="msg-body">
            <div class="msg-name">RicinusAI</div>
            <div class="think-box" id="stThink_${sid}" style="display:none">
                <div class="think-head" id="stThinkH_${sid}">
                    <span class="think-arrow" id="stThinkAr_${sid}">▶</span> Pensando...
                </div>
                <div class="think-body" id="stThinkB_${sid}"></div>
            </div>
            <div class="msg-text streaming" id="stTxt_${sid}"></div>
        </div>`;
    chatMsgs.appendChild(d);
    scrollDown();

    // Referências locais para evitar getElementById repetido no loop
    const stTxt    = el(`stTxt_${sid}`);
    const stThink  = el(`stThink_${sid}`);
    const stThinkB = el(`stThinkB_${sid}`);

    // Instancia o renderer progressivo
    const renderer = new StreamRenderer(stTxt);

    el(`stThinkH_${sid}`)?.addEventListener('click', () => {
        stThinkB.classList.toggle('open');
        el(`stThinkAr_${sid}`)?.classList.toggle('open');
    });

    // Loop de leitura do stream
    try {
        for await (const chunk of parseSSE(stream)) {
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (!parts) continue;

            for (const p of parts) {
                if (p.thought) {
                    think += p.text ?? '';
                    stThink.style.display = 'block';
                    stThinkB.innerHTML    = md(think);
                } else {
                    txt += p.text ?? '';
                    renderer.update(txt);
                }
            }
            if (chunk.usageMetadata) lastU = chunk.usageMetadata;
            scrollDown();
        }
    } catch (e) {
        // FIX: re-lança AbortError para _generate poder exibir toast 'Cancelado'
        // — antes era swallowed aqui e o usuário não recebia nenhum feedback
        if (e.name === 'AbortError') {
            aborted = true;
            throw e;
        }
        throw e;
    }

    // Finaliza o renderer — congela tudo que resta
    renderer.finalize();

    // Finaliza UI do streaming
    stTxt.classList.remove('streaming');
    _appendStreamActions(d, txt, c, t0, keyUsed, lastU ?? {});

    // Salva mensagem no histórico
    const msg = _buildModelMsg(txt, think, lastU ?? {}, t0, keyUsed);
    c.messages.push(msg);
}

// ─── Botões de ação pós-stream ────────────────────────────────────────────────
function _appendStreamActions(msgNode, txt, c, t0, keyUsed, u) {
    const body   = msgNode.querySelector('.msg-body');
    const msgIdx = c.messages.length; // índice que a mensagem terá após ser salva

    // Word count
    const wc    = wordCount(txt);
    const wcDiv = document.createElement('div');
    wcDiv.className   = 'msg-word-count';
    wcDiv.textContent = `${wc} palavra${wc !== 1 ? 's' : ''}`;
    body.appendChild(wcDiv);

    // FIX: inclui Fork — consistência com _buildMsgNode
    const acts = document.createElement('div');
    acts.className = 'msg-acts';
    acts.innerHTML = `
        <button class="act-btn" data-action="copy">📋 Copiar</button>
        <button class="act-btn" data-action="regen">🔄 Regenerar</button>
        <button class="act-btn" data-action="fork">🔀 Bifurcar</button>
        <button class="act-btn" data-action="cont">▶️ Continuar</button>`;

    acts.addEventListener('click', async e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        switch (btn.dataset.action) {
            case 'copy':
                navigator.clipboard.writeText(txt).then(() => {
                    btn.textContent = '✅ Copiado!';
                    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
                });
                break;

            case 'regen':
                regen();
                break;

            case 'fork':
                forkChat(c.id, msgIdx);
                break;

            case 'cont': {
                if (generating) return;
                const chat = active();
                if (!chat || chat.messages.at(-1)?.role !== 'model') return;

                chat.messages.push({ role: 'user', content: 'Continue a resposta do ponto onde parou.' });

                // FIX: desabilita durante a geração e reabilita ao terminar
                btn.disabled     = true;
                btn.textContent  = '⏳ Gerando...';
                await _generate(chat);
                btn.disabled     = false;
                btn.textContent  = '▶️ Continuar';
                break;
            }
        }
    });

    body.appendChild(acts);
}
