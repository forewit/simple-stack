```json
# New file: /package.json
{
  "name": "my-saas-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter \"./**\" dev",
    "build:frontend": "pnpm --filter frontend build",
    "start:backend": "pnpm --filter backend start",
    "dev:frontend": "pnpm --filter frontend dev",
    "dev:backend": "pnpm --filter backend dev",
    "lint": "pnpm --parallel --filter \"./**\" lint"
  }
}
```

```bash
npm i typescript@latest -D
```