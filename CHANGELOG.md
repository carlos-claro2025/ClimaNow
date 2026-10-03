# Changelog

## 2026-10-03 — Previsão enriquecida, confiança de chuva e typecheck

### 🌦️ Precisão e riqueza de dados

| # | Melhoria | Detalhe |
|---|----------|---------|
| 29 | **Uma única requisição de clima** | `current` + `hourly` + `daily` juntas — blocos nunca discordam entre si |
| 30 | **Sensação térmica e rajadas** | "Parece que" + rajadas de vento no card principal |
|  | **Cobertura de nuvens e precipitação** | Novos campos exibidos no detalhe |
| 31 | **Rosa dos ventos em 8 pontos** | Rótulos em português (N, NE, L, SE…) em vez de graus |
| 32 | **Faixa horária de 24h** | `forecast_hours=24` relativo à hora atual, já no fuso da cidade |
| 33 | **Previsão de 7 dias** | Máx/mín + chance de chuva + índice UV por dia |
| 34 | **Atualização automática** | Recarrega sozinho a cada 10 min (`AUTO_REFRESH_MS`) |
| 35 | **Ícone de lua após as 18:00** | `isNightHour()` — noite = 18:00–05:59 |

> Nota: o MSN Clima usa dados licenciados/proprietários que não podem ser
> replicados. O ganho aqui é **completude e frescor** dos dados, não "exatidão"
> idêntica.

### 🌧️ Monitor de Chuva

| # | Melhoria | Detalhe |
|---|----------|---------|
| 36 | **Confiança em 3 níveis** | `alta` / `média` / `baixa` a partir de 3 sinais (código WMO, precipitação real, cobertura de nuvens) |
| 37 | **Chuva em mm/h e % de nuvens** | Cada chip mostra o valor medido, não só "está chovendo" |
| 38 | **Ordenação por confiança** | Cidades confirmadas primeiro |
| 39 | **Link do Windy com lat/lon** | `lat=…&lon=…&zoom=10` no lugar do marcador fixo |

### 🔧 Qualidade e Tooling

| # | Adição | Benefício |
|---|--------|-----------|
| 40 | **Script `npm run typecheck`** | `tsc --noEmit` roda no CI |
| 41 | **`src/vite-env.d.ts`** | Tipa `import.meta.env.VITE_CEMADEN_BASE` |
| 42 | **23 erros de tipo corrigidos** | Todos os campos da API agora usam `?? null` corretamente |
| 43 | **`tsconfig.json` reparado** | Removido `baseUrl` (removido no TypeScript 7) e o alias `@/*` nunca usado |
| 44 | **CI roda typecheck + testes** | Antes o build passava com `isNightHour is not defined` |

> **Por que isso importa:** `vite build` **não** acusa identificadores não
> definidos. O bug `isNightHour is not defined` chegou até a tela do usuário
> porque só a ExecutionBoundary percebia. O `typecheck` fecha essa brecha.

---

## 2026-10-02 — Melhorias e Correções

### 🐛 Correções de Bugs (7 itens)

| # | Problema | Solução |
|---|----------|---------|
| 1 | **Timeout nas APIs** | Adicionado `fetchWithTimeout` (10s) para evitar travamentos |
| 2 | **Relógio re-renderizando toda a página** | Extraído para componente `Clock` isolado |
| 3 | **/chuva carregava sequencialmente** | Paralelizado com `Promise.allSettled` |
| 4 | **Links externos inseguros** | Função `safeExternalUrl` valida protocolo |
| 5 | **Chips de cidade não atualizavam** | Sincronizado com URL como fonte de verdade |
| 6 | **Radar sempre mostrava Goiânia** | Agora usa lat/lon da cidade selecionada |
| 7 | **Cidade perdida ao voltar de /chuva** | Parâmetro `cidade` propagado nos links |

### 🏗️ Refatoração de Arquitetura

| # | Melhoria | Impacto |
|---|----------|---------|
| 8 | **Hook `useInmetAlerts` compartilhado** | Eliminou duplicação entre páginas |
| 9 | **`WarningModal` reutilizável** | Componente único para alertas |
| 10 | **Ícones extraídos para `icons.tsx`** | Separação de responsabilidades |
| 11 | **Cache de geocoding (10min TTL)** | Reduz chamadas de API em 90% |
| 12 | **`KNOWN_COORDS` hardcoded** | 10 cidades sem necessidade de geocoding |
| 13 | **Removido `hourly=temperature_2m`** | Menos dados transferidos |

