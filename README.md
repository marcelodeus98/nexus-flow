# Nexa Flow — Web

Front do Nexa Flow: React 19, Vite 8, React Router 8, TanStack Query 5, Tailwind CSS 4. A API fica no repositório irmão `../api`.

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
  shared/       # api (cliente HTTP), auth (sessão), config (env validado), ui (shadcn)
  test/         # setup do Vitest
```

Importe a partir de `src` com o alias `@/`, por exemplo `import { http } from '@/shared/api/http'`.

## Design system

Os componentes são do shadcn/ui (Radix, preset Nova, ícones Lucide) e ficam em `src/shared/ui`. As cores são tokens CSS em `src/index.css`. Para adicionar um componente:

```bash
pnpm dlx shadcn@latest add <componente>   # ex.: tabs, popover
```

O `components.json` já aponta o shadcn para `src/shared/ui`. Use os tokens (`bg-background`, `text-muted-foreground`...) em vez de cores fixas.

## Board

- **Rotas:** `/p/:key` é o board; `/p/:key/c/:número` abre o card num painel lateral sobre o board; `/p/:key/settings` são as configurações (geral, membros, colunas e tags).
- **Drag-and-drop:** usa dnd-kit, com mouse e teclado. Ao soltar, o cache do TanStack Query é atualizado na hora, com um rank provisório calculado pelo mesmo `fractional-indexing` da API, e depois vem o `POST /cards/:id/move`. Se der erro, o board volta ao estado do servidor.
- **Tempo real:** `useProjectRealtime` entra na sala do projeto e aplica os eventos no cache. Um evento com `version` menor que a do cache é descartado. Ao reconectar, o board é buscado de novo.
- **Permissões:** `useCan(key)('card:move')` esconde ou desabilita ações. Quem decide de fato é a API.
- **Mobile:** em telas pequenas, o board mostra uma coluna por vez, escolhida num seletor.
- **Scrum e Híbrido:** o board filtra pela sprint ativa (padrão em Scrum) ou mostra todos os cards. Em `/p/:key/backlog` ficam o planejamento, o início e o encerramento das sprints; em `/p/:key/sprints/:id`, o relatório com o burndown.
- **Card:** o painel do card tem checklist, timer e lançamentos de tempo, anexos (upload direto ao R2), comentários com menções (`@nome`) e histórico.
- **Timer:** fica no header, sincronizado entre abas pelo socket. O tempo decorrido é sempre calculado a partir do `startedAt` do servidor.
- **Burndown:** o gráfico é SVG próprio (`features/sprints/burndown-chart.tsx`), com tooltip, navegação por teclado e alternativa em tabela. As cores são os tokens `--series-1`, `--chart-reference` e `--chart-grid` de `src/index.css`.

## Sessão

O access token fica só em memória (`src/shared/auth/session-store.ts`). Ao carregar a página, a sessão volta pelo cookie httpOnly de refresh. O `http()` renova o token uma vez após um 401 e repete a requisição. As rotas protegidas usam os loaders de `features/auth/route-guards.ts` (`requireSession`, `requireAdmin`).

## Scripts

| Script | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Typecheck + build de produção em `dist/` |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | tsc / oxlint / prettier |
| `pnpm test` / `pnpm test:watch` | Vitest + Testing Library (jsdom) |

O CI (`.github/workflows/ci.yml`) roda lint, typecheck, testes e build, e valida a imagem Docker.

## Docker (produção)

```bash
docker build -t nexa-flow-web .
```

A imagem é um Caddy servindo o `dist/` com fallback de SPA e cache longo para `/assets`. As rotas `/api` e `/socket.io` são roteadas pelo Caddy de borda da VPS, não por esta imagem.
