/* ═══════════ RENDERING ═══════════ */
'use strict';

// ─── Referências DOM fixas ────────────────────────────────────────────────────
const chatMsgs = el('chatMsgs');
const chatWrap = el('chatWrap');

// ─── SVGs inline reutilizáveis ────────────────────────────────────────────────
const SVG_ICONS = {
    pin:    `<line x1="12" y1="2" x2="12" y2="14"/><path d="M5 10h14l-1.5 4H6.5z"/><line x1="12" y1="14" x2="12" y2="22"/>`,
    chat:   `<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>`,
    pencil: `<path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/>`,
    trash:  `<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>`,

    _wrap(inner, size = 12) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">${inner}</svg>`;
    },
};

// Cards de sugestão da tela de boas-vindas
const WELCOME_CARDS = [
        // ═══════════════════════════════════════════════════════════════
    // 💻 CÓDIGO - JAVASCRIPT/TYPESCRIPT
    // ═══════════════════════════════════════════════════════════════
    { emoji: '💻', title: 'Código JS',           desc: 'Ordenar array',           prompt: 'Escreva uma função JavaScript para ordenar um array de objetos por uma propriedade específica' },
    { emoji: '📦', title: 'JS Módulos',          desc: 'Import/Export',           prompt: 'Explique a diferença entre CommonJS e ES Modules com exemplos práticos' },
    { emoji: '⚡', title: 'JS Async',            desc: 'Promises e Async/Await',  prompt: 'Crie exemplos de código mostrando Callbacks, Promises e Async/Await resolvendo o mesmo problema' },
    { emoji: '🔄', title: 'JS Array Methods',    desc: 'Map, Filter, Reduce',     prompt: 'Crie exemplos práticos usando map, filter, reduce, find e some em JavaScript' },
    { emoji: '🎯', title: 'TypeScript',          desc: 'Types avançados',         prompt: 'Explique Generics, Utility Types e Conditional Types em TypeScript com exemplos' },
    { emoji: '🏗️', title: 'Design Patterns JS',  desc: 'Padrões de projeto',      prompt: 'Implemente os padrões Singleton, Factory e Observer em JavaScript moderno' },
    { emoji: '🧪', title: 'Testes JS',           desc: 'Jest básico',             prompt: 'Crie exemplos de testes unitários com Jest para uma função de validação de email' },
    { emoji: '📋', title: 'Validação Form',      desc: 'Validar inputs',          prompt: 'Crie uma função JavaScript completa para validar formulário com email, CPF, telefone e senha forte' },
    { emoji: '🕐', title: 'JS Date',             desc: 'Manipular datas',         prompt: 'Crie funções utilitárias para trabalhar com datas em JavaScript sem bibliotecas externas' },
    { emoji: '💾', title: 'LocalStorage',        desc: 'Persistência web',        prompt: 'Crie uma classe JavaScript para gerenciar LocalStorage com expiração de dados' },

    // ═══════════════════════════════════════════════════════════════
    // 🐍 CÓDIGO - PYTHON
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🐍', title: 'Código Python',       desc: 'Script útil',             prompt: 'Escreva um script Python para renomear arquivos em lote numa pasta' },
    { emoji: '📊', title: 'Python Pandas',       desc: 'Análise de dados',        prompt: 'Crie exemplos de análise de dados com Pandas: leitura CSV, filtros, agrupamentos e gráficos' },
    { emoji: '🕷️', title: 'Web Scraping',        desc: 'BeautifulSoup',           prompt: 'Crie um web scraper em Python com BeautifulSoup para extrair títulos e preços de um e-commerce' },
    { emoji: '🤖', title: 'Python Bot',          desc: 'Automação',               prompt: 'Crie um bot Python que monitora preços de produtos e envia alerta por email' },
    { emoji: '📁', title: 'Python Files',        desc: 'Manipular arquivos',      prompt: 'Crie funções Python para organizar arquivos por extensão, data e tamanho automaticamente' },
    { emoji: '🔐', title: 'Python Crypto',       desc: 'Criptografia',            prompt: 'Implemente funções de criptografia e hash em Python para senhas e dados sensíveis' },
    { emoji: '📧', title: 'Python Email',        desc: 'Enviar emails',           prompt: 'Crie uma classe Python para enviar emails com anexos usando SMTP' },
    { emoji: '📈', title: 'Python Matplotlib',   desc: 'Visualização',            prompt: 'Crie diferentes tipos de gráficos com Matplotlib: linha, barra, pizza e dispersão' },
    { emoji: '🎲', title: 'Python Random',       desc: 'Gerador de dados',        prompt: 'Crie um gerador de dados fake em Python para testes: nomes, emails, endereços, CPFs' },
    { emoji: '⏰', title: 'Python Scheduler',    desc: 'Agendar tarefas',         prompt: 'Crie um sistema de agendamento de tarefas em Python que roda em background' },

    // ═══════════════════════════════════════════════════════════════
    // 🎨 CÓDIGO - CSS/HTML
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🎨', title: 'CSS Animação',        desc: 'Efeito moderno',          prompt: 'Crie uma animação CSS fluida de loading skeleton para um card' },
    { emoji: '📱', title: 'CSS Responsivo',      desc: 'Mobile-first',            prompt: 'Crie um layout responsivo completo com CSS Grid e Flexbox para um dashboard' },
    { emoji: '🌙', title: 'Dark Mode',           desc: 'Tema escuro',             prompt: 'Implemente um sistema de dark mode completo com CSS custom properties e JavaScript' },
    { emoji: '✨', title: 'CSS Hover Effects',   desc: 'Efeitos elegantes',       prompt: 'Crie 10 efeitos de hover criativos em CSS para botões e cards' },
    { emoji: '📐', title: 'CSS Grid',            desc: 'Layouts complexos',       prompt: 'Crie um layout de galeria de imagens responsivo com CSS Grid e efeito masonry' },
    { emoji: '🎭', title: 'CSS Parallax',        desc: 'Efeito de profundidade',  prompt: 'Crie um efeito parallax suave apenas com CSS para uma landing page' },
    { emoji: '🔲', title: 'CSS Glassmorphism',   desc: 'Vidro fosco',             prompt: 'Crie um card com efeito glassmorphism moderno compatível com todos browsers' },
    { emoji: '🌊', title: 'CSS Waves',           desc: 'Ondas animadas',          prompt: 'Crie um efeito de ondas animadas em CSS para o footer de um site' },
    { emoji: '📝', title: 'CSS Forms',           desc: 'Inputs estilizados',      prompt: 'Crie estilos modernos para formulários: inputs flutuantes, validação visual, select customizado' },
    { emoji: '🎪', title: 'CSS 3D',              desc: 'Transformações 3D',       prompt: 'Crie um card que vira em 3D ao passar o mouse revelando informações no verso' },

    // ═══════════════════════════════════════════════════════════════
    // 🗄️ CÓDIGO - SQL/BANCO DE DADOS
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🗄️', title: 'SQL Query',           desc: 'Consulta complexa',       prompt: 'Escreva uma query SQL para encontrar os 5 clientes que mais compraram no último mês' },
    { emoji: '🔗', title: 'SQL Joins',           desc: 'Relacionamentos',         prompt: 'Explique INNER, LEFT, RIGHT e FULL JOIN com exemplos práticos de e-commerce' },
    { emoji: '📊', title: 'SQL Aggregations',    desc: 'Funções de agregação',    prompt: 'Crie queries SQL com GROUP BY, HAVING, COUNT, SUM, AVG para relatório de vendas' },
    { emoji: '⚡', title: 'SQL Performance',     desc: 'Otimização',              prompt: 'Quais técnicas de otimização de queries SQL e quando usar índices?' },
    { emoji: '🔄', title: 'SQL Transactions',    desc: 'ACID',                    prompt: 'Explique transações SQL, ACID e como implementar rollback em caso de erro' },
    { emoji: '📋', title: 'SQL Views',           desc: 'Views e Procedures',      prompt: 'Crie exemplos de Views, Stored Procedures e Triggers para um sistema de pedidos' },
    { emoji: '🏛️', title: 'Modelagem DB',        desc: 'Normalização',            prompt: 'Explique as 3 formas normais com exemplo prático de modelagem de e-commerce' },
    { emoji: '🍃', title: 'MongoDB',             desc: 'NoSQL queries',           prompt: 'Crie queries MongoDB equivalentes às principais operações SQL: CRUD, agregações, joins' },
    { emoji: '🔴', title: 'Redis',               desc: 'Cache e sessões',         prompt: 'Implemente cache com Redis em Node.js para API REST com invalidação inteligente' },
    { emoji: '📦', title: 'Migrations',          desc: 'Versionamento DB',        prompt: 'Explique como implementar migrations de banco de dados em projetos profissionais' },

    // ═══════════════════════════════════════════════════════════════
    // ⚛️ CÓDIGO - REACT/FRONTEND FRAMEWORKS
    // ═══════════════════════════════════════════════════════════════
    { emoji: '⚛️', title: 'React Hooks',         desc: 'useState/useEffect',      prompt: 'Explique os principais React Hooks com exemplos práticos: useState, useEffect, useContext, useRef' },
    { emoji: '🎣', title: 'Custom Hooks',        desc: 'Hooks reutilizáveis',     prompt: 'Crie 5 custom hooks úteis em React: useLocalStorage, useDebounce, useFetch, useToggle, useClickOutside' },
    { emoji: '🔄', title: 'React State',         desc: 'Gerenciamento',           prompt: 'Compare Context API, Redux e Zustand para gerenciamento de estado em React' },
    { emoji: '🛣️', title: 'React Router',        desc: 'Navegação SPA',           prompt: 'Implemente rotas protegidas, lazy loading e nested routes com React Router v6' },
    { emoji: '📡', title: 'React Query',         desc: 'Data fetching',           prompt: 'Implemente CRUD completo com React Query: cache, mutations, invalidation, optimistic updates' },
    { emoji: '📋', title: 'React Forms',         desc: 'Formulários',             prompt: 'Crie um formulário complexo com React Hook Form e Zod para validação tipada' },
    { emoji: '🎨', title: 'React Components',    desc: 'Component patterns',      prompt: 'Implemente patterns de componentes React: Compound, Render Props, HOC, Custom Hooks' },
    { emoji: '💚', title: 'Vue.js',              desc: 'Composition API',         prompt: 'Crie um componente Vue 3 completo usando Composition API com reatividade e ciclo de vida' },
    { emoji: '🅰️', title: 'Angular',             desc: 'Services e DI',           prompt: 'Explique injeção de dependência em Angular com exemplos de Services e Modules' },
    { emoji: '🟢', title: 'Next.js',             desc: 'SSR e SSG',               prompt: 'Explique as diferenças entre SSR, SSG, ISR e CSR no Next.js com casos de uso' },

    // ═══════════════════════════════════════════════════════════════
    // 🖥️ CÓDIGO - BACKEND/NODE.JS
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🖥️', title: 'Node.js API',         desc: 'Express REST',            prompt: 'Crie uma API REST completa com Express: rotas, middlewares, validação e tratamento de erros' },
    { emoji: '🔌', title: 'WebSockets',          desc: 'Tempo real',              prompt: 'Implemente um chat em tempo real com Socket.io e Node.js' },
    { emoji: '🔐', title: 'Auth JWT',            desc: 'Autenticação',            prompt: 'Implemente autenticação completa com JWT: login, registro, refresh token e logout' },
    { emoji: '📤', title: 'File Upload',         desc: 'Upload de arquivos',      prompt: 'Implemente upload de arquivos em Node.js com validação, resize de imagens e storage S3' },
    { emoji: '📨', title: 'Queue System',        desc: 'Filas com Bull',          prompt: 'Implemente um sistema de filas com Bull/Redis para envio de emails em background' },
    { emoji: '🔄', title: 'Webhooks',            desc: 'Integração eventos',      prompt: 'Implemente sistema de webhooks com retry, assinatura HMAC e logs' },
    { emoji: '📊', title: 'Rate Limiting',       desc: 'Proteção API',            prompt: 'Implemente rate limiting em Node.js com diferentes estratégias por IP, usuário e endpoint' },
    { emoji: '🐘', title: 'NestJS',              desc: 'Framework enterprise',    prompt: 'Crie um módulo NestJS completo com controller, service, repository e DTOs' },
    { emoji: '🦊', title: 'Fastify',             desc: 'API performática',        prompt: 'Crie uma API com Fastify mostrando vantagens de performance sobre Express' },
    { emoji: '🔧', title: 'Middleware',          desc: 'Middleware patterns',     prompt: 'Crie middlewares Node.js para logging, autenticação, validação e tratamento de erros' },

    // ═══════════════════════════════════════════════════════════════
    // 📱 CÓDIGO - MOBILE
    // ═══════════════════════════════════════════════════════════════
    { emoji: '📱', title: 'React Native',        desc: 'App mobile',              prompt: 'Crie uma tela de login em React Native com validação e navegação' },
    { emoji: '🎯', title: 'Flutter',             desc: 'Widgets básicos',         prompt: 'Crie uma lista infinita com pull-to-refresh em Flutter' },
    { emoji: '🔔', title: 'Push Notifications', desc: 'Notificações',            prompt: 'Implemente push notifications em React Native com Firebase Cloud Messaging' },
    { emoji: '📍', title: 'Geolocation',         desc: 'Localização',             prompt: 'Implemente rastreamento de localização em tempo real para app de delivery' },
    { emoji: '📷', title: 'Camera App',          desc: 'Acesso à câmera',         prompt: 'Crie funcionalidade de câmera em React Native com captura e galeria' },
    { emoji: '💳', title: 'Mobile Payments',     desc: 'Pagamentos in-app',       prompt: 'Implemente pagamentos com Stripe em aplicativo React Native' },
    { emoji: '🔐', title: 'Biometria',           desc: 'Auth biométrica',         prompt: 'Implemente autenticação biométrica (FaceID/TouchID) em React Native' },
    { emoji: '📴', title: 'Offline First',       desc: 'App offline',             prompt: 'Implemente estratégia offline-first em app mobile com sincronização' },
    { emoji: '🎨', title: 'Mobile UI',           desc: 'Componentes nativos',     prompt: 'Crie componentes de UI nativos reutilizáveis em React Native' },
    { emoji: '⚡', title: 'App Performance',     desc: 'Otimização mobile',       prompt: 'Quais técnicas de otimização de performance para apps React Native?' },

    // ═══════════════════════════════════════════════════════════════
    // 🧠 APRENDIZADO - MACHINE LEARNING/IA
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🧠', title: 'Machine Learning',    desc: 'Explicação simples',      prompt: 'Explique como funciona machine learning de forma simples com exemplos do dia a dia' },
    { emoji: '🤖', title: 'ChatGPT API',         desc: 'Integração OpenAI',       prompt: 'Como integrar a API do ChatGPT em uma aplicação web com Node.js?' },
    { emoji: '🔮', title: 'Redes Neurais',       desc: 'Deep Learning',           prompt: 'Explique redes neurais de forma visual e intuitiva para iniciantes' },
    { emoji: '👁️', title: 'Computer Vision',     desc: 'Visão computacional',     prompt: 'Crie um exemplo de detecção de objetos em imagens com Python e OpenCV' },
    { emoji: '💬', title: 'NLP',                 desc: 'Processamento texto',     prompt: 'Explique os conceitos básicos de NLP: tokenização, embeddings, transformers' },
    { emoji: '📊', title: 'Data Science',        desc: 'Análise exploratória',    prompt: 'Crie um pipeline completo de análise exploratória de dados com Python' },
    { emoji: '🎯', title: 'Classificação ML',    desc: 'Modelo simples',          prompt: 'Crie um modelo de classificação de spam com scikit-learn passo a passo' },
    { emoji: '📈', title: 'Regressão',           desc: 'Previsão de valores',     prompt: 'Implemente regressão linear e polinomial para prever preços de casas' },
    { emoji: '🔍', title: 'Clustering',          desc: 'Agrupamento',             prompt: 'Explique e implemente K-Means para segmentação de clientes' },
    { emoji: '🎲', title: 'Recomendação',        desc: 'Sistema de recomendação', prompt: 'Crie um sistema de recomendação simples baseado em filtro colaborativo' },

    // ═══════════════════════════════════════════════════════════════
    // 🔒 APRENDIZADO - SEGURANÇA
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🔒', title: 'Segurança API',       desc: 'Boas práticas REST',      prompt: 'Quais as melhores práticas de segurança para APIs REST em produção?' },
    { emoji: '🛡️', title: 'OWASP Top 10',        desc: 'Vulnerabilidades',        prompt: 'Explique as 10 principais vulnerabilidades OWASP e como preveni-las' },
    { emoji: '🔑', title: 'OAuth 2.0',           desc: 'Autenticação moderna',    prompt: 'Explique OAuth 2.0 e OpenID Connect com diagrama de fluxo' },
    { emoji: '🔐', title: 'Criptografia',        desc: 'Fundamentos',             prompt: 'Explique criptografia simétrica, assimétrica e hashing com exemplos práticos' },
    { emoji: '🚫', title: 'SQL Injection',       desc: 'Prevenção',               prompt: 'Demonstre SQL Injection e como prevenir em diferentes linguagens' },
    { emoji: '⚠️', title: 'XSS Prevention',      desc: 'Cross-site scripting',    prompt: 'Explique tipos de XSS e como prevenir em aplicações React e Node.js' },
    { emoji: '🔏', title: 'CORS',                desc: 'Segurança cross-origin',  prompt: 'Explique CORS detalhadamente e como configurar corretamente em produção' },
    { emoji: '📜', title: 'CSP',                 desc: 'Content Security Policy', prompt: 'Como implementar Content Security Policy para proteção contra ataques' },
    { emoji: '🔒', title: 'HTTPS/SSL',           desc: 'Certificados',            prompt: 'Explique como HTTPS funciona e como configurar SSL/TLS em produção' },
    { emoji: '🛡️', title: 'Security Headers',    desc: 'Headers HTTP',            prompt: 'Quais headers de segurança HTTP são essenciais e como configurá-los' },

    // ═══════════════════════════════════════════════════════════════
    // 📚 APRENDIZADO - CONCEITOS E FUNDAMENTOS
    // ═══════════════════════════════════════════════════════════════
    { emoji: '📚', title: 'Python',              desc: 'Plano de estudos',        prompt: 'Crie um plano de 30 dias para aprender Python do zero com recursos gratuitos' },
    { emoji: '🎯', title: 'Clean Code',          desc: 'Código limpo',            prompt: 'Explique os princípios de Clean Code com exemplos de antes e depois' },
    { emoji: '🏗️', title: 'SOLID',               desc: 'Princípios OOP',          prompt: 'Explique cada princípio SOLID com exemplos práticos em JavaScript' },
    { emoji: '🔄', title: 'Git Avançado',        desc: 'Comandos úteis',          prompt: 'Explique git rebase, cherry-pick, stash, bisect e reflog com exemplos práticos' },
    { emoji: '📐', title: 'Arquitetura SW',      desc: 'Clean Architecture',      prompt: 'Explique Clean Architecture e como implementar em um projeto Node.js' },
    { emoji: '🧩', title: 'Microservices',       desc: 'Arquitetura distribuída', prompt: 'Explique microservices: quando usar, padrões, comunicação e desafios' },
    { emoji: '📊', title: 'Big O Notation',      desc: 'Complexidade',            prompt: 'Explique Big O Notation com exemplos visuais e código para cada complexidade' },
    { emoji: '🌳', title: 'Estruturas Dados',    desc: 'Árvores e Grafos',        prompt: 'Implemente árvore binária de busca e explique operações com complexidade' },
    { emoji: '🔍', title: 'Algoritmos',          desc: 'Busca e ordenação',       prompt: 'Implemente e compare algoritmos de ordenação: Bubble, Quick, Merge Sort' },
    { emoji: '💡', title: 'Problem Solving',     desc: 'Técnicas',                prompt: 'Explique técnicas de resolução de problemas: Two Pointers, Sliding Window, Recursão' },

    // ═══════════════════════════════════════════════════════════════
    // ⚡ APRENDIZADO - PERFORMANCE
    // ═══════════════════════════════════════════════════════════════
    { emoji: '⚡', title: 'Performance Web',     desc: 'Otimizações',             prompt: 'Quais as principais técnicas para melhorar a performance de um site em 2024?' },
    { emoji: '📦', title: 'Bundle Size',         desc: 'Reduzir tamanho',         prompt: 'Como analisar e reduzir o bundle size de uma aplicação React?' },
    { emoji: '🖼️', title: 'Image Optimization', desc: 'Otimizar imagens',        prompt: 'Quais técnicas e formatos modernos usar para otimização de imagens na web?' },
    { emoji: '💨', title: 'Lazy Loading',        desc: 'Carregamento preguiçoso', prompt: 'Implemente lazy loading de imagens, componentes e rotas em React' },
    { emoji: '🗂️', title: 'Caching Strategies', desc: 'Estratégias de cache',    prompt: 'Explique estratégias de cache: browser, CDN, Redis, service workers' },
    { emoji: '📊', title: 'Core Web Vitals',     desc: 'Métricas Google',         prompt: 'Explique LCP, FID e CLS e como melhorar cada métrica' },
    { emoji: '🔧', title: 'Profiling',           desc: 'Encontrar gargalos',      prompt: 'Como usar DevTools para identificar e corrigir problemas de performance' },
    { emoji: '⚙️', title: 'Node.js Perf',        desc: 'Backend performance',     prompt: 'Técnicas para melhorar performance de APIs Node.js em produção' },
    { emoji: '🔄', title: 'DB Performance',      desc: 'Otimização queries',      prompt: 'Como identificar e otimizar queries lentas em PostgreSQL' },
    { emoji: '📈', title: 'Monitoring',          desc: 'APM e métricas',          prompt: 'Como implementar monitoramento de performance em aplicações em produção' },

    // ═══════════════════════════════════════════════════════════════
    // 📝 PRODUTIVIDADE - DOCUMENTAÇÃO
    // ═══════════════════════════════════════════════════════════════
    { emoji: '📝', title: 'README',              desc: 'Para seu projeto',        prompt: 'Crie um README profissional para um projeto de API REST em Node.js' },
    { emoji: '📖', title: 'API Docs',            desc: 'Swagger/OpenAPI',         prompt: 'Crie documentação OpenAPI/Swagger completa para uma API de e-commerce' },
    { emoji: '📋', title: 'Changelog',           desc: 'Histórico versões',       prompt: 'Como manter um CHANGELOG profissional seguindo Semantic Versioning' },
    { emoji: '📚', title: 'Wiki Projeto',        desc: 'Documentação técnica',    prompt: 'Crie uma estrutura de wiki técnica para onboarding de novos desenvolvedores' },
    { emoji: '🎨', title: 'Storybook',           desc: 'Design System',           prompt: 'Como documentar componentes React com Storybook incluindo variações e props' },
    { emoji: '📐', title: 'ADR',                 desc: 'Architecture Decision',   prompt: 'Crie template e exemplos de Architecture Decision Records para projetos' },
    { emoji: '🗺️', title: 'Roadmap',             desc: 'Planejamento',            prompt: 'Crie um roadmap visual para projeto de software com milestones' },
    { emoji: '📊', title: 'Diagramas',           desc: 'Mermaid/PlantUML',        prompt: 'Crie diagramas de arquitetura, sequência e ER usando Mermaid' },
    { emoji: '✍️', title: 'Commit Messages',     desc: 'Conventional Commits',    prompt: 'Explique Conventional Commits com exemplos para diferentes situações' },
    { emoji: '📃', title: 'PR Template',         desc: 'Pull Request',            prompt: 'Crie templates de Pull Request e Issue para projetos open source' },

    // ═══════════════════════════════════════════════════════════════
    // 🔍 PRODUTIVIDADE - CODE QUALITY
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🔍', title: 'Code Review',         desc: 'Boas práticas',           prompt: 'Quais os pontos mais importantes para fazer um bom code review?' },
    { emoji: '🧹', title: 'ESLint/Prettier',     desc: 'Padronização',            prompt: 'Configure ESLint e Prettier profissional para projeto TypeScript/React' },
    { emoji: '🧪', title: 'Testing Strategy',    desc: 'Pirâmide de testes',      prompt: 'Explique a pirâmide de testes e quando usar cada tipo de teste' },
    { emoji: '🔬', title: 'E2E Tests',           desc: 'Cypress/Playwright',      prompt: 'Crie testes E2E com Cypress para fluxo de login e checkout' },
    { emoji: '📊', title: 'Code Coverage',       desc: 'Cobertura de testes',     prompt: 'Como configurar e interpretar relatórios de code coverage' },
    { emoji: '🔄', title: 'TDD',                 desc: 'Test Driven Dev',         prompt: 'Demonstre o ciclo TDD implementando uma funcionalidade do zero' },
    { emoji: '🎭', title: 'Mocking',             desc: 'Mocks e Stubs',           prompt: 'Explique e implemente mocks, stubs e spies em testes com Jest' },
    { emoji: '📏', title: 'Métricas Código',     desc: 'SonarQube',               prompt: 'Quais métricas de qualidade de código monitorar e como melhorá-las' },
    { emoji: '🔄', title: 'Refactoring',         desc: 'Técnicas seguras',        prompt: 'Demonstre técnicas de refactoring seguro com testes garantindo comportamento' },
    { emoji: '🚨', title: 'Error Handling',      desc: 'Tratamento de erros',     prompt: 'Boas práticas de tratamento de erros em Node.js e React' },

    // ═══════════════════════════════════════════════════════════════
    // 🚀 PRODUTIVIDADE - DEVOPS/DEPLOY
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🚀', title: 'Deploy',              desc: 'Passo a passo',           prompt: 'Explique como fazer deploy de uma aplicação Node.js na AWS do zero' },
    { emoji: '🐳', title: 'Docker',              desc: 'Containerização',         prompt: 'Crie Dockerfile e docker-compose para aplicação Node.js + PostgreSQL + Redis' },
    { emoji: '☸️', title: 'Kubernetes',          desc: 'Orquestração',            prompt: 'Explique conceitos básicos de Kubernetes: pods, services, deployments' },
    { emoji: '🔄', title: 'CI/CD',               desc: 'Pipeline',                prompt: 'Crie pipeline CI/CD com GitHub Actions para testes, build e deploy' },
    { emoji: '🏗️', title: 'Infrastructure',      desc: 'Terraform',               prompt: 'Crie infraestrutura AWS básica com Terraform: VPC, EC2, RDS, S3' },
    { emoji: '📊', title: 'Logging',             desc: 'Logs estruturados',       prompt: 'Implemente logging estruturado com Winston/Pino e agregação com ELK' },
    { emoji: '🔔', title: 'Alertas',             desc: 'Monitoring alerts',       prompt: 'Configure alertas inteligentes para aplicações em produção' },
    { emoji: '💾', title: 'Backup',              desc: 'Estratégias backup',      prompt: 'Implemente estratégia de backup automatizado para banco de dados' },
    { emoji: '🌐', title: 'CDN',                 desc: 'CloudFront/Cloudflare',   prompt: 'Configure CDN para assets estáticos e cache de API' },
    { emoji: '🔐', title: 'Secrets',             desc: 'Gestão de segredos',      prompt: 'Boas práticas para gerenciar secrets em diferentes ambientes' },

    // ═══════════════════════════════════════════════════════════════
    // 🐛 PRODUTIVIDADE - DEBUG/TROUBLESHOOTING
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🐛', title: 'Debug',               desc: 'Estratégias',             prompt: 'Quais as melhores estratégias para debugar um bug difícil de reproduzir?' },
    { emoji: '🔍', title: 'Chrome DevTools',     desc: 'Debug avançado',          prompt: 'Recursos avançados do Chrome DevTools para debug de performance e memória' },
    { emoji: '📊', title: 'Memory Leaks',        desc: 'Vazamento memória',       prompt: 'Como identificar e corrigir memory leaks em aplicações JavaScript' },
    { emoji: '🔥', title: 'Node Debug',          desc: 'Debug Node.js',           prompt: 'Técnicas e ferramentas para debug de aplicações Node.js em produção' },
    { emoji: '📈', title: 'APM Tools',           desc: 'Application monitoring',  prompt: 'Compare ferramentas APM: New Relic, Datadog, Sentry para Node.js' },
    { emoji: '🔄', title: 'Race Conditions',     desc: 'Bugs concorrência',       prompt: 'Como identificar e corrigir race conditions em aplicações assíncronas' },
    { emoji: '🌐', title: 'Network Debug',       desc: 'Problemas de rede',       prompt: 'Ferramentas e técnicas para debugar problemas de rede e latência' },
    { emoji: '💥', title: 'Error Tracking',      desc: 'Sentry setup',            prompt: 'Configure Sentry para rastreamento de erros em frontend e backend' },
    { emoji: '📋', title: 'Postmortem',          desc: 'Análise incidentes',      prompt: 'Crie template de postmortem para análise de incidentes em produção' },
    { emoji: '🔧', title: 'Troubleshooting',     desc: 'Diagnóstico',             prompt: 'Checklist de troubleshooting para problemas comuns em produção' },

    // ═══════════════════════════════════════════════════════════════
    // 💼 CARREIRA
    // ═══════════════════════════════════════════════════════════════
    { emoji: '📄', title: 'Currículo Dev',       desc: 'CV profissional',         prompt: 'Crie um modelo de currículo para desenvolvedor com 3 anos de experiência' },
    { emoji: '💼', title: 'LinkedIn',            desc: 'Perfil otimizado',        prompt: 'Como otimizar perfil LinkedIn para atrair recrutadores de tecnologia' },
    { emoji: '🎯', title: 'Entrevista Técnica', desc: 'Preparação',              prompt: 'Como se preparar para entrevistas técnicas de frontend em grandes empresas' },
    { emoji: '💰', title: 'Negociação',          desc: 'Salário e benefícios',    prompt: 'Técnicas de negociação salarial para desenvolvedores' },
    { emoji: '📈', title: 'Plano de Carreira',   desc: 'Crescimento',             prompt: 'Crie um plano de carreira de 5 anos para desenvolvedor fullstack' },
    { emoji: '🌟', title: 'Portfolio',           desc: 'Projetos pessoais',       prompt: 'Quais projetos incluir em um portfolio de desenvolvedor frontend?' },
    { emoji: '🤝', title: 'Soft Skills',         desc: 'Habilidades',             prompt: 'Quais soft skills são mais valorizadas para desenvolvedores sênior?' },
    { emoji: '📊', title: 'Tech Lead',           desc: 'Liderança técnica',       prompt: 'Quais habilidades desenvolver para se tornar Tech Lead?' },
    { emoji: '🏠', title: 'Remote Work',         desc: 'Trabalho remoto',         prompt: 'Boas práticas e ferramentas para trabalho remoto eficiente em tech' },
    { emoji: '🌍', title: 'Trabalhar Exterior', desc: 'Vagas internacionais',    prompt: 'Como conseguir emprego remoto em empresas internacionais como dev?' },

    // ═══════════════════════════════════════════════════════════════
    // 🎨 DESIGN/UX
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🎨', title: 'Design System',       desc: 'Componentes',             prompt: 'Como criar um Design System escalável para aplicações React' },
    { emoji: '📱', title: 'Mobile UX',           desc: 'Boas práticas',           prompt: 'Princípios de UX para design de aplicativos mobile' },
    { emoji: '♿', title: 'Acessibilidade',      desc: 'A11y',                    prompt: 'Checklist completo de acessibilidade para aplicações web (WCAG)' },
    { emoji: '🎭', title: 'Micro-interactions', desc: 'Animações sutis',         prompt: 'Crie micro-interações em CSS/JS para melhorar UX de formulários' },
    { emoji: '📐', title: 'UI Patterns',         desc: 'Padrões de interface',    prompt: 'Explique padrões de UI comuns: skeleton, infinite scroll, optimistic UI' },
    { emoji: '🖼️', title: 'Figma to Code',       desc: 'Design para código',      prompt: 'Boas práticas para converter designs Figma em código React responsivo' },
    { emoji: '🌈', title: 'Paleta de Cores',     desc: 'Escolha de cores',        prompt: 'Como criar uma paleta de cores acessível e harmoniosa para web' },
    { emoji: '✍️', title: 'Tipografia Web',      desc: 'Fontes e legibilidade',   prompt: 'Boas práticas de tipografia para web: escalas, line-height, responsividade' },
    { emoji: '📊', title: 'Data Visualization', desc: 'Gráficos e dashboards',   prompt: 'Princípios de design para visualização de dados e dashboards' },
    { emoji: '🔄', title: 'Design Tokens',       desc: 'Tokens CSS',              prompt: 'Implemente design tokens em CSS custom properties para tema dinâmico' },

    // ═══════════════════════════════════════════════════════════════
    // 🔧 FERRAMENTAS
    // ═══════════════════════════════════════════════════════════════
    { emoji: '⌨️', title: 'VS Code',             desc: 'Produtividade',           prompt: 'Melhores extensões e atalhos do VS Code para desenvolvedores JavaScript' },
    { emoji: '🐙', title: 'Git Workflow',        desc: 'Fluxo de trabalho',       prompt: 'Compare Git Flow, GitHub Flow e Trunk Based Development' },
    { emoji: '📦', title: 'Package Managers',    desc: 'npm vs yarn vs pnpm',     prompt: 'Compare npm, yarn e pnpm: performance, features e quando usar cada um' },
    { emoji: '🔧', title: 'Vite',                desc: 'Build tool moderno',      prompt: 'Como migrar projeto Create React App para Vite' },
    { emoji: '📊', title: 'Monorepo',            desc: 'Turborepo/Nx',            prompt: 'Como estruturar um monorepo com Turborepo para apps React e pacotes compartilhados' },
    { emoji: '🤖', title: 'GitHub Copilot',      desc: 'IA para código',          prompt: 'Dicas para usar GitHub Copilot de forma eficiente e produtiva' },
    { emoji: '📝', title: 'Notion Dev',          desc: 'Organização',             prompt: 'Como usar Notion para organizar projetos de desenvolvimento' },
    { emoji: '🎯', title: 'Postman',             desc: 'Testes de API',           prompt: 'Como usar Postman para documentar e testar APIs profissionalmente' },
    { emoji: '🔍', title: 'Regex',               desc: 'Expressões regulares',    prompt: 'Crie regex para validar email, URL, CPF, telefone e cartão de crédito' },
    { emoji: '💻', title: 'Terminal',            desc: 'CLI produtividade',       prompt: 'Comandos de terminal e aliases úteis para desenvolvedores' },

    // ═══════════════════════════════════════════════════════════════
    // 🌐 WEB APIS/INTEGRAÇÕES
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🌐', title: 'REST vs GraphQL',     desc: 'Quando usar cada um',     prompt: 'Compare REST e GraphQL: vantagens, desvantagens e casos de uso' },
    { emoji: '🔄', title: 'GraphQL',             desc: 'Queries e Mutations',     prompt: 'Crie schema GraphQL completo para aplicação de blog com Apollo Server' },
    { emoji: '📡', title: 'gRPC',                desc: 'RPC moderno',             prompt: 'Explique gRPC e quando usar em vez de REST ou GraphQL' },
    { emoji: '💳', title: 'Stripe',              desc: 'Pagamentos',              prompt: 'Implemente checkout com Stripe em Node.js: one-time e subscription' },
    { emoji: '📧', title: 'SendGrid',            desc: 'Email transacional',      prompt: 'Configure envio de emails transacionais com templates em SendGrid' },
    { emoji: '📱', title: 'Twilio',              desc: 'SMS e WhatsApp',          prompt: 'Implemente envio de SMS e WhatsApp com Twilio em Node.js' },
    { emoji: '🗺️', title: 'Google Maps',         desc: 'Mapas e geolocalização', prompt: 'Integre Google Maps API em React: markers, directions, geocoding' },
    { emoji: '🔐', title: 'Auth0',               desc: 'Auth as a Service',       prompt: 'Implemente autenticação completa com Auth0 em React + Node.js' },
    { emoji: '☁️', title: 'AWS SDK',             desc: 'Serviços AWS',            prompt: 'Exemplos de uso do AWS SDK para S3, SES, SQS e DynamoDB em Node.js' },
    { emoji: '🔥', title: 'Firebase',            desc: 'BaaS completo',           prompt: 'Crie app React com Firebase: auth, Firestore, storage e hosting' },

    // ═══════════════════════════════════════════════════════════════
    // 🆕 TECNOLOGIAS EMERGENTES
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🦀', title: 'Rust',                desc: 'Performance e segurança', prompt: 'Por que aprender Rust em 2024? Introdução e casos de uso para devs JS' },
    { emoji: '🔷', title: 'Go',                  desc: 'Backend eficiente',       prompt: 'Crie uma API REST simples em Go e compare com Node.js' },
    { emoji: '⚡', title: 'Bun',                 desc: 'Runtime JavaScript',      prompt: 'Compare Bun com Node.js: performance, compatibilidade e features' },
    { emoji: '🌐', title: 'WebAssembly',         desc: 'Performance web',         prompt: 'Introdução ao WebAssembly: o que é, quando usar e exemplo prático' },
    { emoji: '🔗', title: 'Web3',                desc: 'Blockchain basics',       prompt: 'Introdução a Web3 para desenvolvedores: carteiras, contratos, dApps' },
    { emoji: '📦', title: 'Edge Functions',      desc: 'Computação na edge',      prompt: 'Explique Edge Functions e como usar com Vercel/Cloudflare Workers' },
    { emoji: '🎮', title: 'Three.js',            desc: '3D na web',               prompt: 'Crie uma cena 3D interativa com Three.js e React Three Fiber' },
    { emoji: '🥽', title: 'AR/VR Web',           desc: 'Realidade aumentada',     prompt: 'Introdução ao WebXR para criar experiências AR/VR no browser' },
    { emoji: '📱', title: 'PWA',                 desc: 'Progressive Web Apps',    prompt: 'Transforme uma aplicação React em PWA com offline support' },
    { emoji: '🔄', title: 'Server Components',   desc: 'React Server Components', prompt: 'Explique React Server Components e como usar no Next.js 14' },

    // ═══════════════════════════════════════════════════════════════
    // 💡 PROJETOS PRÁTICOS
    // ═══════════════════════════════════════════════════════════════
    { emoji: '✅', title: 'Todo App',            desc: 'CRUD completo',           prompt: 'Guie-me para criar um Todo App completo com React, Node.js e PostgreSQL' },
    { emoji: '💬', title: 'Chat App',            desc: 'Tempo real',              prompt: 'Crie um aplicativo de chat em tempo real com Socket.io e React' },
    { emoji: '🛒', title: 'E-commerce',          desc: 'Loja virtual',            prompt: 'Estruture um e-commerce simples com carrinho, checkout e pagamento' },
    { emoji: '📝', title: 'Blog CMS',            desc: 'Sistema de blog',         prompt: 'Crie um CMS de blog com editor rich text, categorias e SEO' },
    { emoji: '🔗', title: 'URL Shortener',       desc: 'Encurtador de links',     prompt: 'Crie um encurtador de URLs com analytics de cliques' },
    { emoji: '📊', title: 'Dashboard',           desc: 'Painel analytics',        prompt: 'Crie um dashboard com gráficos de vendas usando Chart.js e React' },
    { emoji: '🔐', title: 'Auth System',         desc: 'Sistema de login',        prompt: 'Implemente sistema de autenticação completo: registro, login, reset senha, 2FA' },
    { emoji: '📸', title: 'Instagram Clone',     desc: 'Rede social',             prompt: 'Crie clone simplificado do Instagram: posts, likes, comments, follows' },
    { emoji: '🎵', title: 'Spotify Clone',       desc: 'Player de música',        prompt: 'Crie um player de música com playlist usando a Web Audio API' },
    { emoji: '📋', title: 'Kanban Board',        desc: 'Gestão de tarefas',       prompt: 'Crie um Kanban board com drag and drop usando React DnD' },

    // ═══════════════════════════════════════════════════════════════
    // 🎯 DESAFIOS DE CÓDIGO
    // ═══════════════════════════════════════════════════════════════
    { emoji: '🧩', title: 'Two Sum',             desc: 'Array challenge',         prompt: 'Resolva o problema Two Sum do LeetCode explicando a solução otimizada' },
    { emoji: '🔄', title: 'Palindrome',          desc: 'String manipulation',     prompt: 'Implemente verificação de palíndromo de múltiplas formas em JavaScript' },
    { emoji: '📊', title: 'Fibonacci',           desc: 'Recursão e DP',           prompt: 'Implemente Fibonacci com recursão, memoization e programação dinâmica' },
    { emoji: '🔍', title: 'Binary Search',       desc: 'Busca eficiente',         prompt: 'Implemente busca binária e explique variações para diferentes problemas' },
    { emoji: '🔗', title: 'Linked List',         desc: 'Estrutura de dados',      prompt: 'Implemente lista ligada com operações: inserir, remover, reverter, detectar ciclo' },
    { emoji: '📚', title: 'Stack e Queue',       desc: 'Filas e pilhas',          prompt: 'Implemente stack e queue e resolva problemas clássicos com cada estrutura' },
    { emoji: '🌳', title: 'Tree Traversal',      desc: 'Percorrer árvores',       prompt: 'Implemente traversal de árvore: inorder, preorder, postorder, level-order' },
    { emoji: '🔀', title: 'Merge Intervals',     desc: 'Intervalos',              prompt: 'Resolva o problema de merge de intervalos sobrepostos com explicação' },
    { emoji: '🎒', title: 'Knapsack',            desc: 'Programação dinâmica',    prompt: 'Resolva o problema da mochila explicando a abordagem de programação dinâmica' },
    { emoji: '🔢', title: 'Valid Parentheses',   desc: 'Uso de stack',            prompt: 'Implemente validação de parênteses balanceados com diferentes tipos de brackets' },
];