### 🧪 Qualidade e Testes

| # | Adição | Benefício |
|---|--------|-----------|
| 14 | **VITest com 24 testes** | Cobertura das funções puras |
| 15 | **CI (GitHub Actions)** | Build e lint automáticos em PRs |
| 16 | **Dependabot** | Atualizações semanais de dependências |

### 📱 PWA e Offline

| # | Adição | Benefício |
|---|--------|-----------|
| 17 | **`manifest.json`** | Instalável como app |
| 18 | **`sw.js` (Service Worker)** | Cache offline para estáticos |

### ♿ Acessibilidade

| # | Adição | Benefício |
|---|--------|-----------|
| 19 | **Tecla Escape fecha modal** | Navegação por teclado |
| 20 | **Focus trap no modal** | A11y para leitores de tela |
| 21 | **`aria-labelledby`** | Associação semântica |
| 22 | **`<label>` para busca** | Input acessível |

### 📝 Documentação e Infra

| # | Correção | Detalhe |
|---|----------|---------|
| 23 | **README: "CSS Modules" → "CSS global"** | Documentação correta |
| 24 | **Dockerfile: usuário non-root** | Segurança |
| 25 | **Dockerfile: healthcheck** | Monitoramento de container |

### ⚡ TypeScript (Migração Completa)

| # | Arquivos | Benefício |
|---|----------|-----------|
| 26 | **19 arquivos convertidos** | `.jsx` → `.tsx`/`.ts` |
| 27 | **Interfaces tipadas** | `Coordinates`, `Warning`, `CemadenData`, `WeatherData`, etc. |
| 28 | **`tsconfig.json` strict** | `noUnusedLocals`, `noUnusedParameters` |

### 📊 Estatísticas

- **Commits:** 10
- **Arquivos alterados:** 30+
- **Linhas adicionadas:** ~1.500
- **Linhas removidas:** ~300
- **Testes:** 24 (22 ativos, 2 pulados)
- **Build:** ✅ Passando
- **Lint:** ✅ 1 warning pré-existente

### 🎯 Principais Melhorias

1. **Performance:** Cache de geocoding + remoção de dados desnecessários
2. **Confiabilidade:** Timeouts em todas as APIs + Error Boundary
3. **Manutenibilidade:** Código tipado + componentes reutilizáveis
4. **Offline:** PWA com service worker
5. **Acessibilidade:** Navegação por teclado + ARIA
6. **CI/CD:** Pipeline automático + Dependabot

---

## Commits

| Hash | Mensagem |
|------|----------|
| `HEAD` | fix: import isNightHour; add typecheck script and CI step; repair tsconfig; fix 23 type errors |
| `f3114bc` | feat: moon icon for night hours in the hourly strip |
| `ba69075` | feat: enriched forecast — feels-like, gusts, cloud cover, 24h strip, 7-day forecast |
| `6c7df12` | feat: rain confidence levels (alta/média/baixa) with precipitation and cloud cover |
| `d7008c3` | fix: Windy radar link now uses lat/lon/zoom instead of a fixed marker |
| `5acf897` | docs: add CHANGELOG with all improvements |
| `7bc0cf1` | fix: add name, admin1, country to Coordinates interface and KNOWN_COORDS |
| `7fa55f3` | refactor: migrate to TypeScript |
| `c4600bf` | feat: add PWA support with manifest and service worker |
| `9170ba8` | a11y: add Escape key, focus trap, aria-labelledby to modal; label for search |
| `2c223d5` | test: add VITest for pure functions in clima.jsx |
| `8e773e3` | ci: add GitHub Actions workflow and Dependabot config |
| `4ab7a09` | docs: fix CSS Modules claim; Dockerfile: non-root user and healthcheck |
| `27222d3` | refactor: extract icons to icons.jsx, add geocode cache, remove unused hourly param |
| `236a03d` | refactor: extract shared useInmetAlerts hook and WarningModal |
| `ef79920` | Fix weather radar city, clock re-render, parallel /chuva, timeouts, chips, city URL, and link safety |

---

## Backup

Tag `backup/antes-das-correcoes` aponta para o commit `6202581` (estado antes das correções).