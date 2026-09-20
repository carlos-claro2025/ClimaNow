# Documentação Técnica - ClimaNow

## Visão Geral

Documento técnico para recriação completa do projeto por desenvolvedores e designers.

## Tecnologias Utilizadas

### Frontend
- **React 19**: Biblioteca para construção da interface
- **Vite 8**: Bundler e build tool
- **Lucide React**: Biblioteca de ícones SVG
- **React Router DOM**: Sistema de roteamento
- **CSS3**: Estilização com variáveis customizadas

### APIs Externas
- **Open-Meteo API**: Dados meteorológicos gratuitos
- **INMET API**: Avisos meteorológicos oficiais do Brasil
- **CEMADEN API**: Alertas de risco do governo federal

### Infraestrutura
- **Docker**: `Dockerfile` (node build → nginx serve) + `nginx.conf`
- **Host estático**: alternativa sem proxy, usando `VITE_CEMADEN_BASE`
- **GitHub**: Controle de versão

## Estrutura de Diretórios

```
climanow/
├── docs/                       # Documentação
│   ├── PROMPTS.md              # Prompts de reconstrução por IA
│   └── TECHNICAL.md            # Este documento
├── src/
│   ├── components/             # Componentes reutilizáveis
│   │   ├── Topbar.jsx          # Barra superior (logo, cidade, theme toggle)
│   │   ├── InmetBar.jsx        # Barra de avisos INMET com ticker
│   │   └── ErrorBoundary.jsx   # Captura erros de renderização
│   ├── lib/                    # Camada compartilhada (não é UI)
│   │   ├── clima.jsx           # APIs, ícones, rótulos, avisos, CEMADEN
│   │   └── useTheme.js         # Hook de tema (localStorage + ?tema=)
│   ├── pages/                  # Páginas da aplicação
│   │   ├── weather/
│   │   │   └── WeatherPage.jsx # Página principal do clima
│   │   └── rain/
│   │       └── RainPage.jsx    # Página de monitoramento de chuva
│   ├── styles.css              # Estilos globais (CSS custom properties)
│   ├── App.jsx                 # Configuração de rotas (+ catch-all 404)
│   └── main.jsx                # Ponto de entrada React (ErrorBoundary)
├── .dockerignore               # Arquivos ignorados no build Docker
├── .gitignore                  # Arquivos ignorados pelo git
├── Dockerfile                  # Build (node) + serve (nginx)
├── index.html                  # HTML entry para Vite + meta tags SEO
├── nginx.conf                  # Proxy CEMADEN + cache + fallback SPA
├── package.json                # Dependências e scripts
├── package-lock.json           # Lock de dependências
├── README.md                   # Documentação principal
└── vite.config.js              # Configuração do Vite + proxy de dev
```

> `public/`, `Dockerfile.wasmer` e `docker-compose.yml` **não existem** neste projeto.
> O alvo de deploy é um host estático ou o container definido em `Dockerfile`.

## Detalhamento dos Componentes

### 0. src/lib/clima.jsx — camada compartilhada

Todo acesso a API, mapeamento de ícones/rótulos e normalização de avisos vive
aqui. `WeatherPage` e `RainPage` **não duplicam** essa lógica.

```js
// Constantes
MONITORED           // cidades da página /chuva
POPULAR             // cidades sugeridas
CEMADEN_BASE        // import.meta.env.VITE_CEMADEN_BASE || '/api/cemaden'
EMPTY_CEMADEN       // objeto de contagens zeradas
INMET_OFFLINE       // mensagem de fallback

// Rede
fetchJson(url, signal)        // fetch + erro + abort
geocode(name, signal)         // Open-Meteo geocoding
forecastUrl(lat, lon)         // URL do forecast (current + daily)
fetchInmetWarnings(signal)    // avisos ativos (JSON)
fetchRss(signal)              // RSS INMET (XML)
fetchCemaden(signal)          // /wsAlertas2 → contagens por severidade

// Formatação / classificação
formatDate(d)
formatValue(value, unit, digits)  // null-safe: null → '-- °C'
iconFor(code, isDay, size)        // componente lucide
labelFor(code)                    // texto do estado do tempo
isRaining(code)                   // true só para chuva (não neve)
cleanText(html)                   // remove tags e entidades
normalizeWarning(item)            // string | objeto → {title, description, link}
parseRss(xmlText)                 // DOMParser → [{title, description, link}]
```