// Grupos temporais para organizar chats na sidebar
const TIME_GROUPS = [
    { label: 'Hoje',    maxMs: 864e5  },
    { label: 'Ontem',   maxMs: 1728e5 },
    { label: '7 dias',  maxMs: 6048e5 },
    { label: '30 dias', maxMs: 2592e6 },
    { label: 'Antigos', maxMs: Infinity },
];

// FIX: contador global para IDs únicos de blocos de pensamento
// — evita colisões que causariam toggle do bloco errado
let _thinkIdCounter = 0;

// ─── Helpers de conteúdo multimodal ──────────────────────────────────────────

/**
 * Extrai o texto puro de um content que pode ser string ou array de blocos.
 * Centralizado aqui para evitar repetição em filter, copy, wordcount, etc.
 * @param {string|Array} content
 * @returns {string}
 */
function _extractText(content) {
    if (Array.isArray(content)) {
        return content.find(b => b.type === 'text')?.text ?? '';
    }
    return content ?? '';
}

// ─── Lista de chats (sidebar) ─────────────────────────────────────────────────

/**
 * Re-renderiza a lista de chats na sidebar.
 * Separa fixados de não-fixados e agrupa estes por período.
 */
function renderList() {
    const sList   = el('sList');
    const filtered = _filterChats();

    if (!filtered.length) {
        sList.innerHTML = `<div class="s-empty">${searchFilter ? 'Nenhum resultado' : 'Nenhum chat ainda'}</div>`;
        return;
    }

    const frag    = document.createDocumentFragment();
    const pinned  = filtered.filter(c =>  c.pinned);
    const regular = filtered.filter(c => !c.pinned);

    if (pinned.length) {
        _appendGroupLabel(frag, '📌 Fixados');
        pinned.forEach(c => frag.appendChild(_buildSidebarItem(c)));
    }

    const now    = Date.now();
    const groups = Object.fromEntries(TIME_GROUPS.map(g => [g.label, []]));

    for (const c of regular) {
        const age = now - c.createdAt;
        const g   = TIME_GROUPS.find(g => age < g.maxMs);
        groups[g.label].push(c);
    }

    for (const { label } of TIME_GROUPS) {
        if (!groups[label].length) continue;
        _appendGroupLabel(frag, label);
        groups[label].forEach(c => frag.appendChild(_buildSidebarItem(c)));
    }

    sList.innerHTML = '';
    sList.appendChild(frag);
}

