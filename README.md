# ClimaNow - Previsão do Tempo em Tempo Real

Aplicação web moderna para monitoramento meteorológico com integração de múltiplas fontes de dados.

## 🌤️ Funcionalidades Principais

### 1. Previsão do Tempo Atual
- Temperatura, sensação térmica, condições climáticas
- Velocidade do vento, umidade, pressão atmosférica
- Relógio em tempo real
- Ícone dinâmico baseado nas condições (sol, nuvens, chuva, neve, tempestade)

### 2. Busca de Cidades
- Campo de busca com autocomplete
- Lista de cidades populares (atualizada automaticamente baseada no histórico)
- Monitorea 10 cidades principais do Brasil automaticamente

### 3. Previsão para 3 Dias
- Cards com previsão diária
- Temperatura máxima e mínima
- Condição climática com ícone
- Data formatada em português

### 4. Radar de Chuva (Windy)
- Botão "Ver radar de chuva" linka para radar da Windy
- Região Centro-Oeste do Brasil (Goiânia e região)
- Overlay de radar em tempo real
- Métricas em unidades brasileiras (°C, km/h)

### 5. Avisos do INMET
- Feed RSS atualizado com avisos meteorológicos
- Ticker animado com últimos 8 avisos
- Modal com detalhes completos do aviso
- Botão para abrir página oficial do INMET
- Parsing limpo (sem tags HTML)

