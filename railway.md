# Railway

1. Crie um serviço PostgreSQL no Railway.
2. Configure as variáveis da API:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `PORT`
   - `APP_URL`
   - `CORS_ORIGIN`
3. Faça o deploy com `railway up`.
4. O container executa `prisma migrate deploy` automaticamente no startup.
5. Valide a saúde em `/api/v1/health`, a documentação em `/docs` e os endpoints versionados em `/api/v1/...`.
