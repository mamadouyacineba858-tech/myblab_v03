# MyBlab v0.3

Dépôt de développement du projet MyBlab.

## Structure

- `frontend/` : application React (Vite)
- `backend/` : serveur Node.js / Express
- `docs/` : documentation (API, architecture, changelog)
- `bundles/` : bundles Git de livraison
- `audit/` : rapports d’audit
- `.github/workflows/` : CI (ci.yml)

## Démarrage rapide (frontend)

```bash
cd frontend
npm ci
npm run dev
```

## CI

Workflow : `.github/workflows/ci.yml`

Étapes :
1. `npm ci`
2. `npm run lint`
3. `npm test -- --run`
4. `npm run build`

## Remarque

Le backend contient actuellement un `package.json` minimal (placeholder).