**Regra crítica de ordenação:** os códigos de neve `{71,73,75,77,85,86}` são
testados **antes** da faixa de chuva `61–82`, tanto em `iconFor` quanto em
`labelFor`. Invertido, o ícone `Snowflake` e o rótulo `'Neve'` ficam inalcançáveis.

### 0b. src/lib/useTheme.js

```js
useTheme() // → { theme, toggle }
```
Prioridade de leitura: `?tema=` na URL > `localStorage['clima-theme']` > `'escuro'`.
Aplica `data-theme` em `<html>` e persiste em `localStorage`.

O `?tema=` é gravado **somente no `toggle`**, com updater funcional (`prev => ...`)
para não apagar outros parâmetros. Não existe efeito espelhando o tema na URL:
esse efeito era o segundo escritor de `?cidade=`, resolvia contra um snapshot
antigo e revertia a troca de cidade (causa do bug de oscilação).

### 1. Topbar.jsx
```jsx
// Props: { theme, onToggle, city }
- Renderiza logo com ícone
- Botão toggle claro/escuro com ícone sol/lua
- Links montam a URL com URLSearchParams, preservando ?tema= (e ?cidade= no logo)
```
`city` é usado apenas para manter a cidade no link do logo; o nome exibido na
página vem de `weather.place`.

### 2. InmetBar.jsx
```jsx
// Props: { warnings, ticker, onOpen }
- Animação CSS de scroll horizontal
- Delega a formatação para normalizeWarning() da lib
- Abre modal com detalhes ao clicar
- Suporta ambos formatos (array strings e objetos)
```

### 3. WeatherPage.jsx (Principal)
```jsx
// Estados:
- theme (via useTheme)
- input: texto do campo busca
- warnings: array de avisos INMET
- loading: estado de carregamento
- error: mensagem de erro
- weather: dados meteorológicos atuais
- forecast: previsão para 3 dias
- popular: cidades populares
- comparison: { hot, cold } temperaturas extremas
- selectedWarning: aviso selecionado para modal
- ticker: items do feed RSS
- cemaden: alertas CEMADEN
- lastUpdate: Date da última atualização
- reloadToken: contador que força nova busca da mesma cidade (botão ↻)
- searchCounts: histórico de buscas (só incrementa em busca do usuário)

// A cidade NÃO é estado local: é derivada da URL
- const city = params.get('cidade') || DEFAULT_CITY
- selectCity(name) é o ÚNICO escritor de ?cidade= (grava input + setParams + conta a busca)
- Um único useEffect, com dependência [city, loadData, reloadToken], dispara loadData
- loadData(name, signal) apenas busca e preenche; nunca escreve na URL

// Funções (todas em useCallback):
- loadData(name, signal): carrega weather + forecast + geo (deps: [])
- loadWarnings(signal): avisos INMET
- loadTicker(signal): RSS INMET
- refreshAlerts(): Promise.allSettled das 3 fontes de alerta
- loadComparison(): calcula mais quente/frio (global, roda uma vez)
- selectCity(name): troca de cidade (input + URL + ranking)
- handleRefreshWarnings(): botão ↻ — incrementa reloadToken e recarrega os alertas
- handleOpenWarnings(): abre modal do primeiro aviso

// Ciclo de vida:
- Efeito de alertas/comparison com deps [refreshAlerts, loadComparison] (uma vez)
- Efeito de cidade com AbortController; o cleanup aborta a requisição anterior, de modo
  que uma resposta atrasada da cidade antiga nunca sobrescreve a nova
- pending = loading && !weather: os valores só viram "--" na primeira carga, para a
  temperatura não piscar durante uma troca de cidade
- lastUpdate é exibido como DD/MM/AAAA HH:MM (toLocaleString)
```

