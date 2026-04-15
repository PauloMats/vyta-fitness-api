# VYTA API Backend

Backend REST production-ready para o produto fitness VYTA, construído com NestJS + Fastify + Prisma + PostgreSQL + Docker e pronto para deploy no Railway.

## Stack

- NestJS 11 com Fastify
- Node 22
- pnpm
- Prisma ORM + PostgreSQL
- JWT access + refresh tokens
- Rotação de refresh token por sessão/device, detecção de reuse e revogação por família
- Argon2 para hashing
- API versionada em `/api/v1`
- Swagger em `/docs`
- Healthcheck em `/api/health`
- Docker multi-stage + docker-compose

## Estrutura

```text
src/
  auth/
  assessments/
  comments/
  common/
  config/
  exercises/
  feed/
  friendships/
  health/
  likes/
  messages/
  media/
  notifications/
  prisma/
  students/
  support/
  trainer-students/
  trainers/
  users/
  workout-days/
  workout-plans/
  workout-sessions/
```

## Setup local

1. Copie `.env.example` para `.env`.
2. Suba o banco:
   ```bash
   docker compose up -d postgres
   ```
3. Gere o client Prisma:
   ```bash
   pnpm prisma:generate
   ```
4. Aplique as migrations:
   ```bash
   pnpm prisma:migrate:deploy
   ```
5. Rode o seed:
   ```bash
   pnpm prisma:seed
   ```
6. Suba a API:
   ```bash
   pnpm start:dev
   ```

## Comandos úteis

```bash
pnpm build
pnpm test:e2e
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm prisma:seed
pnpm catalog:import:exercises
docker compose up --build
```

## Docker

- `docker-compose.yml` sobe `api` + `postgres`.
- O `entrypoint` executa `prisma migrate deploy` antes do boot da aplicação.
- A aplicação respeita `PORT` e faz bind em `0.0.0.0`.
- A imagem final não leva testes nem relatórios de cobertura.

## Catalogo de exercicios

- O catalogo principal fica em `vyta-exercise-catalog.v1.json` na raiz do projeto.
- O resumo de conferência fica em `vyta-exercise-catalog.summary.json`.
- Para importar ou atualizar o catalogo manualmente:
  ```bash
  pnpm catalog:import:exercises
  ```
- O `seed` usa o catalogo automaticamente quando o arquivo principal estiver presente na raiz.

## Autenticação

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Todos os demais endpoints usam JWT Bearer por padrão.

## Avaliações físicas

- `POST /api/v1/assessments`
- `PATCH /api/v1/assessments/:id`
- `POST /api/v1/assessments/:id/complete`
- `GET /api/v1/assessments/:id`
- `GET /api/v1/students/:studentId/assessments`
- `GET /api/v1/students/:studentId/progress`

O domínio `PhysicalAssessment` separa perfil atual do aluno e histórico técnico. O `StudentProfile` agora guarda apenas o resumo corrente.

## Notificações

- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/read-all`
- `POST /api/v1/notifications`

As notificações são persistidas no banco, ordenadas por `createdAt desc` e a listagem retorna `unreadCount` no `meta`.

## Realtime (SSE)

- `GET /api/v1/realtime/stream`

O backend expõe um stream SSE para invalidação leve de cache no frontend. Ele não substitui as rotas REST; ele avisa quando o frontend deve recarregar dados.

Eventos emitidos atualmente:

- `notifications.invalidate`
- `messages.invalidate`
- `support.invalidate`
- `connected`
- `heartbeat`

Autenticação:

- preferencialmente via `Authorization: Bearer <accessToken>`
- fallback para `?accessToken=...` quando o cliente usar `EventSource` nativo

Filtro opcional por canal:

- `?channels=notifications,messages`
- canais suportados: `notifications`, `messages`, `support`

## Mensagens diretas

- `POST /api/v1/messages`
- `GET /api/v1/messages/inbox`
- `GET /api/v1/messages/sent`
- `GET /api/v1/messages/:id`
- `PATCH /api/v1/messages/:id/read`

Regras de autorização:

- `STUDENT` só pode enviar mensagem para trainer com vínculo `ACTIVE`
- `TRAINER` só pode enviar mensagem para student com vínculo `ACTIVE`
- criar mensagem gera notificação persistida para o destinatário

## Suporte

- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets/me`
- `GET /api/v1/support/tickets/:id`
- `PATCH /api/v1/support/tickets/:id/status`

O ticket sempre é salvo no banco. O envio de e-mail é tentado em seguida; se falhar, o ticket não é perdido.

Variáveis adicionais para suporte por e-mail:

- `RESEND_API_KEY`
- `SUPPORT_TO_EMAIL`
- `SUPPORT_FROM_EMAIL`

## Qualidade

- ValidationPipe global com `whitelist`, `forbidNonWhitelisted` e `transform`
- Filtros globais para exceções HTTP e Prisma
- Interceptor global de resposta
- Paginação padronizada com `page` e `limit`
- Migrations customizadas com `citext`, constraints e índices parciais do PostgreSQL
- Seeds realistas para admin, trainers, students, planos, sessões, avaliações, feed, notificações, mensagens e suporte
- Testes e2e para auth, assessments, workout plans, workout sessions, notificações, mensagens e suporte

## Railway

O passo a passo resumido está em [railway.md](./railway.md).
