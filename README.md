# ProfitFlip — A prediction game.

ProfitFlip is a CI-first project built around three uncompromising principles:

1. **Progress is observable inside the repo — not in third-party tools.**
2. **Scripts are durable, auditable, and built for reuse.**
3. **The README you are reading is the single source of truth.**

---

+ ![deadline](https://img.shields.io/date/1745445829.svg?label=deadline&color=critical&cacheSeconds=300)

## 📊 Project Task Log

✅ = complete 🔄 = in progress 🛑 = skipped

| Status | Task |
|--------|------|
| ✅ | Scaffolded Plan B checklist system |
| ✅ | CI job ticks checklist items using `tick-checklist` |
| ✅ | `run-green-flag.sh` enforces buffer and logs failures |
| ✅ | `bash-vault/` created with script + metadata scaffold |
| 🔄 | Finish vault generator (`new-script.sh`) |
| 🔄 | Populate vault with first real script |
| 🔄 | Auto-generate `bash-vault/index.md` with sync-index.js |
| ✅ | Patched failing `demo.vercel.app` smoke test |
| 🛑 | Dropped GitHub Projects in favor of README tracking |

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

## 🚀 Quickstart

```bash
git clone https://github.com/metagrati/ProfitFlip.git
pnpm install
./bootstrap-plan-b2.sh
make checklist        # regenerate .checklist.md
make smoke            # run CI drills
make new NAME=fix-env.sh
make sync             # update vault index
