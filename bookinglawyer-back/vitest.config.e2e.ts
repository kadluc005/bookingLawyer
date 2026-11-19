import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/bookinglawyer_test',
      JWT_SECRET: 'test-secret-key-at-least-thirty-two-bytes',
    },
  },
});
