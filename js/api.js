/* ═══════════ API CALLS ═══════════ */
'use strict';

// ─── Constantes ───────────────────────────────────────────────────────────────
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// URL do proxy Vercel — substitua pelo seu domínio após o deploy
// Ex: 'https://ricinus-proxy.vercel.app/api/nvidia'
const NVIDIA_PROXY_URL = 'https://ricinusaiproxy.vercel.app/api/nvidia';

const MIN_KEY_LEN = 30;
const MAX_CONTEXT_TOKENS = 800_000;

// Status HTTP que justificam tentar a próxima chave
const RETRYABLE_STATUSES = new Set([429, 403, 500, 502, 503]);

// ─── Chaves ───────────────────────────────────────────────────────────────────
/**
 * Decodifica uma chave obfuscada em base64.
 * Retorna string vazia se inválida.
 */
function _decodeKey(k) {
    try { return atob(k.replace(/\s/g, '')); } catch { return ''; }
}

function getValidKeys() {
    const raw = S.apiMode === 'default'
        ? [...API_KEYS]
        : [...S.apiKeys];

    return raw.filter(k => typeof k === 'string' && k.trim().length >= MIN_KEY_LEN);
}

// ─── System prompt ────────────────────────────────────────────────────────────
/**
 * Decodifica o prompt obfuscado e mescla com o prompt customizado do usuário.
 * Memoizado: recalcula apenas quando S.systemPrompt muda.
 */
const _promptCache = { custom: null, result: null };

function buildSystemPrompt() {
    if (_promptCache.custom === S.systemPrompt) return _promptCache.result;

    const base = typeof _OBFUSCATED_PROMPT !== 'undefined' ? _OBFUSCATED_PROMPT : '';

    const merged = base + (S.systemPrompt ? '\n\n' + S.systemPrompt : '');
    _promptCache.custom = S.systemPrompt;
    _promptCache.result = merged.trim() ? merged : null;
    return _promptCache.result;
}

// ─── Truncamento inteligente de contexto ──────────────────────────────────────
/**
 * Estima tokens de uma mensagem usando heurística chars/4.
 * @param {object} m - mensagem com content e images opcionais
 * @returns {number}
 */
function _estimateTokens(m) {
    let chars = (m.content ?? '').length;
    // Imagens base64: estima ~85 tokens por KB de dados
    for (const img of (m.images ?? [])) {
        if (img?.data) chars += img.data.length * 0.75; // base64 → bytes aproximado
    }
    return Math.ceil(chars / 4);
}

/**
 * Trunca mensagens para caber no limite de tokens.
 * Preserva: primeira mensagem do usuário + últimas N mensagens.
 * Injeta aviso no ponto de corte.
 * 
 * @param {Array} messages - histórico completo
 * @returns {Array} - histórico truncado
 */
function truncateMessages(messages) {
    if (!messages.length) return messages;

    // Calcula tokens totais
    const tokenCounts = messages.map(_estimateTokens);
    const totalTokens = tokenCounts.reduce((a, b) => a + b, 0);

    if (totalTokens <= MAX_CONTEXT_TOKENS) return messages;

    // Precisa truncar
    toast('Conversa longa: histórico parcialmente omitido', '⚠️');

    // Encontra a primeira mensagem do usuário
    const firstUserIdx = messages.findIndex(m => m.role === 'user');
    const firstUserMsg = firstUserIdx >= 0 ? messages[firstUserIdx] : null;
    const firstUserTokens = firstUserMsg ? tokenCounts[firstUserIdx] : 0;

    // Reserva tokens para: primeira msg + aviso (~20 tokens)
    const NOTICE_TOKENS = 20;
    let availableTokens = MAX_CONTEXT_TOKENS - firstUserTokens - NOTICE_TOKENS;

    // Coleta mensagens do final até esgotar o budget
    const kept = [];
    let keptTokens = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
        // Pula a primeira mensagem do usuário (será adicionada separadamente)
        if (i === firstUserIdx) continue;

        const msgTokens = tokenCounts[i];
        if (keptTokens + msgTokens > availableTokens) break;

        kept.unshift(messages[i]);
        keptTokens += msgTokens;
    }

    // Garante que a última mensagem do usuário nunca é removida
    const lastMsg = messages[messages.length - 1];
    if (kept.length === 0 || kept[kept.length - 1] !== lastMsg) {
        // Se não conseguiu manter a última, força sua inclusão
        if (kept[kept.length - 1] !== lastMsg) {
            kept.push(lastMsg);
        }
    }

    // Monta resultado
    const result = [];

    // Adiciona primeira mensagem do usuário se existir e não estiver em kept
    if (firstUserMsg && !kept.includes(firstUserMsg)) {
        result.push(firstUserMsg);
    }

    // Injeta aviso de contexto omitido
    if (result.length > 0 || kept.length < messages.length - (firstUserMsg ? 1 : 0)) {
        result.push({
            role: 'user',
            content: '[Contexto anterior omitido para caber no limite de tokens]'
        });
    }

    // Adiciona mensagens mantidas
    result.push(...kept);

    return result;
}

