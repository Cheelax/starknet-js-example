## starknet-js-example

This project was scaffolded with `create-agent-kit` and ships with a ready-to-run agent app built on [`@lucid-agents/agent-kit`](https://www.npmjs.com/package/@lucid-agents/agent-kit).

### Quick start

```sh
bun install
bun run dev
```

The dev command runs `bun` in watch mode, starts the HTTP server, and reloads when you change files inside `src/`.

### Project structure

- `src/agent.ts` – defines your agent manifest and entrypoints.
- `src/index.ts` – boots a Bun HTTP server with the agent.

### Available scripts

- `bun run dev` – start the agent in watch mode.
- `bun run start` – start the agent once.
- `bun run agent` – run the agent module directly (helpful for quick experiments).
- `bunx tsc --noEmit` – type-check the project.

### Starknet balance entrypoint

The project now ships with a Starknet example entrypoint (`starknet-balance`) that uses `starknet.js` to read the ETH balance of an address on Starknet Sepolia.

1. Copy `.env.example` to `.env` and set:
   - `STARKNET_RPC_URL` – e.g. `https://starknet-sepolia.infura.io/v3/<key>` (required)
   - `STARKNET_ACCOUNT_ADDRESS` – optional default address used when the request omits one
   - `STARKNET_PRIVATE_KEY` – optional signer for the address above (only needed for account actions)
   - `STARKNET_ETH_CONTRACT` – optional override (defaults to the canonical Sepolia ETH contract)
2. Start the agent: `bun run dev`
3. Query the entrypoint:

```bash
curl -X POST http://localhost:8787/entrypoints/starknet-balance/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "address": "0x0123..." // optional, falls back to STARKNET_ACCOUNT_ADDRESS
    }
  }'
```

The response includes the resolved address, data source, raw wei balance, human-readable ETH balance, and a short summary string.

### Next steps

- Update `src/agent.ts` with additional entrypoints for your workflows.
- Wire up `@lucid-agents/agent-kit` configuration and secrets (see `AGENTS.md` in the repo for details).
- Deploy with your preferred Bun-compatible platform when you're ready.
