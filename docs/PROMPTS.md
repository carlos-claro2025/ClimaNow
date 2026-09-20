# Prompt de Reconstrução - ClimaNow

## Prompt Principal para IA

```
Crie um site de previsão do tempo completo chamado "ClimaNow" usando React 19 + Vite 8 com as seguintes funcionalidades:

1. PÁGINA PRINCIPAL (WeatherPage.jsx):
   - Busca de cidade com campo de input e botão buscar
   - Exibição de temperatura atual, condição climática, ícone dinâmico
   - Métricas: vento (km/h), umidade (%), pressão (hPa), relógio
   - Previsão para 3 dias em cards horizontais
   - Lista de cidades populares clicáveis
   - Botão "Ver radar de chuva" linkando para Windy (Centro-Oeste Brasil)
   - Barra de avisos INMET com ticker animado
   - Cards coloridos de alertas CEMADEN por severity (Muito Alto, Alto, Moderado, Mov. Massa, Risco Hidro.)
   - Botões "Mais quente" e "Mais frio" com cores laranja e gelo
   - Botão de refresh ↻ com status "Atualizado há DD/MM/AAAA HH:MM"
   - Toggle tema claro/escuro no topo (persiste em localStorage e ?tema=)
   - Modal ao clicar nos avisos INMET mostrando título, descrição formatada e link

2. PÁGINA DE CHUVA (RainPage.jsx):
   - Monitora 10 cidades: Goiânia, SP, Rio, BH, Curitiba, POA, Brasília, Salvador, Fortaleza, Recife
   - Mostra quais estão com chuva agora (isRaining: faixa 51-57 e 61-82, excluindo neve)
   - Card por cidade com temperatura
   - Botão para ver previsão da cidade
   - Toggle de tema funcional também nesta página

3. COMPONENTES:
   - Topbar: Logo + nome da cidade + toggle tema (preserva ?tema= e ?cidade= nos links)
   - InmetBar: Barra de avisos com animação de scroll
   - ErrorBoundary: captura erros de renderização (envolve o BrowserRouter)

4. CAMADA COMPARTILHADA (src/lib/) — obrigatória, evita duplicação entre páginas:
   - clima.jsx: fetchJson, geocode, forecastUrl, formatValue (null-safe),
     iconFor/labelFor (NEVE testada ANTES de chuva), cleanText, normalizeWarning,
     parseRss, fetchInmetWarnings, fetchRss, fetchCemaden, isRaining,
     CEMADEN_BASE = import.meta.env.VITE_CEMADEN_BASE || '/api/cemaden'
   - useTheme.js: prioridade ?tema= > localStorage > 'escuro'; aplica data-theme no <html>

5. CONFIGURAÇÕES:
   - vite.config.js com base:'/' e proxy para /api/cemaden → painelalertas.cemaden.gov.br
   - package.json com react, react-dom, react-router-dom, lucide-react, oxlint
   - styles.css com variáveis CSS para tema escuro e claro
   - Cores CEMADEN: vermelho (#ff4d4d), laranja (#fbbf24), amarelo (#facc15), coral (#ff7f50), azul (#4da6ff)
   - Design glassmorphism com backdrop-blur
   - Responsivo para mobile (breakpoints: 900px, 768px, 680px, 390px)

6. INTEGRAÇÕES DE API:
   - Open-Meteo: https://api.open-meteo.com/v1/forecast
   - INMET: https://apiprevmet3.inmet.gov.br/avisos/{ativos,rss}
   - CEMADEN: via proxy /api/cemaden/wsAlertas2 (dev: Vite; prod: nginx)

7. DEPLOY:
   - Dockerfile (node:20-alpine → nginx:alpine)
   - nginx.conf: proxy /api/cemaden/, cache de /assets/, fallback SPA try_files
   - Alternativa em host estático: VITE_CEMADEN_BASE + fallback de SPA do host

Gere todos os arquivos completos e funcionais.
```

## Prompt de Estilização

