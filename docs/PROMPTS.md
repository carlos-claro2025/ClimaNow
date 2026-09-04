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
   - Botão de refresh ↻ com status "Última atualização: HH:MM"
   - Toggle tema claro/escuro no topo
   - Modal ao clicar nos avisos INMET mostrando título, descrição formatada e link

2. PÁGINA DE CHUVA (RainPage.jsx):
   - Monitora 10 cidades: Goiânia, SP, Rio, BH, Curitiba, POA, Brasília, Salvador, Fortaleza, Recife
   - Mostra quais estão com chuva agora (códigos 51-99 do Open-Meteo)
   - Card por cidade com temperatura
   - Botão para ver previsão da cidade

3. COMPONENTES:
   - Topbar: Logo + nome + toggle tema
   - InmetBar: Barra de avisos com animação de scroll

4. CONFIGURAÇÕES:
   - vite.config.js com proxy para /api/cemaden → painelalertas.cemaden.gov.br
   - package.json com react, react-dom, react-router-dom, lucide-react
   - styles.css com variáveis CSS para tema escuro e claro
   - Cores CEMADEN: vermelho (#ff4d4d), laranja (#fbbf24), amarelo (#facc15), coral (#ff7f50), azul (#4da6ff)
   - Design glassmorphism com backdrop-blur
   - Responsivo para mobile (breakpoints: 900px, 768px, 680px, 390px)

5. INTEGRAÇÕES DE API:
   - Open-Meteo: https://api.open-meteo.com/v1/forecast
   - INMET: https://apiprevmet3.inmet.gov.br/avisos/{ativos,rss}
   - CEMADEN: via proxy local /api/cemaden/wsAlertas2

6. DEPLOY:
   - Dockerfile com nginx
   - Dockerfile.wasmer para deploy em nuvem
   - github/workflows para CI/CD

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
2. Parsing RSS XML: DOMParser, querySelectorAll('item'), extrair title/description/link
3. Cores dinâmicas CEMADEN: classes .cemade-danger, .cemade-warning, etc. com gradientes e glow
4. Toggle tema: localStorage 'clima-theme', atributo data-theme no <html>
5. Relógio: setInterval 1s, toLocaleTimeString('pt-BR')
6. Geocoding: busca lat/lon antes de consultar forecast
```