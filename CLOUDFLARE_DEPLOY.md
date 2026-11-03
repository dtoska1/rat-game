# Rat Game — GitHub + Cloudflare Pages

This repository contains the playable Rat Game v0.2.1 source. It uses Phaser, TypeScript and Vite. It is **not** necessary to upload `node_modules` to GitHub or Cloudflare.

## Create the GitHub repository

1. Sign in as `dtoska1` and create a **public**, empty GitHub repository named `rat-game` at https://github.com/new?name=rat-game. Don't generate a README, license, or .gitignore.
2. In a terminal, navigate to this project folder. Run:

```sh
git init -b main
git add .
git commit -m "Initial Rat Game playable prototype"
git remote add origin https://github.com/dtoska1/rat-game.git
git push -u origin main
```

If this folder is already under Git control, skip `git init`, and inspect your existing remotes before adding a new one.

## Configure Cloudflare Pages

1. Cloudflare dashboard > Workers & Pages > Create application > Pages > Connect to Git. If shown the Workers creation screen, choose **Continue to Pages**.
2. Authorize GitHub if prompted, select `dtoska1/rat-game` and branch `main`.
3. Use:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Framework | Vite, if offered; otherwise None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` (repo root) |
| Node.js | 22 |

4. Deploy. Cloudflare will install dependencies, build the game, and serve files from `dist`.
5. Each new push to main triggers a new build/deployment.

For a direct upload instead, run `npm install && npm run build` locally and upload **only the `dist` directory**; don't upload the entire project.

## Local development

```sh
npm install
npm run dev
```

Production build test:

```sh
npm run build
npm run preview
```

## Notes

- The Vite base is set to `./`, so both Pages custom domains and project URLs can resolve the assets.
- `.gitignore` excludes dependencies, build output, secrets, and macOS metadata.
- This package intentionally removes the older GitHub Pages action; Cloudflare Pages handles deployments directly.
- Mobile browser support is preliminary and still requires device testing.
