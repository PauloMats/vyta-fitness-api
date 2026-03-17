# VYTA API Backend

Backend REST production-ready para o produto fitness VYTA, construído com NestJS + Fastify + Prisma + PostgreSQL + Docker e pronto para deploy no Railway.

## Stack

- NestJS 11 com Fastify
- Node 22
- pnpm
- Prisma ORM + PostgreSQL
- JWT access + refresh tokens
- Argon2 para hashing
- Swagger em `/docs`
- Healthcheck em `/api/health`
- Docker multi-stage + docker-compose

## Estrutura

```text
src/
  auth/
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
4. Rode a migration inicial:
   ```bash
   pnpm prisma:migrate:dev --name init
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

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Todos os demais endpoints usam JWT Bearer por padrão.

## Qualidade

- ValidationPipe global com `whitelist`, `forbidNonWhitelisted` e `transform`
- Filtro global de exceções
- Interceptor global de resposta
- Paginação padronizada com `page` e `limit`
- Seeds realistas para admin, trainers, students, planos, sessões e feed
- Testes e2e mínimos para auth, workout plans e workout sessions

## Railway

O passo a passo resumido está em [railway.md](./railway.md).