// ─── Body builder ─────────────────────────────────────────────────────────────
/**
 * Converte uma mensagem do chat num objeto contents aceito pela API Gemini.
 */
function _buildContentPart(m) {
    const parts = [];

    if (m.content) parts.push({ text: m.content });

    for (const img of (m.images ?? [])) {
        if (img?.data) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
        }
    }

    return { role: m.role === 'user' ? 'user' : 'model', parts };
}

/**
 * Monta o corpo da requisição para a API Gemini.
 * @param {Array} messages - histórico de mensagens do chat
 * @param {object} [options] - opções adicionais
 * @param {number} [options.maxOutputTokens] - override para maxOutputTokens
 */
function buildBody(messages, options = {}) {
    const body = {
        contents: messages.map(_buildContentPart),
        generationConfig: {
            temperature: S.temperature,
            maxOutputTokens: options.maxOutputTokens ?? S.maxTokens,
            topP: S.topP,
        },
    };

    // Thinking config — só disponível em modelos 2.5+
    if (S.thinking && S.model.includes('2.5')) {
        body.generationConfig.thinkingConfig = { thinkingBudget: S.thinkingBudget };
    }

    const prompt = buildSystemPrompt();
    if (prompt) {
        body.systemInstruction = { parts: [{ text: prompt }] };
    }

    return body;
}

// ─── URL builder ──────────────────────────────────────────────────────────────
function _buildUrl(key, streaming = S.streaming) {
    const action = streaming ? 'streamGenerateContent' : 'generateContent';
    const sse = streaming ? '&alt=sse' : '';
    return `${API_BASE}/${S.model}:${action}?key=${key}${sse}`;
}

// ─── Fetch com retry por chave ────────────────────────────────────────────────
/**
 * Tenta cada chave válida em round-robin.
 * Avança para a próxima chave em erros retryable (quota, rate-limit, servidor).
 * Lança erro consolidado se todas as chaves falharem.
 * 
 * @param {Array} messages
 * @returns {{ data?, stream?, isStream: boolean, keyUsed: number }}
 */
