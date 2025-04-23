# ProfitFlip — One-Pane-of-Glass CI & Automation Strategy

ProfitFlip is a CI-first project built around three uncompromising principles:

1. **Progress is observable inside the repo — not in third-party tools.**
2. **Scripts are durable, auditable, and built for reuse.**
3. **The README you are reading is the single source of truth.**

---

## 📊 Live Project Status

All progress is tracked here, by design.  
✅ = complete 🔄 = in progress 🛑 = abandoned or deferred

### 🔧 Infrastructure Milestones

| Status | Task |
|--------|------|
| ✅ | Scaffolded Plan B checklist (`plan-b2.yaml → .checklist.md`) |
| ✅ | Built GitHub Action to auto-tick items in CI |
| ✅ | Enforced 2-hour CI buffer via stopwatch |
| ✅ | Hardened `run-green-flag.sh` with fail groups + logs |
| ✅ | Created Bash Vault for reusable ops scripts |
| ✅ | Patched broken demo.vercel.app smoke test |
| 🔄 | Finalize vault auto-index + script generator (`sync-index.js`, `new-script.sh`) |
| ✅ | Makefile with `checklist`, `smoke`, `new`, and `sync` |
| 🛑 | GitHub Kanban board approach (replaced by this file) |

---

## 🧠 Project Strategy

This README is the **execution dashboard**. We deliberately:
- Avoid GitHub Issues or Projects for tracking
- Use `README.md` for high-level progress
- Use `docs/plan-b2.checklist.md` for CI-executable tasks
- Use `bash-vault/` to persist and index reusable bash scripts

This keeps the project **self-evident, searchable, and forkable**.

---

## 🔍 Key Repos Files

| File | Purpose |
|------|---------|
| [`docs/plan-b2.checklist.md`](docs/plan-b2.checklist.md) | Task checklist auto-updated by CI |
| [`plan-b2.yaml`](plan-b2.yaml) | Authoritative backlog source |
| [`bash-vault/`](bash-vault/) | All reusable scripts with `.meta.json` context |
| [`Makefile`](Makefile) | CLI wrapper for local developer actions |

---

## 🛠 How to Use Locally

### Run smoke test + CI timer:

```bash
make smoke