/**
 * Filtra chats pelo searchFilter atual.
 * FIX: suporte a content multimodal (array de blocos) via _extractText
 */
function _filterChats() {
    if (!searchFilter) return chats;
    const q = searchFilter.toLowerCase();
    return chats.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some(m => _extractText(m.content).toLowerCase().includes(q))
    );
}

/** Cria e anexa um label de grupo (ex: "Hoje", "📌 Fixados") */
function _appendGroupLabel(parent, text) {
    const g = document.createElement('div');
    g.className   = 's-group';
    g.textContent = text;
    parent.appendChild(g);
}

/**
 * Constrói o elemento DOM de um item da sidebar.
 * Usa event delegation interna para os botões de ação.
 */
function _buildSidebarItem(c) {
    const isActive = c.id === activeId;
    const it       = document.createElement('div');
    it.className   = ['s-item', isActive && 'act', c.pinned && 'pinned'].filter(Boolean).join(' ');
    it.dataset.id  = c.id;

    it.innerHTML = `
        <svg class="s-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${c.pinned ? SVG_ICONS.pin : SVG_ICONS.chat}
        </svg>
        <span class="s-item-text">${esc(c.title)}</span>
        <span class="s-item-count">${c.messages.length}</span>
        <div class="s-item-btns">
            <button class="s-item-btn" data-action="pin"  title="${c.pinned ? 'Desfixar' : 'Fixar'}">
                ${SVG_ICONS._wrap(SVG_ICONS.pin)}
            </button>
            <button class="s-item-btn" data-action="ren"  title="Renomear">
                ${SVG_ICONS._wrap(SVG_ICONS.pencil)}
            </button>
            <button class="s-item-btn" data-action="del"  title="Excluir">
                ${SVG_ICONS._wrap(SVG_ICONS.trash)}
            </button>
        </div>`;

    // Event delegation: um único listener cobre todos os botões
    it.addEventListener('click', async e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) { switchChat(c.id); return; }

        e.stopPropagation();
        switch (btn.dataset.action) {
            case 'pin': pinChat(c.id); break;
            case 'ren': renChat(c.id); break;
            case 'del':
                if (await customConfirm('Excluir este chat?', { danger: true, confirmText: 'Excluir' })) {
                    delChat(c.id);
                }
                break;
        }
    });

    return it;
}

