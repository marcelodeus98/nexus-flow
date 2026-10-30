# Nexa Flow — Web

Front do Nexa Flow: React 19, Vite 8, React Router 7 (`react-router-dom`), TanStack Query 5, Mantine 9, Tabler Icons e axios: as mesmas bibliotecas do front do Nexa Assets. O board usa dnd-kit e os textos ricos usam Tiptap. A API fica no repositório irmão `../api`.

## Requisitos

- Node 22 (`nvm use`, lê o `.nvmrc`)
- pnpm via Corepack (`corepack enable`)
- API rodando em `http://localhost:3000` (veja `../api/README.md`)

## Primeiro uso

```bash
cp .env.example .env.local
pnpm install
pnpm dev              # http://localhost:5173
```

Em dev, o Vite repassa `/api` e `/socket.io` para a API (`VITE_API_PROXY_TARGET`). O navegador só fala com a própria origem, como acontece em produção atrás do Caddy, então cookies httpOnly e CORS funcionam sem configuração extra. O header mostra o status da API e do banco.

## Estrutura

```
src/
  app/          # providers, router, layout, páginas de casca
  features/     # um diretório por domínio (board, cards, sprints...)
  shared/       # api (cliente axios), auth (sessão), brand (logo), notify (avisos), config (env)
  styles/       # tema Mantine e tokens Nexa (globals.css)
  test/         # setup do Vitest
```

Importe a partir de `src` com o alias `@/`, por exemplo `import { http } from '@/shared/api/http'`.

## Design system

A identidade visual é a mesma do Nexa Assets:

- **Tema Mantine:** `src/styles/theme.ts`, com o teal da marca como primário (tom 7, `#017A72`), navy e cinzas da paleta.
- **Tokens CSS:** `src/styles/globals.css` (`--nexa-teal`, `--nexa-navy`, `--nexa-slate`, `--nexa-mist`, `--nexa-surface`...), copiados do Assets.
- **Shell:** `src/app/layout/` tem a sidebar navy, com logo, seções e usuário, e a topbar branca, com breadcrumb, busca, timer e notificações. O CSS veio do Assets.
- **Marca:** `BrandIcon` e `BrandLogo` (símbolo "N" + wordmark "Nexa / Flow") ficam em `src/shared/brand`. As telas de login usam a mesma moldura e as mesmas imagens do Assets.
- **Componentes:** use os do Mantine (`Button`, `Select`, `Modal`, `Drawer`, `Table`...). Estilos próprios ficam num `.css` ao lado do componente, como no Assets, usando os tokens `--nexa-*` em vez de cores fixas.
- **Avisos e confirmações:** `@/shared/notify/toast` (Mantine Notifications) e `@/shared/notify/confirm` (Mantine Modals).
- **Board:** o card do board usa elementos simples com `board.css`, porque um board pode ter 500 cards.

## Board

- **Rotas:** `/p/:key` é o board padrão e `/p/:key/b/:boardId`, qualquer outro board do projeto (com seletor no topo quando há mais de um). `c/:número` abre o card num painel lateral sobre o board, e `/p/:key/settings` são as configurações (geral, membros, boards, colunas, regras e tags). As tags globais ficam em `/admin/tags`.
- **Drag-and-drop:** usa dnd-kit, com mouse e teclado. Ao soltar, o cache do TanStack Query é atualizado na hora, com um rank provisório calculado pelo mesmo `fractional-indexing` da API, e depois vem o `POST /cards/:id/move`. Se der erro, o board volta ao estado do servidor.
- **Tempo real:** `useProjectRealtime` entra na sala do projeto e aplica os eventos no cache. Um evento com `version` menor que a do cache é descartado. Ao reconectar, o board é buscado de novo.
- **Permissões:** `useCan(key)('card:move')` esconde ou desabilita ações. Quem decide de fato é a API.
- **Mobile:** em telas pequenas, o board mostra uma coluna por vez, escolhida num seletor.
- **Scrum e Híbrido:** o board filtra pela sprint ativa (padrão em Scrum) ou mostra todos os cards. Em `/p/:key/backlog` ficam o planejamento, o início e o encerramento das sprints; em `/p/:key/sprints/:id`, o relatório com o burndown.
- **QA:**
  - **Card:** seções Validação do QA (aprovar, aprovar e concluir, reprovar com motivo), Casos de teste (anexar e marcar passou, falhou ou bloqueado; a falha pode gerar um bug) e Bugs encontrados (reportar bug).
  - **Projeto:** aba **Casos de teste** com a biblioteca.
  - **Sidebar:** a **Fila de testes** mostra os cards em "Em teste".
  - **Board:** bugs com borda vermelha e severidade, e filtros por tipo e severidade.
- **Card:** o painel do card tem board (para mover a outro board), checklist (os itens de QA só são editáveis por QA, PO e gestor), timer e lançamentos de tempo, anexos (upload direto ao R2), comentários com menções (`@nome`) e histórico.
- **Timer:** fica no header, sincronizado entre abas pelo socket. O tempo decorrido é sempre calculado a partir do `startedAt` do servidor.
- **Burndown:** o gráfico é SVG próprio (`features/sprints/burndown-chart.tsx`), com tooltip, navegação por teclado e alternativa em tabela. As cores são os tokens `--series-1`, `--chart-reference` e `--chart-grid` de `src/index.css`.

## Sessão

O access token fica só em memória (`src/shared/auth/session-store.ts`). Ao carregar a página, a sessão volta pelo cookie httpOnly de refresh. O `http()` (sobre axios) renova o token uma vez após um 401 e repete a requisição. As rotas protegidas usam os loaders de `features/auth/route-guards.ts` (`requireSession`, `requireAdmin`).

## Scripts

| Script | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Typecheck + build de produção em `dist/` |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | tsc / oxlint / prettier |
| `pnpm test` / `pnpm test:watch` | Vitest + Testing Library (jsdom). `renderWithProviders` e `mockApi` em `src/test/` |

O CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes e build, e valida a imagem Docker.

## Docker (produção)

```bash
docker build -t nexa-flow-web .
```

A imagem é um Caddy servindo o `dist/` com fallback de SPA e cache longo para `/assets`. As rotas `/api` e `/socket.io` são roteadas pelo Caddy de borda da VPS, não por esta imagem.