> **Regra de ouro desta página:** um parâmetro de URL tem **um único escritor**.
> Antes, `loadData` gravava `?cidade=` e o efeito do `useTheme` gravava `?tema=`;
> como cada `setSearchParams` resolve contra o snapshot de `searchParams` do seu
> próprio componente, as duas gravações se sobrescreviam — a URL voltava para a
> cidade anterior, o efeito de sincronização disparava de novo e a página ficava
> alternando entre as duas cidades, com a temperatura ilegível.

### 4. RainPage.jsx
```jsx
// Funções principais:
- Verifica quais cidades estão com chuva agora (isRaining)
- Lista as cidades de MONITORED com temperatura e condição
- Link "Ver radar de chuva" → Windy (Centro-Oeste do Brasil)
- Reutiliza warnings/RSS/modal da lib (não duplica)
```

### 5. ErrorBoundary.jsx
```jsx
- Class component com componentDidCatch
- Envolve o <BrowserRouter> em main.jsx
- Evita tela branca: mostra mensagem + botão de recarregar
```

## Sistema de Cores

### Variáveis CSS (Tema Escuro)
```css
--bg1: #020817;          /* Fundo principal escuro */
--bg2: #0f172a;          /* Segundo plano */
--bg3: #111827;          /* Terceiro plano */
--panel: rgba(15, 23, 42, 0.75);  /* Painéis glassmorphism */
--panel-soft: rgba(30, 41, 59, 0.8);
--text: #e2e8f0;         /* Texto principal */
--muted: #94a3b8;        /* Texto secundário */
--primary: #67e8f9;      /* Cor primária (ciano) */
--secondary: #a78bfa;    /* Cor secundária (roxo) */
--success: #86efac;      /* Sucesso (verde) */
--danger: #fda4af;       /* Perigo (vermelho claro) */
--border: rgba(148, 163, 184, 0.18); /* Bordas sutis */
```

### Cores CEMADEN
```css
.cemade-danger  { color: #ff4d4d; text-shadow: glow vermelho; }
.cemade-warning { color: #fbbf24; text-shadow: glow laranja; }
.cemade-moderado{ color: #facc15; text-shadow: glow amarelo; }
.cemade-geo     { color: #ff7f50; text-shadow: glow coral; }
.cemade-hidro   { color: #4da6ff; text-shadow: glow azul; }
```

### Gradientes de Fundo
```css
body {
  background: radial-gradient(circle at 15% 15%, rgba(103, 232, 249, 0.16), transparent 30%),
              radial-gradient(circle at 85% 85%, rgba(167, 139, 250, 0.16), transparent 30%),
              linear-gradient(135deg, var(--bg1), var(--bg2) 52%, var(--bg3));
}
```

## Configurações Importantes

### vite.config.js
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/',          // obrigatório: BrowserRouter pede /assets/... em qualquer rota
  server: {
    proxy: {
      '/api/cemaden': {
        target: 'https://painelalertas.cemaden.gov.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cemaden/, '')
      }
    }
  }
})
```

### package.json Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router-dom": "^7.18.3",
    "lucide-react": "^1.40.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.1.0",
    "oxlint": "^1.79.0",
    "vite": "^8.2.2"
  }
}
```

## Integrações de API

### Open-Meteo API
```javascript
// Geocoding
GET https://geocoding-api.open-meteo.com/v1/search?name={cidade}&count=1&language=pt&format=json

// Previsão
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&timezone=auto&forecast_days=3&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m
```

### INMET API
```javascript
// Avisos ativos
GET https://apiprevmet3.inmet.gov.br/avisos/ativos

// Feed RSS
GET https://apiprevmet3.inmet.gov.br/avisos/rss
```