// ─── Mensagens ────────────────────────────────────────────────────────────────

/**
 * Re-renderiza todas as mensagens do chat ativo.
 * Usa DocumentFragment para minimizar reflows.
 */
function renderMsgs() {
    const c = active();
    if (!c?.messages.length) { renderWelcome(); return; }

    const frag = document.createDocumentFragment();
    c.messages.forEach((m, i) => frag.appendChild(_buildMsgNode(m, i)));

    chatMsgs.innerHTML = '';
    chatMsgs.appendChild(frag);
    scrollDown();
}

/**
 * Constrói e retorna o nó DOM de uma mensagem.
 * Também chamado por send.js ao acrescentar mensagens novas.
 */
function addMsgDOM(m, msgIdx) {
    const node = _buildMsgNode(m, msgIdx);
    chatMsgs.appendChild(node);
    return node;
}

function _buildMsgNode(m, msgIdx) {
    const isUser = m.role === 'user';
    const chat   = active();
    const d      = document.createElement('div');
    d.className  = 'msg';
    d.dataset.idx = msgIdx;

    d.innerHTML = `
        <div class="msg-av ${isUser ? 'u' : 'a'}">
            ${isUser ? SVG.userAvatar : SVG.botAvatar}
        </div>
        <div class="msg-body">
            <div class="msg-name">${isUser ? 'Você' : 'RicinusAI'}</div>
            ${_buildImagesHTML(m.images)}
            ${_buildThinkHTML(m.thinking, m.meta)}
            <div class="msg-text">${isUser ? esc(_extractText(m.content)) : md(_extractText(m.content))}</div>
            ${_buildWordCountHTML(m.content)}
            <div class="msg-acts">
                <button class="act-btn" data-action="copy">📋 Copiar</button>
                ${!isUser ? `<button class="act-btn" data-action="regen">🔄 Regenerar</button>` : ''}
                ${chat && msgIdx !== undefined ? `<button class="act-btn" data-action="fork" data-idx="${msgIdx}">🔀 Bifurcar</button>` : ''}
                ${isUser ? `<button class="act-btn" data-action="edit">✏️ Editar</button>` : ''}
            </div>
        </div>`;

    _bindMsgEvents(d, m, msgIdx, isUser, chat);
    return d;
}