async function callAPI(messages) {
    const validKeys = getValidKeys();
    if (!validKeys.length) throw new Error('Nenhuma chave API válida configurada.');

    // Trunca mensagens se necessário
    const truncatedMessages = truncateMessages(messages);

    // Detecta uso de NVIDIA pelos nomes de modelo configurados
    const NVIDIA_MODEL_MAP = {
        'ricinus 1.5 lucid': 'meta/llama-3.1-70b-instruct',
        'ricinus 1.5 thinking': 'moonshotai/kimi-k2.6'
    };

    let providerModel = NVIDIA_MODEL_MAP[S.model] || S.model;
    if (validKeys[0]?.startsWith('nvapi-') && !providerModel.includes('/')) {
        providerModel = 'moonshotai/kimi-k2.6';
    }
    const isNvidia = !!providerModel && providerModel.includes('/') || validKeys[0]?.startsWith('nvapi-');

    const startIdx = S.currentKeyIdx % validKeys.length;
    const errors = [];

    // Se for NVIDIA, roteia pelo proxy Vercel (evita CORS do browser)
    if (isNvidia) {
        const providerModel = NVIDIA_MODEL_MAP[S.model] || S.model;
        const invokeUrl = NVIDIA_PROXY_URL;

        // Monta messages no formato esperado (simplificado)
        const nvidiaMessages = truncatedMessages.map(m => ({ role: m.role, content: m.content }));

        const nvidiaPayloadBase = {
            model: providerModel,
            messages: nvidiaMessages,
            max_tokens: S.maxTokens,
            temperature: S.temperature,
            top_p: S.topP,
            stream: S.streaming
        };
        if (S.thinking) nvidiaPayloadBase.chat_template_kwargs = { thinking: true };

        // O proxy cuida do round-robin das chaves — só precisamos de uma tentativa aqui
        aborter = new AbortController();
        for (let tried = 0; tried < 1; tried++) {
            const keyIdx = startIdx;
            const key = validKeys[keyIdx]; // enviado apenas como fallback; proxy usa env vars

            let res;
            try {
                res = await fetch(invokeUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': S.streaming ? 'text/event-stream' : 'application/json',
                    },
                    body: JSON.stringify(nvidiaPayloadBase),
                    signal: aborter.signal
                });
            } catch (e) {
                if (e.name === 'AbortError') throw e;
                errors.push(`Chave #${keyIdx + 1}: falha de rede – ${e.message}`);
                continue;
            }

            if (res.ok) {
                updateSettings({ currentKeyIdx: keyIdx });
                if (S.streaming) return { stream: res.body, isStream: true, keyUsed: keyIdx };
                const data = await res.json();
                return { data, isStream: false, keyUsed: keyIdx };
            }

            const errPayload = await res.text().then(t => {
                try { return JSON.parse(t); } catch { return { message: t }; }
            }).catch(() => ({}));

            const errMsg = errPayload.error?.message || errPayload.message || '';
            const isRetryable = RETRYABLE_STATUSES.has(res.status) || /quota|rate[\s_-]?limit/i.test(errMsg);

            errors.push(`Chave #${keyIdx + 1} (HTTP ${res.status}): ${errMsg || 'sem detalhe'}`);
            console.warn(`[api] ${errors.at(-1)}`);

            if (isRetryable) continue;
            throw new Error(errMsg || `Erro HTTP ${res.status}`);
        }

        console.error('[api] Todas as chaves NVIDIA falharam:\n' + errors.join('\n'));
        throw new Error('Nossos servidores estão enfrentando instabilidades no momento. Tente novamente em alguns instantes.');
    }

    // ─── Comportamento original (Google Gemini) ───────────────────────────────
    const body = buildBody(truncatedMessages);
    for (let tried = 0; tried < validKeys.length; tried++) {
        const keyIdx = (startIdx + tried) % validKeys.length;
        const key = validKeys[keyIdx];

        aborter = new AbortController();

        let res;
        try {
            res = await fetch(_buildUrl(key), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: aborter.signal,
            });
        } catch (e) {
            if (e.name === 'AbortError') throw e;
            errors.push(`Chave #${keyIdx + 1}: falha de rede – ${e.message}`);
            continue; // tenta próxima chave
        }

        if (res.ok) {
            // Persiste a key que funcionou
            updateSettings({ currentKeyIdx: keyIdx });

            if (S.streaming) return { stream: res.body, isStream: true, keyUsed: keyIdx };
            const data = await res.json();
            return { data, isStream: false, keyUsed: keyIdx };
        }

        // ── Resposta de erro ──────────────────────────────────────────────────
        const errPayload = await res.json().catch(() => ({}));
        const errMsg = errPayload.error?.message ?? '';
        const isRetryable = RETRYABLE_STATUSES.has(res.status)
            || /quota|rate[\s_-]?limit/i.test(errMsg);

        errors.push(`Chave #${keyIdx + 1} (HTTP ${res.status}): ${errMsg || 'sem detalhe'}`);
        console.warn(`[api] ${errors.at(-1)}`);

        if (isRetryable) continue;

        // Erro definitivo (ex: 400 Bad Request) — não adianta tentar outra chave
        throw new Error(errMsg || `Erro HTTP ${res.status}`);
    }

    // Todas as chaves esgotadas
    console.error('[api] Todas as chaves falharam:\n' + errors.join('\n'));
    throw new Error(
        'Nossos servidores estão enfrentando instabilidades no momento. Tente novamente em alguns instantes.'
    );
}

