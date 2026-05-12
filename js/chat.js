/* ═══════════ CHAT MANAGEMENT ═══════════ */
'use strict';

// ─── Constantes ───────────────────────────────────────────────────────────────
const TITLE_MAX_LEN  = 38;
const FORK_TITLE_LEN = 30;

// ─── Factory de chat ──────────────────────────────────────────────────────────
/**
 * Cria um objeto de chat com os campos obrigatórios.
 * @param {Partial<Chat>} overrides
 */
function createChatObj(overrides = {}) {
    return {
        id:        uid(),
        title:     'Novo Chat',
        messages:  [],
        createdAt: Date.now(),
        pinned:    false,
        ...overrides,
    };
}

// ─── Acesso ao chat ativo ─────────────────────────────────────────────────────
/** Retorna o objeto do chat ativo ou undefined */
function active() {
    return chats.find(c => c.id === activeId);
}

// ─── Ações de chat ────────────────────────────────────────────────────────────

/**
 * Cria um novo chat, torna-o ativo e atualiza a UI.
 * @returns {Chat}
 */
function newChat() {
    const c = createChatObj();
    chats.unshift(c);
    _setActive(c.id);
    closeMobile();
    el('inp').focus();
    return c;
}

/**
 * Muda o chat ativo para o id fornecido.
 * @param {string} id
 */
function switchChat(id) {
    if (id === activeId) return; // nada a fazer
    _setActive(id);
    closeMobile();
}

/**
 * Remove um chat. Se era o ativo, seleciona o próximo disponível.
 * @param {string} id
 */
function delChat(id) {
    const idx = chats.findIndex(c => c.id === id);
    if (idx === -1) return;

    chats.splice(idx, 1);

    if (activeId === id) {
        // Tenta manter o chat na mesma posição da lista (ou o anterior)
        const nextIdx = Math.min(idx, chats.length - 1);
        activeId = chats.length ? chats[nextIdx].id : null;
    }

    save();
    renderList();
    renderMsgs();
}

/**
 * Renomeia um chat via prompt nativo.
 * @param {string} id
 */
function renChat(id) {
    const c = chats.find(x => x.id === id);
    if (!c) return;

    const name = prompt('Novo nome:', c.title)?.trim();
    if (!name) return;

    c.title = name;
    save();
    renderList();
}

/**
 * Alterna o estado de fixado de um chat.
 * @param {string} id
 */
function pinChat(id) {
    const c = chats.find(x => x.id === id);
    if (!c) return;

    c.pinned = !c.pinned;
    save();
    renderList();
    toast(c.pinned ? 'Chat fixado' : 'Chat desfixado', c.pinned ? '📌' : '📍');
}

/**
 * Cria um fork do chat a partir de uma mensagem específica.
 * As mensagens até msgIdx (inclusive) são copiadas para o novo chat.
 *
 * @param {string} chatId
 * @param {number} msgIdx - índice da última mensagem a incluir no fork
 */
function forkChat(chatId, msgIdx) {
    const orig = chats.find(x => x.id === chatId);
    if (!orig) return;

    const c = createChatObj({
        title:      '🔀 ' + orig.title.substring(0, FORK_TITLE_LEN),
        messages:   structuredClone(orig.messages.slice(0, msgIdx + 1)),
        forkedFrom: orig.id,
    });

    chats.unshift(c);
    _setActive(c.id);
    toast('Chat bifurcado!', '🔀');
}

// ─── Utilitários de mensagem ──────────────────────────────────────────────────

/**
 * Gera título automático a partir da primeira mensagem do chat.
 * Só atua se o título ainda for o padrão "Novo Chat".
 *
 * @param {Chat} c
 */
function autoTitle(c) {
    if (!c || c.title !== 'Novo Chat' || !c.messages.length) return;

    const firstText = c.messages[0].content ?? '';
    c.title = firstText.length > TITLE_MAX_LEN
        ? firstText.substring(0, TITLE_MAX_LEN) + '…'
        : firstText;

    save();
    renderList();
}

/**
 * Abre prompt para editar uma mensagem do usuário.
 * Trunca o histórico a partir desse ponto e reenvia.
 *
 * @param {Chat}   chat
 * @param {number} msgIdx
 */
function editMessage(chat, msgIdx) {
    if (!chat || generating) return;

    const m = chat.messages[msgIdx];
    if (!m || m.role !== 'user') return;

    const newContent = prompt('Editar mensagem:', m.content)?.trim();
    if (!newContent) return;

    chat.messages = chat.messages.slice(0, msgIdx);
    save();
    renderMsgs();

    el('inp').value = newContent;
    updBtn();
    send();
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

/**
 * Define o chat ativo, persiste e atualiza a UI.
 * Centraliza a lógica que antes se repetia em newChat, switchChat, forkChat.
 *
 * @param {string|null} id
 */
function _setActive(id) {
    activeId = id;
    save();
    renderList();
    renderMsgs();
}