// ─── Builders de sub-blocos de mensagem ───────────────────────────────────────

function _buildImagesHTML(images) {
    if (!images?.length) return '';
    const imgs = images
        .filter(img => img.preview)
        .map(img => `<img src="${img.preview}" alt="${esc(img.name || 'imagem')}" data-lightbox>`)
        .join('');
    return imgs ? `<div class="msg-images">${imgs}</div>` : '';
}

function _buildThinkHTML(thinking, meta) {
    if (!thinking) return '';

    // FIX: contador incremental — elimina risco de colisão de IDs
    const tid = 'think_' + (_thinkIdCounter++);
    const dur = meta?.dur ? `<span class="think-dur">${meta.dur}s</span>` : '';

    return `
        <div class="think-box">
            <div class="think-head" data-tid="${tid}">
                <span class="think-arrow" id="ar_${tid}">▶</span> Pensamento${dur}
            </div>
            <div class="think-body" id="${tid}">${md(thinking)}</div>
        </div>`;
}

/**
 * FIX: usa _extractText para suportar content multimodal
 * — evita NaN ou crash quando wordCount() recebe um array
 */
function _buildWordCountHTML(content) {
    const wc = wordCount(_extractText(content));
    return `<div class="msg-word-count">${wc} palavra${wc !== 1 ? 's' : ''}</div>`;
}

