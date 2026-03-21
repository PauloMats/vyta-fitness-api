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
  media/
  notifications/
  prisma/
  students/
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
docker compose up --build
```

## Docker

- `docker-compose.yml` sobe `api` + `postgres`.
- O `entrypoint` executa `prisma migrate deploy` antes do boot da aplicação.
- A aplicação respeita `PORT` e faz bind em `0.0.0.0`.

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

## Qualidade

- ValidationPipe global com `whitelist`, `forbidNonWhitelisted` e `transform`
- Filtros globais para exceções HTTP e Prisma
- Interceptor global de resposta
- Paginação padronizada com `page` e `limit`
- Migrations customizadas com `citext`, constraints e índices parciais do PostgreSQL
- Seeds realistas para admin, trainers, students, planos, sessões, avaliações e feed
- Testes e2e para auth, assessments, workout plans e workout sessions

## Railway

O passo a passo resumido está em [railway.md](./railway.md).
