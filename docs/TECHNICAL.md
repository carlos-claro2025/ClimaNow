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
- **Docker**: Containerização para deploy
- **Wasmer**: Plataforma de deployment serverless
- **GitHub**: Controle de versão e CI/CD

## Estrutura de Diretórios

```
climanow/
├── .github/                    # Configurações do GitHub
│   └── workflows/              # GitHub Actions (se houver)
├── docs/                       # Documentação
├── public/                     # Arquivos estáticos
│   └── index.html              # Template HTML principal
├── src/
│   ├── components/             # Componentes reutilizáveis
│   │   ├── Topbar.jsx          # Barra superior com logo e theme toggle
│   │   └── InmetBar.jsx        # Barra de avisos INMET com ticker
│   ├── pages/                  # Páginas da aplicação
│   │   ├── weather/
│   │   │   └── WeatherPage.jsx # Página principal do clima
│   │   └── rain/
│   │       └── RainPage.jsx    # Página de monitoramento de chuva
│   ├── styles.css              # Estilos globais (CSS custom properties)
│   ├── App.jsx                 # Configuração de rotas
│   └── main.jsx                # Ponto de entrada React
├── .gitignore                  # Arquivos ignorados pelo git
├── Dockerfile.wasmer           # Dockerfile para Wasmer
├── docker-compose.yml          # Configuração Docker local
├── index.html                  # HTML entry para Vite
├── nginx.conf                  # Configuração nginx para produção
├── package.json                # Dependências e scripts
├── package-lock.json           # Lock de dependências
├── README.md                   # Documentação principal
├── vite.config.js              # Configuração do Vite + proxy
└── vite-env.d.ts               # Tipagens Vite
```

## Detalhamento dos Componentes

### 1. Topbar.jsx
```jsx
// Funções principais:
- Renderiza logo com ícone
- Exibe nome do app "ClimaNow"
- Botão toggle claro/escuro com ícone sol/lua
- Atualiza tema no localStorage e DOM
```

### 2. InmetBar.jsx
```jsx
// Funções principais:
- Recebe warnings e ticker como props
- Animação CSS de scroll horizontal
- Abre modal com detalhes ao clicar
- Suporta ambos formatos (array strings e objetos)
```

### 3. WeatherPage.jsx (Principal)
```jsx
// Estados:
- theme: 'claro' | 'escuro'
- city: cidade selecionada
- input: texto do campo busca
- warnings: array de avisos INMET
- loading: estado de carregamento
- error: mensagem de erro
- weather: dados meteorológicos atuais
- forecast: previsão para 3 dias
- popular: cidades populares
- comparison: { hot, cold } temperaturas extremas
- clock: relógio em tempo real
- selectedWarning: aviso selecionado para modal
- ticker: items do feed RSS
- cemadem: alertas CEMADEN
- lastUpdate: timestamp última atualização
- searchCounts: histórico de buscas

// Funções assíncronas:
- loadData(name): carrega weather + forecast + geo
- loadWarnings(): busca avisos INMET API
- loadTicker(): parseia RSS INMET
- loadCemadem(): busca alertas CEMADEN (via proxy)
- loadComparison(): calcula mais quente/frio
- handleRefreshWarnings(): atualiza todos os dados
- handleOpenWarnings(): abre modal primeiro aviso
```

### 4. RainPage.jsx
```jsx
// Funções principais:
- Verifica quais cidades estão com chuva agora
- Lista 10 cidades monitoradas
- Mostra temperatura em cada uma
- Link para página principal
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
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.1",
    "lucide-react": "^0.469.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
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
// Via proxy local
GET /api/cemaden/wsAlertas2
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
git push origin main

# Atualizar branch local
git pull origin main
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
# Build
docker build -t climanow .

# Run
docker run -p 80:80 climanow
```

### Wasmer
```bash
# Build image
docker build -f Dockerfile.wasmer -t climanow:wasmer .

# Deploy (segue documentação Wasmer)
```

---

**Nota**: Este documento fornece todas as informações técnicas necessárias para recriar o projeto do zero.