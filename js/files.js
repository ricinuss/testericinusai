/* ═══════════ FILES, IMAGES, IMPORT/EXPORT ═══════════ */
'use strict';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MAX_IMAGE_SIZE  = 20 * 1024 * 1024; // 20 MB
const MAX_IMAGES      = 5;
const EXPORT_VERSION  = 3;                // bump: agora inclui avatar e thumbs
const THUMB_MAX_PX    = 144;              // lado maior do thumbnail de export
const THUMB_QUALITY   = 0.5;             // qualidade JPEG do thumbnail

// SVG de fechar reutilizável
const CLOSE_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6"  x2="6"  y2="18"/>
    <line x1="6"  y1="6"  x2="18" y2="18"/>
</svg>`;

// ─── Conversão de arquivo ─────────────────────────────────────────────────────
/**
 * Lê um arquivo de imagem, gera o base64 original e um thumbnail 144p.
 * @param {File} file
 * @returns {Promise<ImageData>}
 */
function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        if (file.size > MAX_IMAGE_SIZE) {
            return reject(new Error(`Imagem muito grande (máx ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`));
        }

        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                // ─── Gera thumbnail 144p para export ─────────────────────────
                const ratio   = Math.min(THUMB_MAX_PX / img.width, THUMB_MAX_PX / img.height, 1);
                const canvas  = document.createElement('canvas');
                canvas.width  = Math.round(img.width  * ratio);
                canvas.height = Math.round(img.height * ratio);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                const previewThumb = canvas.toDataURL('image/jpeg', THUMB_QUALITY);

                const preview = reader.result; // original — exibido no chat e enviado à API

                resolve({
                    mimeType:     file.type,
                    data:         preview.split(',')[1], // base64 puro para a API
                    name:         file.name,
                    size:         file.size,
                    preview,                             // full quality — só na sessão
                    previewThumb,                        // 144p JPEG — vai pro export
                });
            };

            img.onerror = () => reject(new Error(`Erro ao processar "${file.name}"`));
            img.src = reader.result;
        };

        reader.onerror = () => reject(new Error(`Erro ao ler "${file.name}"`));
        reader.readAsDataURL(file);
    });
}

// ─── Preview de anexos ────────────────────────────────────────────────────────
/**
 * Atualiza a área de preview de imagens pendentes.
 * Usa event delegation em vez de um listener por botão.
 */
function renderAttachPreview() {
    const preview = el('attachPreview');
    const isEmpty = pendingImages.length === 0;

    preview.style.display = isEmpty ? 'none' : 'flex';

    if (isEmpty) { preview.innerHTML = ''; updBtn(); return; }

    preview.innerHTML = pendingImages.map((img, i) => {
        const sizeKB = Math.round(img.size / 1024);
        return `<div class="attach-item" data-idx="${i}">
            📷 ${esc(img.name)} (${sizeKB} KB)
            <button class="attach-rm" data-idx="${i}" aria-label="Remover ${esc(img.name)}">
                ${CLOSE_SVG}
            </button>
        </div>`;
    }).join('');

    updBtn();
}

// FIX: listener registrado em DOMContentLoaded — evita TypeError se o módulo
// for parseado antes do DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    // Event delegation: um único listener no container
    el('attachPreview').addEventListener('click', e => {
        const btn = e.target.closest('.attach-rm');
        if (!btn) return;
        const idx = Number(btn.dataset.idx);
        if (!isNaN(idx)) {
            pendingImages.splice(idx, 1);
            renderAttachPreview();
            updBtn();
        }
    });
});

// ─── Processamento de arquivos recebidos ──────────────────────────────────────
/**
 * Processa uma lista de arquivos (drag-drop, input, paste).
 * Ignora não-imagens, respeita o limite de MAX_IMAGES.
 * @param {FileList|File[]} files
 */
async function handleFiles(files) {
    if (pendingImages.length >= MAX_IMAGES) {
        toast(`Máximo ${MAX_IMAGES} imagens por mensagem`, '⚠️');
        return;
    }

    let added = 0;

    // FIX: slice direto em MAX_IMAGES — slots + pendingImages.length simplificava
    // para MAX_IMAGES de qualquer forma, mas o código anterior era enganoso
    for (const file of [...files].slice(0, MAX_IMAGES)) {
        if (pendingImages.length >= MAX_IMAGES) {
            toast(`Máximo ${MAX_IMAGES} imagens por mensagem`, '⚠️');
            break;
        }
        if (!file.type.startsWith('image/')) {
            toast(`"${file.name}" não é uma imagem suportada`, '⚠️');
            continue;
        }
        try {
            pendingImages.push(await imageToBase64(file));
            added++;
        } catch (e) {
            toast(e.message, '❌');
        }
    }

    if (added > 0) renderAttachPreview();
}

// ─── Sanitização para export ──────────────────────────────────────────────────
/**
 * Substitui o preview original pelo thumbnail 144p.
 * Remove o base64 original (data) para manter o export leve.
 * @param {Chat} chat
 */
function _sanitizeChatForExport(chat) {
    return {
        ...chat,
        messages: chat.messages.map(m => {
            if (!m.images?.length) return m;
            return {
                ...m,
                images: m.images.map(({ name, mimeType, size, previewThumb }) => ({
                    name,
                    mimeType,
                    size,
                    preview: previewThumb ?? null, // thumb no lugar do full
                })),
            };
        }),
    };
}

/**
 * Cria um link temporário, insere no DOM e dispara o download de um objeto JSON.
 * FIX: elemento inserido no DOM antes do click() — necessário para Firefox.
 * @param {object} data
 * @param {string} filename
 */
function _downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: filename });

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ─── Export ───────────────────────────────────────────────────────────────────
/**
 * Exporta todos os chats como JSON.
 * Inclui avatar em base64 e thumbnails 144p das imagens.
 */
function exportChats() {
    if (!chats.length) { toast('Nada para exportar', '⚠️'); return; }

    const payload = {
        app:        'RicinusAI',
        version:    EXPORT_VERSION,
        exported:   new Date().toISOString(),
        userAvatar: S.userAvatar ?? null,
        chats:      chats.map(_sanitizeChatForExport),
    };

    _downloadJSON(payload, `ricinusai_${Date.now()}.json`);
    toast('Exportado com sucesso!', '✅');
}

// ─── Import ───────────────────────────────────────────────────────────────────
/**
 * Valida estrutura básica de um arquivo de importação.
 * @param {object} data
 */
function _validateImport(data) {
    if (!data || typeof data !== 'object') throw new Error('Arquivo inválido');
    if (!Array.isArray(data.chats))        throw new Error('Formato inválido');
    if (data.version > EXPORT_VERSION)     throw new Error('Versão não suportada');

    // Retrocompatibilidade: arquivos sem version são aceitos com aviso
    if (data.version === undefined) {
        console.warn('importChats: arquivo sem campo version — assumindo compatível');
    }

    if (data.chats.some(c => !c.id || !Array.isArray(c.messages))) {
        throw new Error('Um ou mais chats estão corrompidos');
    }

    for (const chat of data.chats) {
        if (typeof chat.title !== 'string') throw new Error('Título inválido em um chat');

        for (const msg of chat.messages) {
            if (!['user', 'model'].includes(msg.role)) {
                throw new Error('Role inválido em mensagem');
            }

            // FIX: aceita content como string OU array (mensagens multimodais com imagens)
            if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
                throw new Error('Conteúdo inválido em mensagem');
            }
        }
    }
}

/**
 * Abre seletor de arquivo e importa chats de um JSON exportado.
 * Restaura avatar se presente no arquivo.
 * IDs duplicados são regenerados automaticamente.
 */
function importChats() {
    const input = Object.assign(document.createElement('input'), {
        type:   'file',
        accept: '.json',
    });

    input.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const data = JSON.parse(await file.text());
            _validateImport(data);

            const count = data.chats.length;
            if (!await customConfirm(
                `Importar ${count} chat${count !== 1 ? 's' : ''}?`,
                { confirmText: 'Importar' }
            )) return;

            // ─── Restaura avatar com validação de formato ─────────────────
            // FIX: aceita apenas data URIs de imagem — evita injeção arbitrária
            if (
                typeof data.userAvatar === 'string' &&
                data.userAvatar.startsWith('data:image/')
            ) {
                updateSettings({ userAvatar: data.userAvatar });
                loadAvatarPreview();
                toast('Avatar restaurado!', '🖼️');
            }

            // ─── Importa chats sem colidir com IDs existentes ─────────────
            const existingIds = new Set(chats.map(c => c.id));
            const imported    = data.chats.map(c => ({
                ...c,
                id: existingIds.has(c.id) ? uid() : c.id,
            }));

            chats.push(...imported);
            save();
            renderList();
            renderMsgs();

            const n = imported.length;
            toast(`${n} chat${n !== 1 ? 's' : ''} importado${n !== 1 ? 's' : ''}!`, '✅');
        } catch (e) {
            toast('Erro ao importar: ' + e.message, '❌');
        }
    });

    input.click();
}

// ─── Limpar tudo ──────────────────────────────────────────────────────────────
/**
 * Remove todos os chats após confirmação do usuário.
 */
async function clearAll() {
    if (!await customConfirm(
        'Excluir TODOS os chats? Esta ação não pode ser desfeita.',
        { danger: true, confirmText: 'Excluir tudo' }
    )) return;

    chats    = [];
    activeId = null;
    save();
    renderList();
    renderMsgs();
    toast('Tudo limpo', '🗑️');
}
