# FROK Project Overview

## Purpose
Full-stack AI-powered personal assistant with multimodal capabilities (chat, voice, file generation)

## Tech Stack
- **Frontend**: Next.js 15.5.5, React 19.2.0, TypeScript 5.9.3, Tailwind CSS 4.1.14
- **Backend**: Fastify 5.6.1, Supabase (Auth + Database), OpenAI GPT-5 (think/mini/nano)
- **State**: Zustand 5.0.8 + localStorage, TanStack Query 5.90.3
- **Testing**: Vitest (unit), Playwright (E2E), 44/48 tests passing, 60% coverage
- **Monorepo**: Turbo 2.5.8 + pnpm 10.18.2

## Key Features
- 100% authentication coverage
- Full type safety
- Rate limiting (AI: 5/min, standard: 60/min, read: 120/min)
- i18n support (EN/KO with 660+ keys)
- Production-ready deployment

## Structure
- `apps/web` - Next.js 15 main application
- `apps/api` - Fastify backend
- `packages/ui` - Shared component library
- `services/agents` - AI orchestration
- `packages/types` - Shared TypeScript types