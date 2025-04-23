# Action Plan

## 1 Commit the Plan (`PLAN_HYBRID_PLUS_v1.2.md`)

| Step | Command / Action | Success Signal |
| --- | --- | --- |
| 1 | `git switch -c plan/v1.2` | new branch, clean tree |
| 2 | Add the plan text under `docs/PLAN_HYBRID_PLUS_v1.2.md` | file present |
| 3 | `git add docs/PLAN_HYBRID_PLUS_v1.2.md` | staged |
| 4 | `git commit -m "docs(plan): add HYBRID-PLUS v1.2"` | commit created |
| 5 | `git push -u origin plan/v1.2` | branch on GitHub |
| 6 | Open a **draft** PR “HYBRID-PLUS v1.2 – action plan” and assign reviewers | diff shows *only* the new MD |

---

## 2 Regenerate Issues & Project Board

| Step | Action | Success Signal |
| --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile` (or `npm ci`) | clean deps |
| 2 | `node scripts/gen-issues.js --update --plan docs/PLAN_HYBRID_PLUS_v1.2.md` | console: “Created/Updated N issues” |
| 3 | `git add .github && git commit -m "chore(issues): sync from v1.2"git push` | labels/milestones committed |
| 4 | Project board shows every card (**P2-T1**, **P2-T2**, …) with correct `depends:` links | visual check |

---

## 3 Inject the Sentry Secret Stub (CI6-0)

| Step | Action | Success Signal |
| --- | --- | --- |
| 1 | `git switch -c ci/secret-stub-sentry` |  |
| 2 | GitHub → Settings → Secrets → Actions → add `SENTRY_DSN` = `""` |  |
| 3 | Update workflow env: `env: { SENTRY_DSN: ${{ secrets.SENTRY_DSN }} }` | `act -j <job>` passes |
| 4 | Commit, push, PR | CI green < 1 min |

> Quick check: workflow log prints a blank line for echo $SENTRY_DSN.
> 

---

## 4 Implement **P0-T1** (compile-only gate)

| Micro-task | Command / Edit | Guardrail |
| --- | --- | --- |
| 0 | `git switch -c p0-t1/compile-gate` |  |
| 1 | `package.json` ➜ `"scripts": { "compile": "tsc --noEmit" }` |  |
| 2 | Root `tsconfig.json` with `"strict": true`, `"skipLibCheck": true` |  |
| 3 | `.github/workflows/compile.yml` → single step `pnpm run compile` |  |
| 4 | `pnpm run compile` locally → **0 errors** |  |
| 5 | Push + link PR to Issue **P0-T1** |  |
| 6 | CI ≤ 30 s on cache hit |  |
| 7 | Merge via squash after review |  |

> Failure test: create a deliberate type error on a temp branch → CI must fail.
> 

---

### FAQ (concise)

| Q | A |
| --- | --- |
| Merge plan straight to `main`? | No—keep draft PR until ≥ 1 review. |
| CI creeping past 12 min? | Batch lint + unit + axe + size-limit in one Node run; cache pnpm. |
| When to use real Sentry DSN? | Right before **Phase 5 (Release)**; stub suffices now. |

---

## Green-light

Once the boxes below are ticked, you’re unblocked for the rest of Phase 0:

- [ ]  Plan file merged
- [ ]  Issues / board regenerated
- [ ]  Sentry stub branch merged
- [ ]  **P0-T1** compile gate on `main` and green
