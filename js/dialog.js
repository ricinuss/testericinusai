/* ═══════════ CUSTOM DIALOGS ═══════════ */
'use strict';

(function () {
    // FIX: guard explícito para dependência externa — falha cedo e com mensagem clara
    if (typeof esc !== 'function') {
        console.error('dialogs.js: função esc() não encontrada. Certifique-se de carregar utils.js antes.');
    }

    let currentDialog = null;
    let dialogQueue   = [];

    function createDialogBase(content) {
        const bg = document.createElement('div');
        bg.className = 'dialog-bg';
        bg.innerHTML = `<div class="dialog">${content}</div>`;
        return bg;
    }

    function showDialog(bg, focusEl) {
        document.body.appendChild(bg);
        // Force reflow para animação funcionar
        bg.offsetHeight;
        bg.classList.add('show');
        if (focusEl) focusEl.focus();
    }

    function hideDialog(bg) {
        bg.classList.remove('show');
        bg.addEventListener('transitionend', () => bg.remove(), { once: true });
        // Fallback se transição não disparar
        setTimeout(() => { if (bg.parentNode) bg.remove(); }, 300);
    }

    /**
     * Finaliza um dialog: remove do DOM, libera currentDialog e processa a fila.
     * Centralizado aqui para evitar duplicação entre confirm e prompt.
     * Aguarda a animação de saída antes de liberar currentDialog, evitando
     * que o próximo dialog da fila apareça antes do atual terminar de sair.
     *
     * @param {HTMLElement} bg
     * @param {Function}    resolve
     * @param {*}           result
     * @param {Function}    onKeyHandler - listener de Escape a remover
     */
    function _finishDialog(bg, resolve, result, onKeyHandler) {
        // FIX: remove Escape listener direto em close(), não em transitionend
        // — evita memory leak quando o fallback setTimeout remove o elemento
        document.removeEventListener('keydown', onKeyHandler);

        hideDialog(bg);
        resolve(result);

        // FIX: libera currentDialog e processa fila SÓ após animação de saída
        // — evita que o próximo dialog apareça enquanto este ainda está saindo
        bg.addEventListener('transitionend', () => {
            currentDialog = null;
            processQueue();
        }, { once: true });

        // Fallback: se transitionend não disparar, garante limpeza
        setTimeout(() => {
            if (currentDialog === bg) {
                currentDialog = null;
                processQueue();
            }
        }, 320);
    }

    function processQueue() {
        if (dialogQueue.length && !currentDialog) {
            const next = dialogQueue.shift();
            next();
        }
    }

    /**
     * Exibe modal de confirmação customizado.
     * @param {string} message
     * @param {Object}  [options]
     * @param {string}  [options.confirmText='Confirmar']
     * @param {string}  [options.cancelText='Cancelar']
     * @param {boolean} [options.danger=false]
     * @returns {Promise<boolean>}
     */
    window.customConfirm = function (message, options = {}) {
        return new Promise(resolve => {
            const run = () => {
                const {
                    confirmText = 'Confirmar',
                    cancelText  = 'Cancelar',
                    danger      = false,
                } = options;

                const btnClass = danger
                    ? 'dialog-btn dialog-btn-danger'
                    : 'dialog-btn dialog-btn-primary';

                const bg = createDialogBase(`
                    <div class="dialog-body">
                        <p class="dialog-msg">${esc(message)}</p>
                    </div>
                    <div class="dialog-footer">
                        <button class="dialog-btn dialog-btn-secondary" data-action="cancel">${esc(cancelText)}</button>
                        <button class="${btnClass}" data-action="confirm">${esc(confirmText)}</button>
                    </div>
                `);

                currentDialog = bg;

                // FIX: flag para evitar duplo close() (ex: backdrop + Enter simultâneos)
                let closed = false;

                const onKey = e => {
                    if (e.key === 'Escape') { e.preventDefault(); close(false); }
                };

                const close = result => {
                    if (closed) return;
                    closed = true;
                    _finishDialog(bg, resolve, result, onKey);
                };

                // Clique no backdrop
                bg.addEventListener('click', e => {
                    if (e.target === bg) close(false);
                });

                // Botões
                bg.querySelector('[data-action="cancel"]').addEventListener('click',  () => close(false));
                bg.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));

                // Escape
                document.addEventListener('keydown', onKey);

                showDialog(bg, bg.querySelector('[data-action="confirm"]'));
            };

            currentDialog ? dialogQueue.push(run) : run();
        });
    };

    /**
     * Exibe modal de prompt customizado.
     * @param {string} message
     * @param {string} [defaultValue='']
     * @param {Object} [options]
     * @param {string} [options.placeholder='']
     * @param {string} [options.confirmText='OK']
     * @param {string} [options.cancelText='Cancelar']
     * @returns {Promise<string|null>}  — null se cancelado, string (mesmo vazia) se confirmado
     */
    window.customPrompt = function (message, defaultValue = '', options = {}) {
        return new Promise(resolve => {
            const run = () => {
                const {
                    placeholder = '',
                    confirmText = 'OK',
                    cancelText  = 'Cancelar',
                } = options;

                const bg = createDialogBase(`
                    <div class="dialog-body">
                        <p class="dialog-msg">${esc(message)}</p>
                        <input type="text" class="dialog-input" value="${esc(defaultValue)}" placeholder="${esc(placeholder)}">
                    </div>
                    <div class="dialog-footer">
                        <button class="dialog-btn dialog-btn-secondary" data-action="cancel">${esc(cancelText)}</button>
                        <button class="dialog-btn dialog-btn-primary"   data-action="confirm">${esc(confirmText)}</button>
                    </div>
                `);

                currentDialog = bg;
                const input = bg.querySelector('.dialog-input');

                // FIX: flag para evitar duplo close()
                let closed = false;

                const onKey = e => {
                    if (e.key === 'Escape') { e.preventDefault(); close(null); }
                };

                const close = result => {
                    if (closed) return;
                    closed = true;
                    _finishDialog(bg, resolve, result, onKey);
                };

                // FIX: retorna string vazia (não null) quando confirmado com campo vazio
                // — null fica reservado exclusivamente para cancelamento
                const confirm = () => close(input.value.trim());

                // Clique no backdrop
                bg.addEventListener('click', e => {
                    if (e.target === bg) close(null);
                });

                // Botões
                bg.querySelector('[data-action="cancel"]').addEventListener('click',  () => close(null));
                bg.querySelector('[data-action="confirm"]').addEventListener('click', confirm);

                // Enter confirma no input
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
                });

                // Escape global
                document.addEventListener('keydown', onKey);

                showDialog(bg, input);
                // Seleciona texto existente para facilitar edição
                input.select();
            };

            currentDialog ? dialogQueue.push(run) : run();
        });
    };
})();
