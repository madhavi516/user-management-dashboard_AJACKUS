# User Management Dashboard

Simple React (Vite) web app using JSONPlaceholder for demo.

## Run locally (VS Code terminal)

# 1. install
npm install

# 2. run dev
npm run dev

# open the URL shown by Vite (usually http://localhost:5173)

## Build
npm run build
npm run preview

## Deploy
- Netlify: Connect repo, build = `npm run build`, publish = `dist`. Add `public/_redirects` for SPA.
- Vercel: Import repo, Vite auto-detected, build = `npm run build`, output = `dist`.

## Notes
- JSONPlaceholder simulates changes and will not persist them. The UI updates locally after simulated success.
- Department mapped from `company.name`.

## Deployed Link [ click here to view the live app ] (https://user-management-dashboard-ajackus-fam16wqie.vercel.app)