// ─── Event bindings de mensagem ───────────────────────────────────────────────

/**
 * Registra todos os listeners de uma mensagem via event delegation.
 */
function _bindMsgEvents(node, m, msgIdx, isUser, chat) {
    // Toggle do bloco de pensamento
    node.querySelector('.think-head')?.addEventListener('click', function () {
        const tid = this.dataset.tid;
        el(tid)?.classList.toggle('open');
        el('ar_' + tid)?.classList.toggle('open');
    });

    // FIX: lightbox via addEventListener — remove dependência de global R.openLightbox
    node.querySelectorAll('img[data-lightbox]').forEach(img => {
        img.addEventListener('click', () => openLightbox(img.src));
    });

    // Delegation para os botões de ação
    node.querySelector('.msg-acts').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        switch (btn.dataset.action) {
            case 'copy':
                // FIX: usa _extractText — evita copiar "[object Object]" em mensagens multimodais
                navigator.clipboard.writeText(_extractText(m.content)).then(() => {
                    btn.textContent = '✅ Copiado!';
                    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
                });
                break;

            case 'regen':
                regen();
                break;

            case 'fork':
                if (chat) forkChat(chat.id, Number(btn.dataset.idx));
                break;

            case 'edit':
                if (isUser) editMessage(chat, msgIdx);
                break;
        }
    });
}