### CEMADEN API
```javascript
// Via proxy (dev: vite.config.js | prod: nginx.conf)
GET /api/cemaden/wsAlertas2
// Resposta: { alertas: [...], atualizado: "DD-MM-AAAA HH:MM:SS UTC" }

// Classificação das contagens:
// muitoAlto = nivel === 'Muito Alto'   alto = 'Alto'   moderado = 'Moderado'
// geo       = evento.startsWith('Mov')  hidro = /Enx|Ris|Hidro/i.test(evento)
```

## Estilo de Design

### Glassmorphism
```css
.card {
  background: var(--panel);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
  border-radius: 24px;
}
```

### Animações
```css
/* Spinner de carregamento */
.spin { animation: spin 1s linear infinite; }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Ticker de avisos */
.notice-ticker-track {
  animation: ticker-scroll 276s linear infinite;
}
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

### Responsividade
```css
/* Breakpoints */
@media (max-width: 900px) { .metrics { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .inmet-barra { font-size: 14px; padding: 5px 8px; } }
@media (max-width: 680px) {
  .header-row, .topbar { flex-direction: column; }
  .search-row { flex-direction: column; }
  .current { grid-template-columns: 1fr; }
  .forecast-grid { grid-template-columns: 1fr; }
}
@media (max-width: 390px) {
  .app-shell { padding-inline: 8px; }
  .topbar, .card { padding: 14px; }
  .metrics { grid-template-columns: 1fr; }
  .rain-grid { grid-template-columns: 1fr; }
}
```

## Comandos Git Úteis

```bash
# Inicializar repositório
git init
git add .
git commit -m "Initial commit"

# Criar branch para feature
git checkout -b feature/nova-funcionalidade

# Ver status
git status
git diff

# Commit e push
git add .
git commit -m "Descrição clara da mudança"
git push origin master

# Atualizar branch local
git pull origin master
```

## Deploy

### Local
```bash
npm run dev
# Acesso: http://localhost:5173
```

### Produção
```bash
npm run build
npm run preview
# Acesso: http://localhost:4173
```

### Docker
```bash
# Build (node:20-alpine compila o dist, nginx:alpine serve)
docker build -t climanow .

# Run
docker run -p 80:80 climanow
```
O container usa `nginx.conf`, que:
- faz proxy reverso de `/api/cemaden/` → `https://painelalertas.cemaden.gov.br/`
- serve `/assets/` com cache imutável
- faz fallback de SPA (`try_files $uri $uri/ /index.html`) para `/chuva` funcionar em refresh direto

### Host estático (Netlify, Vercel, GitHub Pages, S3, Wasmer)
```bash
npm run build   # gera dist/
```
Sem nginx **não há proxy de CEMADEN**. Nesse caso defina o endpoint antes do build:
```bash
# .env
VITE_CEMADEN_BASE=https://<host-com-CORS>/wsAlertas2
```
E configure o fallback de SPA no host (senão `/chuva` em refresh direto dá 404).
O `App.jsx` tem uma rota catch-all (`*` → `/`) como rede de segurança.

> O build **já resolve isso sozinho**: o plugin `spa-deep-links` em `vite.config.js`
> copia `dist/index.html` para `dist/<rota>/index.html` (hoje `dist/chuva/index.html`).
> Assim `/chuva` existe como arquivo real em qualquer host estático, sem depender de
> regra de rewrite. Ao **criar uma nova rota** em `App.jsx`, adicione-a ao array
> `SPA_ROUTES` em `vite.config.js`.
>
> Links internos devem apontar para a forma **com barra final** (`/chuva/`): o host
> redireciona `/chuva` → `/chuva/` com HTTP 308 e, nesse salto, a query string
> (`?tema=`) é descartada.

---

**Nota**: Este documento fornece todas as informações técnicas necessárias para recriar o projeto do zero.