### 6. Alertas CEMADEN
- Cards coloridos por nível de severidade:
  - **Muito Alto**: Vermelho (#ff4d4d) - glow vermelho
  - **Alto**: Laranja/dourado (#fbbf24) - glow laranja
  - **Moderado**: Amarelo (#facc15) - glow amarelo
  - **Mov. Massa**: Tomate/coral (#ff7f50) - glow coral
  - **Risco Hidro.**: Azul (#4da6ff) - glow azul
- Contagem de alertas ativos por categoria
- Timestamp da última atualização
- Indicador de erro se API indisponível

### 7. Comparação de Temperaturas
- Botão "Mais quente" (cor laranja/fogo)
- Botão "Mais frio" (cor gelo/azul)
- Clique para navegar à cidade selecionada
- Calculada entre as 10 cidades monitoradas, uma vez por carregamento
- Só é recalculada ao recarregar a página (não a cada troca de cidade)

### 8. Sistema de Temas
- Toggle claro/escuro no topo
- Persistência via localStorage (`clima-theme`)
- Preferência restaurada ao recarregar; `?tema=` na URL tem prioridade
- `?tema=` é gravado na URL apenas quando o usuário usa o toggle
- Variáveis CSS para ambos os temas
- Transições suaves

### 9. Troca de Cidade
- A cidade ativa vive na URL (`?cidade=`), não em estado duplicado
- `selectCity` é o único ponto que grava `?cidade=`, então a URL nunca
  disputa com o `?tema=` nem alterna entre cidades
- Requisição anterior é abortada: resposta atrasada não sobrescreve a nova
- Os valores numéricos só exibem `--` na primeira carga, para a temperatura não
  piscar durante a troca

### 10. Atualização Manual
- Botão ↻ para refrescar todos os dados
- Status "Última atualização: DD/MM/AAAA HH:MM"
- Atualiza: INMET, CEMADEN, ticker, previsão

## 🏗️ Arquitetura Técnica

### Stack Tecnológica
- **React 19** com Vite 8
- **Lucide React** para ícones
- **React Router DOM** para navegação
- **CSS Modules** com variáveis CSS customizadas
- **Open-Meteo API** para dados meteorológicos
- **INMET API** para avisos meteorológicos
- **CEMADEN API** para alertas de risco

### Estrutura de Arquivos
```
climanow/
├── src/
│   ├── components/
│   │   ├── Topbar.jsx          # Barra superior com theme toggle
│   │   ├── InmetBar.jsx        # Barra de avisos INMET
│   │   └── ErrorBoundary.jsx   # Fallback para erros de renderização
│   ├── lib/
│   │   ├── clima.jsx           # Helpers compartilhados (API, ícones, avisos)
│   │   └── useTheme.js         # Hook de tema (data-theme + localStorage + URL)
│   ├── pages/
│   │   ├── weather/
│   │   │   └── WeatherPage.jsx # Página principal
│   │   └── rain/
│   │       └── RainPage.jsx    # Página de monitoramento de chuva
│   ├── styles.css              # Estilos globais
│   ├── App.jsx                 # Roteamento
│   └── main.jsx                # Entry point
├── index.html                  # Template HTML (Vite, com meta tags de SEO)
├── vite.config.js              # Configuração do Vite + proxy CORS
├── nginx.conf                  # SPA fallback + proxy CEMADEN (produção)
├── Dockerfile                  # Build + nginx
├── cemaden-proxy/              # App Wasmer Edge separado (proxy CORS do CEMADEN)
├── package.json
└── README.md
```

> `cemaden-proxy/` é um app Wasmer independente, versionado aqui apenas para
> guardar o fonte. O build do Vite o ignora (publica só `dist/`).

### Configuração do Proxy CORS
O Vite é configurado para burlar CORS da API CEMADEN:
```javascript
// vite.config.js
server: {
  proxy: {
    '/api/cemaden': {
      target: 'https://painelalertas.cemaden.gov.br',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/cemaden/, '')
    }
  }
}
```

### Endpoints de API Utilizados

#### Open-Meteo (Previsão do tempo)
- **Geocoding**: `https://geocoding-api.open-meteo.com/v1/search?name={cidade}`
- **Forecast**: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=...&daily=...&hourly=...`

#### INMET (Avisos meteorológicos)
- **Avisos ativos**: `https://apiprevmet3.inmet.gov.br/avisos/ativos`
- **Feed RSS**: `https://apiprevmet3.inmet.gov.br/avisos/rss`

#### CEMADEN (Alertas de risco)
- **Alertas**: `<base>/wsAlertas2` (cadeia: `VITE_CEMADEN_BASE` → `/api/cemaden` → worker Wasmer Edge)
- Base configurável via `VITE_CEMADEN_BASE` (sem sufixo `/wsAlertas2`)
- Resposta JSON com array `alertas` contendo: `nivel`, `evento`, `municipio`, `uf`, `datahoracriacao`

## 🎨 Design System

### Cores (Tema Escuro)
```css
:root {
  --bg1: #020817;           /* Fundo principal */
  --bg2: #0f172a;           /* Fundo secundário */
  --bg3: #111827;           /* Fundo terciário */
  --panel: rgba(15, 23, 42, 0.75);
  --text: #e2e8f0;
  --muted: #94a3b8;
  --primary: #67e8f9;       /* Ciano */
  --secondary: #a78bfa;     /* Roxo */
  --success: #86efac;
  --danger: #fda4af;
  --border: rgba(148, 163, 184, 0.18);
}
```

### Cores CEMADEN
- Muito Alto: `#ff4d4d` com glow vermelho
- Alto: `#fbbf24` com glow laranja
- Moderado: `#facc15` com glow amarelo
- Mov. Massa: `#ff7f50` com glow coral
- Risco Hidro.: `#4da6ff` com glow azul

### Tipografia
- Fonte: 'Segoe UI', Arial, sans-serif
- Títulos: font-weight 400, letter-spacing negativo
- Labels: text-transform uppercase, letter-spacing 0.12em

### Componentes UI
- **Cards**: border-radius 24px, backdrop-blur, shadow 30px
- **Chips**: border-radius 999px, hover com elevação
- **Metrics**: grid 4 colunas, bordas sutis
- **Forecast**: grid 3 colunas, cards com ícone central

## 🚀 Deploy

### Build Local
```bash
npm install
npm run build
```

### Deploy com Docker
O `Dockerfile` na raiz já usa o `nginx.conf` (fallback de SPA + proxy CEMADEN):
```bash
docker build -t climanow .
docker run -p 8080:80 climanow
```

### Deploy estático (Netlify / Vercel / Cloudflare Pages)
- Build: `npm run build` · Publish dir: `dist`
- Configure o rewrite de SPA (`/*` → `/index.html`).
- O CEMADEN precisa de proxy reverso. Em host estático a cadeia de fallback já
  cai no worker `cemaden-proxy` (`https://cemaden-proxy.wasmer.app`, fonte em
  `cemaden-proxy/`); para usar outro endpoint, defina `VITE_CEMADEN_BASE` no
  build. Sem isso os cards do CEMADEN ficam em `0`.

## 📱 Responsividade

Breakpoints:
- **900px**: Metrics em 2 colunas
- **768px**: Header e topbar em coluna, fontes menores
- **680px**: Layout full stack, forecast 1 coluna
- **390px**: Padding reduzido, grid 1 coluna

## 🔧 Comandos de Desenvolvimento

```bash
# Instalação
npm install

# Desenvolvimento
npm run dev

# Build produção
npm run build

# Preview build
npm run preview

# Git operations
git add .
git commit -m "Descrição da mudança"
git push
```

## 📊 Dados Monitorados

### Cidades Padrão
1. Goiânia
2. São Paulo
3. Rio de Janeiro
4. Belo Horizonte
5. Curitiba
6. Porto Alegre
7. Brasília
8. Salvador
9. Fortaleza
10. Recife

### Métricas Exibidas
- Temperatura atual (°C)
- Velocidade do vento (km/h)
- Umidade relativa (%)
- Pressão atmosférica (hPa)
- Relógio digital
- Condição climática (label)

## 🎯 Prompt de Comandos para IA

### Reconstrução do Projeto
```
"Crie um site de previsão do tempo usando React + Vite com:
1. Busca de cidade e display de temperatura/atual
2. Previsão para 3 dias com ícones
3. Integração com Open-Meteo API
4. Avisos do INMET via RSS feed
5. Alertas CEMADEN com cards coloridos
6. Botão para radar de chuva Windy
7. Sistema de tema claro/escuro
8. Design moderno com glassmorphism"
```

### Estilização
```
"Estilo visual:
- Glassmorphism com backdrop-blur
- Cores gradientes (ciano/roxo)
- Cards com bordas sutis e sombras profundas
- Animações suaves em hovers
- Tipografia clean com pesos variados
- Responsivo para mobile"
```

### Funcionalidades Específicas
```
"Funcionalidades avançadas:
- Ticker animado para avisos INMET
- Modal para detalhes de aviso
- Parsing de RSS XML para texto limpo
- Proxy CORS via Vite para CEMADEN
- Contadores de alertas por severity
- Comparação de temperaturas entre cidades
- Relógio em tempo real"
```

## 📝 Licença

Projeto desenvolvido como clone funcional do site original. Uso educacional e pessoal.

## 🔗 Links Úteis

- **Site Original**: https://carlosklaro.zo.space (extinto)
- **Repositório**: https://github.com/carlos-claro2025/ClimaNow
- **API Open-Meteo**: https://open-meteo.com/
- **API INMET**: https://apiprevmet3.inmet.gov.br/
- **API CEMADEN**: https://painelalertas.cemaden.gov.br/
- **Radar Windy**: https://www.windy.com/

---

**Nota**: Este documento serve como referência completa para reconstrução do projeto. Todas as funcionalidades estão implementadas e testadas em produção.