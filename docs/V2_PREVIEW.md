# Preview Rat Game V2 without replacing the live game

This is a beta. The production Worker remains rat-game.

## Test locally on your Mac

In a VS Code terminal:

    cd ~/Desktop
    git clone --branch v2-development --single-branch https://github.com/dtoska1/rat-game.git rat-game-v2
    cd rat-game-v2
    npm install
    npm run dev

Open the local address printed by Vite. To test on a phone, use the Network URL while the phone and Mac are on the same Wi-Fi. Test both portrait and landscape.

## Deploy a separate Cloudflare preview Worker

    npm run build
    npx wrangler login
    npx wrangler deploy --config wrangler.v2.jsonc

The preview config names the Worker rat-game-v2, not rat-game. The deploy command prints the actual preview URL after success. Do not run bare npx wrangler deploy while testing this beta: that uses the production configuration.

## Testing gate

- Build check: .github/workflows/verify.yml
- Mobile browser tests: .github/workflows/v2-playtest.yml
- V2 feature plan: docs/V2_ROADMAP.md
- Inspect on a physical phone, especially movement, climbing, hiding and food delivery.
- Keep the pull request as a draft until art and gameplay meet the standard.

When V2 is ready, review the PR, merge approved changes into main and use the production Wrangler configuration for the existing website.
