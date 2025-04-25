# ProfitFlip — A prediction game.

ProfitFlip is a CI-first project built around three uncompromising principles:

1. **Progress is observable inside the repo — not in third-party tools.**
2. **Scripts are durable, auditable, and built for reuse.**
3. **The README you are reading is the single source of truth.**

---

+ ![deadline](https://img.shields.io/date/1745697600.svg?label=deadline&color=critical&cacheSeconds=300)

##  Project Task Log

Tracking progress against `plan-b2.yaml`.

✅ = complete 🔄 = in progress 🚧 = planned 🛑 = skipped

### Bootstrap & CI Setup

| Status | Task                                                  | Notes / Related Patch |
|--------|-------------------------------------------------------|-----------------------|
| ✅     | Scaffolded Plan B checklist system                    |                       |
| ✅     | CI job ticks checklist items using `tick-checklist`   |                       |
| ✅     | `run-green-flag.sh` enforces buffer and logs failures |                       |
| ✅     | Patched failing `demo.vercel.app` smoke test          |                       |

### Patch Implementation (`plan-b2.yaml`)

| Patch | Status | Task                                           | Notes                           |
|-------|--------|------------------------------------------------|---------------------------------|
| **P1**| 🔄     | `secrets-verify.ts` script structure created   | Checks required env vars        |
|       | 🚧     | Populate `REQUIRED_ENV` in `secrets-verify.ts` | Needs actual variable list      |
|       | 🚧     | Ensure `secrets-verify` green in CI          | Requires variables to be set    |
| **P2**| 🚧     | Implement Fly cold-start guard                 | Ref: Review Doc P2              |
| **P3**| 🚧     | Make `entrypoint.sh` migrations idempotent     | Ref: Review Doc P3              |
| **P4**| 🚧     | Implement demo wallet pre-funding              | Ref: Review Doc P4              |
| **P5**| 🚧     | Implement rollback observability enhancements  | Ref: Review Doc P5              |
| **P6**| 🚧     | Implement pm2 log rotation + tmux tweaks       | Ref: Review Doc P6              |
| **P7**| 🚧     | Pin `pnpm-store` path                          | Ref: Review Doc P7              |
| **P8**| 🚧     | Implement CI gate hard-fail / timeout        | Ref: Review Doc P4/P8 (`timeout`)| 

### Feature: Bash Vault

| Status | Task                                                  | Notes                 |
|--------|-------------------------------------------------------|-----------------------|
| ✅     | `bash-vault/` created with script + metadata scaffold |                       |
| 🔄     | Finish vault generator (`new-script.sh`)              |                       |
| 🔄     | Populate vault with first real script                 |                       |
| 🔄     | Auto-generate `bash-vault/index.md`                 | Via `make sync`       |

### Process Changes

| Status | Task                                                 | Notes                 |
|--------|------------------------------------------------------|-----------------------|
| 🛑     | Dropped GitHub Projects in favor of README tracking  |                       |

---

## 🧠 Strategy

We do not use GitHub Issues, Projects, or external tools to track tasks.  
This `README.md` and the CI-verified checklist are the **only sources of truth**.

---

## 🧩 Key Files

| File | Description |
|------|-------------|
| `plan-b2.yaml` | Backlog source of truth |
| `docs/plan-b2.checklist.md` | CI-driven task checklist |
| `scripts/run-green-flag.sh` | Smoke test + buffer fail logic |
| `bash-vault/` | Reusable script storage with metadata |
| `Makefile` | Task runner: `make new`, `make sync`, `make checklist` |

---

## 🏛️ Project Artifacts Inventory

Visual tracker for the state of key codebase components and documents.

| Artifact Type       | Path/Identifier                       | Status           | Notes                                         |
|---------------------|---------------------------------------|------------------|-----------------------------------------------|
| Planning            | `plan-b2.yaml`                        | Active           | Defines patches and drills.                   |
| Tracking            | `docs/plan-b2.checklist.md`           | Active           | CI-updated task status.                       |
| Documentation       | `README.md`                           | Active           | Single source of truth, includes this table.  |
| CI/CD Workflow      | `.github/workflows/ci-status.yml`     | Active           | Main workflow for checks & checklist update.  |
| Build/Task Runner   | `Makefile`                            | Active           | Runner for common dev tasks (`make ...`).     |
| Dependencies        | `package.json` / `pnpm-lock.yaml`     | Active           | Defines Node.js dependencies and scripts.     |
| Core Test Runner    | `scripts/run-green-flag.sh`           | Active           | Executes smoke tests listed in the workflow.  |
| Secret Verification | `scripts/secrets-verify.ts`           | Active (Stub)    | Checks required env vars (logic TBD).         |
| Reusable Scripts    | `bash-vault/`                         | In Progress      | Vault for reusable bash scripts & metadata.   |
| Smart Contracts     | `contracts/`                          | _Unknown_        | Contains core smart contract logic?           |
| Deployment Config   | Fly.io / Vercel Settings              | _Unknown_        | Platform-specific deployment configurations.  |

---

## ⚙️ Configuration

This project relies on environment variables for configuration, especially for deployment targets and external services.

*   **Secrets:** Sensitive information (API keys, tokens) must be configured as environment variables in your deployment environments (e.g., Fly.io secrets, Vercel environment variables).
*   **Verification:** The `scripts/secrets-verify.ts` script (run via `pnpm run secrets:verify`) checks for the presence of required environment variables defined in its `REQUIRED_ENV` array during the CI process *before* deployment. Ensure all necessary variables are set in both Fly and Vercel environments to pass this check.

---

## 🤖 Automation

This repository utilizes GitHub Actions for CI/CD and automation tasks.

*   **Checklist Action (`.github/actions/tick-checklist`):** A custom JavaScript action that automatically marks items in the `docs/plan-b2.checklist.md` file as complete. 
    *   It is triggered by the `ci-status.yml` workflow.
    *   The workflow passes the specific checklist item text to the action upon successful completion of related steps (e.g., after `scripts/run-green-flag.sh` runs).

---

## 📜 Key Scripts

Beyond the `Makefile` tasks, these scripts are central to testing and verification:

*   `scripts/run-green-flag.sh`: Executes essential smoke tests (like Fly health check) and checks defined in `package.json` under `scripts` (e.g., `smoke:fork`, `smoke:amoy`). It also enforces the time buffer rule mentioned in the strategy. This is run by the CI workflow.
*   `scripts/secrets-verify.ts`: Checks if all environment variables listed in its internal `REQUIRED_ENV` array are set. This acts as a guard during CI to prevent deployments with missing secrets.

---

## 🚀 Deployment

Deployment is handled automatically via the GitHub Actions CI/CD pipeline defined in `.github/workflows/ci-status.yml`.

*   **Process:** On pushes/PRs to main branches, the workflow runs checks (including `run-green-flag.sh` and `secrets:verify`), updates the checklist (`docs/plan-b2.checklist.md`), and potentially triggers deployments to Fly.io and Vercel (details likely depend on specific workflow steps not fully shown).
*   **Patches & Drills:** The `plan-b2.yaml` file outlines specific patches (like P1-P8) and drills required for a stable deployment. The CI process aims to verify these items.

---

## 🚀 Quickstart

```bash
git clone https://github.com/metagrati/ProfitFlip.git
pnpm install
./bootstrap-plan-b2.sh
make checklist        # regenerate .checklist.md
make smoke            # run CI drills
make new NAME=fix-env.sh
make sync             # update vault index

```

### 1  Project goal & purpose  `<!-- ./docs/goal-purpose -->`

> **ProfitFlip** is a provably-fair, on-chain **BTC/USD direction-prediction game**.  
> Every 3-5 minutes a new round starts: players stake **POL (MATIC)** and pick **Bull** or **Bear**; at round close the Chainlink BTC/USD oracle decides the outcome and winners share the pool **minus 2 % platform fee**. The smart-contract is non-upgradeable by design; the front-end focuses on a mobile-first, sub-3 s LCP experience.  

(Keep it brief—details of rules, fees & constraints live in `/docs/…`.)

---

### 2  Technology stack  `<!-- ./docs/tech-stack -->`

| Layer | Key tech | Notes |
|-------|----------|-------|
| **Smart contracts** | Solidity ^0.8.28, Hardhat (+ ethers v6) | `Prediction` contract, ABI kept in `src/abi/prediction.json`, deployed at `0xfc5033…C80A0`  |
| **Frontend** | React 18, TypeScript strict, Vite, Tailwind CSS, Wagmi v2, Reown AppKit, ethers v6, viem | See `package.json` deps list  |
| **Tooling** | pnpm, ESLint (+ typescript-eslint), Prettier, react-hot-toast, lucide-react | Performance budget ≤ 200 kB initial JS |
| **CI / Deploy** | Fly.io (edge workers), Vercel preview URLs, Lighthouse-CI, Playwright | Aligns with *Hybrid-Plus* governance |
| **Runtime infra** | Contabo VPS (Docker-in-Docker), PostgreSQL, NGINX reverse proxy, Papertrail logging | Matches `docker-compose.*` in infra repo |

---

### 3  Environment variables  `<!-- ./docs/env -->`

Variable | Required | Purpose / where used
---------|----------|----------------------
`FLY_API_TOKEN` | ✅ | Deploying preview builds to Fly.io
`VERCEL_TOKEN` | ✅ | Creating Vercel preview URLs from CI
`PAPERTRAIL_URL` | ✅ | Shipping app + operator logs
`DATABASE_URL` | ✅ | Postgres connection string for operator & analytics
`RPC_URL_POLYGON` | ✅ | JSON-RPC endpoint used by operator & Hardhat
`PRIVATE_KEY` | ✅ | Deployer key for Hardhat scripts
`CHAINLINK_ORACLE` | optional | Override oracle address in dev nets
`NEXT_PUBLIC_APP_ID` | optional | Reown projectId if you fork the repo

All vars are validated by `scripts/secrets-verify.ts` during `make checklist`. Provide them in `.env` (local), fly.io secrets, or Vercel project vars as appropriate.

---

### 4  `contracts/` directory  `<!-- ./docs/contracts -->`

```
contracts/
 ├─ ProfitFlip.sol        # main game logic (non-upgradeable)
 ├─ mocks/                # oracle & token mocks for unit tests
 ├─ deploy/               # Hardhat deploy scripts
 └─ test/                 # Foundry/Hardhat tests
```

* **Compile**  `pnpm hardhat compile`  
* **Unit tests**  `pnpm hardhat test`  
* **Local node + UI**  `pnpm hardhat node` → update `RPC_URL_POLYGON=127.0.0.1:8545` → `pnpm dev`  
* **Deploy (Amoy)**  `pnpm hardhat run deploy/001_deploy.ts --network amoy`

After a successful deploy the ABI is copied automatically into `src/abi/` and `src/constants/contracts.ts` is patched with the new address. 

---

### 5  `bash-vault/` usage  `<!-- ./docs/bash-vault -->`

The vault is a curated library of tiny, metadata-tagged bash scripts that can be run on any dev or CI box.

```bash
# create a new script interactively
make new NAME=restart-db

# typical vault script header
#!/usr/bin/env bash
# vault:description=Restart Postgres in dev
# vault:tags=local,db
docker compose restart db
```

* **Discover** `make checklist` prints the indexed vault table.  
* **Run**      `bash-vault/restart-db.sh` (they are plain executables).  
* **Sync**     `make sync` pushes the vault to the remote `scripts/` bucket so CI boxes stay in-sync.

---

### 6  Makefile task cheatsheet  `<!-- ./docs/make-tasks -->`

| Task | What it does | When to run |
|------|--------------|-------------|
| `make checklist` | Lint, type-check, secrets-verify, Lighthouse budget check (≈ 30 s) | Every commit |
| `make smoke` | Spins up a local Hardhat node + front-end and runs Playwright smoke tests | Before PR |
| `make new NAME=…` | Scaffolds a new bash-vault script with metadata header | When adding utilities |
| `make sync` | Uploads bash-vault + generated docs to the remote scripts bucket | After editing scripts |

(*If your local `make` output differs, sync this table with the recipes in `Makefile`.*)
