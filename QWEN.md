# Eyan AI Platform Development Rules

## Never

- Never change unrelated files.
- Never modify package versions unless asked.
- Never create duplicate utilities.
- Never introduce breaking changes.

## Always

- Follow existing folder structure.
- Use TypeScript strict mode.
- Use async/await.
- Validate inputs with Zod.
- Return consistent API responses.
- Add comments only when necessary.

## Architecture

- Controllers are thin.
- Services contain business logic.
- Middleware contains authentication/authorization.
- Prisma handles database access.