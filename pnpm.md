pnpm install
pnpm start:dev
pnpm build
pnpm test:e2e
pnpm exec prisma generate
pnpm exec prisma migrate dev
pnpm exec prisma db seed