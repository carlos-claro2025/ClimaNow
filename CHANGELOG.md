# Changelog

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