// ─── Validação de chave API no carregamento ───────────────────────────────────
/** Flag para rastrear se o usuário interagiu com o app */
let _userHasInteracted = false;

// Detecta interação do usuário
['click', 'keydown', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => { _userHasInteracted = true; }, { once: true, passive: true });
});

/**
 * Valida se pelo menos uma chave API está funcional.
 * Roda em background sem bloquear o carregamento.
 * Exibe toast e abre settings se a chave estiver inválida.
 */
async function validateKeysOnLoad() {
    // Não valida se estiver usando chaves do sistema
    if (S.apiMode === 'default' && API_KEYS.length > 0) {
        return;
    }

    const validKeys = getValidKeys();
    if (!validKeys.length) {
        _showKeyError();
        return;
    }

    // Testa apenas a primeira chave válida
    const testKey = validKeys[0];

    try {
        let res;
        if (testKey.startsWith('nvapi-')) {
            // Valida via proxy para evitar CORS
            res = await fetch(NVIDIA_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'moonshotai/kimi-k2.6',
                    messages: [{ role: 'user', content: 'hi' }],
                    max_tokens: 1
                })
            });
        } else {
            res = await fetch(
                `${API_BASE}/${S.model}:generateContent?key=${testKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
                        generationConfig: { maxOutputTokens: 1 }
                    })
                }
            );
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData.error?.message ?? errData.message ?? '';

            // Verifica se é erro de chave inválida ou quota
            if (res.status === 400 || res.status === 401 || res.status === 403 ||
                /invalid|api.?key|quota|billing/i.test(errMsg)) {
                _showKeyError();
            }
            // Outros erros (5xx, rate limit) não significam chave inválida
        }
    } catch (e) {
        // Erro de rede — não significa chave inválida, ignora silenciosamente
        console.warn('[api] Falha ao validar chave (rede):', e.message);
    }
}

/**
 * Exibe erro de chave inválida e abre settings automaticamente.
 */
function _showKeyError() {
    // Toast persistente (6s)
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'alert');
    t.innerHTML = `<span aria-hidden="true">⚠️</span><span>Chave API inválida ou sem cota. Verifique em Configurações.</span>`;
    el('toasts').appendChild(t);

    // Remove após 6s
    setTimeout(() => { if (t.isConnected) t.remove(); }, 6000);

    // Abre settings após 1.5s se usuário não interagiu
    setTimeout(() => {
        if (!_userHasInteracted && typeof openSet === 'function') {
            openSet();
        }
    }, 1500);
}

// ─── Parser SSE ───────────────────────────────────────────────────────────────
/**
 * Gerador assíncrono que parseia um stream SSE linha a linha.
 * Suporta chunks parciais via buffer e libera o reader sempre ao final.
 * 
 * @param {ReadableStream} stream
 * @yields {object} Objetos JSON parseados de cada evento data:
 */
async function* parseSSE(stream) {
    const reader = stream.getReader();
    const dec = new TextDecoder();
    let buf = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buf += dec.decode(value, { stream: true });

            const lines = buf.split('\n');
            buf = lines.pop() ?? ''; // preserva linha incompleta

            for (const line of lines) {
                const chunk = _parseSSELine(line);
                if (chunk === 'DONE') return;
                if (chunk) yield chunk;
            }
        }

        // Drena o buffer residual
        if (buf.trim()) {
            const chunk = _parseSSELine(buf);
            if (chunk && chunk !== 'DONE') yield chunk;
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * Parseia uma única linha SSE.
 * @returns {object|'DONE'|null}
 */
function _parseSSELine(line) {
    const t = line.trim();
    if (!t.startsWith('data: ')) return null;

    const payload = t.slice(6);
    if (payload === '[DONE]') return 'DONE';

    try { return JSON.parse(payload); } catch { return null; }
}