```
Crie um design moderno de site meteorológico com:
- Glassmorphism: backdrop-filter blur(12px), bordas sutis semi-transparentes
- Gradientes: radial-gradient nos cantos (ciano e roxo), linear-gradient 135deg no fundo
- Cards: border-radius 24px, padding generoso, sombras profundas (0 30px 60px)
- Tipografia: Segoe UI, Arial, sans-serif; títulos leves (font-weight 400), labels uppercase
- Cores: ciano (#67e8f9) e roxo (#a78bfa) como primárias
- Animações: hover com translateY(-1px), transições suaves 0.15s
- Responsivo: grid que adapta de 4→2→1 colunas
```

## Prompt de Funcionalidades Específicas

```
Implemente:
1. Ticker animado CSS: animação linear de 276s com translateX(-50%)
2. Parsing RSS XML: DOMParser, querySelectorAll('item'), extrair title/description/link, limpar HTML com cleanText
3. Cores dinâmicas CEMADEN: classes .cemade-danger, .cemade-warning, etc. com gradientes e glow
4. Toggle tema: hook useTheme — prioridade ?tema= > localStorage 'clima-theme' > 'escuro'; data-theme no <html>; grava ?tema= SOMENTE no toggle (updater funcional), nunca em um efeito que observa params
5. Geocoding: busca lat/lon antes de consultar forecast
6. Ordenação de códigos WMO: neve {71,73,75,77,85,86} ANTES de chuva {61-82}, senão o ícone Snowflake e o rótulo 'Neve' ficam inalcançáveis
7. Formatação null-safe: formatValue(null) → '-- °C' (nunca chamar toFixed em null)
8. Ciclo de vida: AbortController no useEffect de mount, com abort() no cleanup
9. Alertas: Promise.allSettled (uma fonte fora do ar não derruba as outras)
10. base:'/' no Vite — com base:'./' uma rota profunda como /chuva serve index.html onde o bundle JS é esperado (tela branca)
11. Um parâmetro de URL tem UM ÚNICO escritor. A cidade é derivada da URL
    (params.get('cidade') || DEFAULT_CITY), nunca espelhada em estado local; só
    selectCity grava ?cidade=, e o ?tema= só é gravado no toggle do tema. Dois
    escritores no mesmo tick se sobrescrevem (cada setSearchParams resolve contra
    o snapshot do seu componente) e a página alterna entre as cidades
12. pending = loading && !weather: os valores só viram '--' na primeira carga;
    zerar a cada requisição faz a temperatura piscar na troca de cidade
```

## Bug reportado pelo usuário: cidades alternando

**Sintoma:** ao selecionar ou digitar uma segunda cidade, o site alternava entre as
duas e a temperatura ficava ilegível.

**Causa raiz:** dois escritores independentes para a mesma URL. `loadData` gravava
`?cidade=` e o efeito do `useTheme` gravava `?tema=` a cada mudança de `params`.
Como cada `setSearchParams` resolve contra o snapshot de `searchParams` do próprio
componente, a gravação do tema partia de uma URL que ainda não tinha a cidade nova
e **revertia** `?cidade=`. Isso mudava `location.search`, o que recriava a
identidade de `params` e de `loadData`, disparando de novo o efeito
`[params, city, loadData]` → novo `loadData` → `loading = true` → tudo outra vez.
Loop fechado.

**Correção:** URL como fonte única de verdade. A cidade saiu do estado local,
`selectCity` virou o único escritor de `?cidade=`, o efeito de sincronização foi
removido, `loadData` deixou de escrever na URL e o `useTheme` passou a gravar
`?tema=` somente no toggle. Somado a isso: `AbortController` por cidade (resposta
atrasada não sobrescreve a nova) e `pending` para não zerar a temperatura.

**Verificação (navegador real, build de produção):** trocar de cidade por chip →
1 chamada de geocoding; digitar e buscar → 2 requisições; botão ↻ → 1 geocoding +
1 forecast com a URL inalterada; toggle de tema → `?cidade=` preservado. Em todos
os casos a URL assumiu um único valor e a temperatura teve apenas 2 valores
distintos (antes → depois).