# Railway

1. Crie um serviço PostgreSQL no Railway.
2. Configure as variáveis da API:
   - `NODE_ENV=production`
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `PORT`
   - `APP_URL`
   - `CORS_ORIGIN`
   - `RESEND_API_KEY`
   - `SUPPORT_TO_EMAIL`
   - `SUPPORT_FROM_EMAIL`
3. Faça o deploy com `railway up`.
4. O container executa `prisma migrate deploy` automaticamente no startup.
5. Se quiser dados iniciais, rode manualmente `railway run pnpm prisma:seed`.
6. Valide a saúde em `/api/v1/health`, a documentação em `/docs` e os endpoints versionados em `/api/v1/...`.
7. Para suporte por e-mail:
   - use um remetente válido em `SUPPORT_FROM_EMAIL`
   - se `RESEND_API_KEY` estiver ausente, os tickets continuam sendo criados no banco, mas sem envio de e-mail