// ─── Tela de boas-vindas ──────────────────────────────────────────────────────

function renderWelcome() {
    const shuffled = [...WELCOME_CARDS]
        .sort(() => Math.random() - .5)
        .slice(0, 4);

    const cards = shuffled.map(({ emoji, title, desc, prompt }) => `
        <div class="w-card" data-p="${esc(prompt)}">
            <div class="w-card-t">${emoji} ${esc(title)}</div>
            <div class="w-card-d">${esc(desc)}</div>
        </div>`).join('');

    chatMsgs.innerHTML = `
        <div class="welcome">
            <div class="w-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.73 12.73l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
            </div>
            <h1 class="w-title">Como posso ajudar?</h1>
            <p class="w-sub">Sou o RicinusAI. Pergunte qualquer coisa — código, textos, análises e mais.</p>
            <div class="w-cards">${cards}</div>
        </div>`;

    chatMsgs.querySelector('.w-cards').addEventListener('click', e => {
        const card = e.target.closest('.w-card');
        if (!card) return;

        const inp = el('inp');
        inp.value = card.dataset.p;

        // FIX: dispara 'input' para acionar auto-resize e updCharCount antes do send()
        inp.dispatchEvent(new Event('input'));
        send();
    });
}

// ─── Scroll ───────────────────────────────────────────────────────────────────

// FIX: flag de rAF pendente — evita empilhar múltiplos frames em chamadas rápidas
let _scrollPending = false;

function scrollDown() {
    if (_scrollPending) return;
    _scrollPending = true;
    requestAnimationFrame(() => {
        chatWrap.scrollTop = chatWrap.scrollHeight;
        _scrollPending = false;
    });
}
