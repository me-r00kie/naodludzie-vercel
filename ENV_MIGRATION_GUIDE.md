# Environment Variables Migration Guide

## Automatic Changes Made:
- All VITE_ prefixes changed to NEXT_PUBLIC_

## Manual Changes Required in Your Code:

### Replace Vite-specific environment variables:
- `import.meta.env.MODE` → `process.env.NODE_ENV`
- `import.meta.env.PROD` → `process.env.NODE_ENV === 'production'`
- `import.meta.env.DEV` → `process.env.NODE_ENV !== 'production'`
- `import.meta.env.SSR` → `typeof window !== 'undefined'`
- `import.meta.env.BASE_URL` → `process.env.NEXT_PUBLIC_BASE_PATH`

### For BASE_URL support, add to your .env file:
NEXT_PUBLIC_BASE_PATH="/your-base-path"

And update next.config.mjs:
```javascript
const nextConfig = {
  output: 'export',
  distDir: './dist',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
}
```
