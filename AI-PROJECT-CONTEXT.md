# AI Project Context — SMC-OS software portfolio

This file holds rules and context that apply to every software project owned by
the SMC-OS GitHub organisation. It is deliberately short and contains **no
project-specific architecture**. Each repository's own `CLAUDE.md` is the
authority for that project.

An identical copy of this file lives at the root of each project repository so
that it is available to an agent that has cloned only one repository. If you
change it, make the same change in every copy (see "Where the copies live").

Last reviewed: 2026-09-26

---

## 1. Ownership and the products

All products are owned by the same owner (GitHub organisation `SMC-OS`), who is
also the owner of Simo Marble & Construction Ltd, a UK stone and construction
company. The products are separate codebases with separate data, deployments and
release processes. **Never mix one product's architecture, data or credentials
into another.**

| Product | What it is | Repository | Relationship |
|---|---|---|---|
| **GeoCore** | Multi-tenant SaaS operating system for construction and renovation businesses (quotes, CRM, projects, financials, procurement, client portal, billing). Formerly "SIMO OS". | `SMC-OS/SMC-OS` | Simo Marble & Construction Ltd is one **tenant** of GeoCore, not the platform itself (GeoCore ADR-036). |
| **SMC Pro Studio** | Professional network and project-collaboration platform for the built environment, branded for Simo Marble & Construction (web + planned Capacitor mobile). | `SMC-OS/smc-pro-studio` | Independent product. Shares no code, database or deployment with GeoCore. |
| **MeOra** | Owner-reported: Flutter mobile application (Supabase, RevenueCat). **MeOra architecture/state is OWNER-REPORTED BUT NOT YET REPOSITORY-VERIFIED IN THIS MEMORY SYSTEM.** | **Not located.** No MeOra repository was visible to the 2026-09-26 audit session. | Independent product. |

Similar-sounding features (quotes, materials catalogue, projects, messaging)
exist in both GeoCore and SMC Pro Studio. They are **different implementations
on different stacks**. Always confirm which repository you are in before
reasoning about a feature.

## 2. Order of evidence

When sources disagree, trust them in this order:

1. The live system, observed directly (hosting-platform deployment records,
   `/health` and `/ready` responses, database queries run read-only).
2. Git: the actual commits on the actual remote branches.
3. The repository's source code and migrations.
4. The repository's own documentation (`CLAUDE.md`, runbooks, ADRs, sprint
   records). Docs can be stale; sprint "Status:" lines are written when a
   sprint closes and are often not updated when it is later merged or
   deployed.
5. Chat history, memory tools and summaries from earlier sessions.

**Chat history is never stronger evidence than the repository, Git, the
database or the deployment platform.**

**Repository evidence takes precedence over memory and chat summaries for
code state. But absence from the currently accessible repository does not
prove that historical work never existed.** It may live in another
repository, an inaccessible account, a local folder or an unpushed branch.

- Report it as "not found in accessible sources", never as "never existed".
- Attempt recovery (§8) before re-implementing anything.

**Deployment state must be verified from the hosting/deployment system. It
must never be inferred merely from a Git commit or push.**

## 3. The five states are different

For any change, these are separate facts and each needs its own evidence:

| State | Evidence required |
|---|---|
| **Source code state** | The file exists with that content on some branch. |
| **Git state** | Which remote branch contains the commit (`git branch -r --contains`, `git merge-base --is-ancestor`). |
| **Database state** | Migration head actually applied in that environment (`alembic current`, `supabase migration list`, etc.). |
| **Deployment state** | The hosting platform shows a successful deployment of that exact commit to that exact service and environment. |
| **Live production state** | Post-deployment verification against the real production URLs succeeded. |

Never infer a later state from an earlier one. **A `git push` is not a
deployment. A successful deployment is not a verified release.**

## 4. Git safety rules

- Never force-push `main`, `production-release` or any branch someone else is
  working on. Never rewrite published history.
- Never delete remote branches unless the owner explicitly asks for that
  specific branch. Unmerged branches may contain work that exists nowhere else.
- Never merge to `main` or a release branch without the owner's approval for
  that merge.
- Work on a named feature or docs branch. Commit small, descriptive commits.
- Before committing, run `git diff --check` and the project's fast checks.
- Before starting, run `git status`, `git log -5`, and `git branch -r` to see
  whether another agent left unfinished work. **Do not overwrite, reset or
  "clean up" another agent's uncommitted or unmerged work.**
- One repository per commit. Never make a single ambiguous cross-project
  commit.

## 5. Deployment, database and environment rules

- **Staging and production are not interchangeable.** Confirm the environment
  by name and ID before any command that touches a hosted service or database.
- Never run a production migration, a destructive SQL statement, a database
  reset or a data backfill without the owner's explicit approval for that
  specific operation, a recorded backup, and a written rollback path.
- Never run `supabase db reset`, `alembic downgrade`, `DROP`, `TRUNCATE` or
  equivalents against any hosted database.
- **An audit is read-only.** If the task is to inspect, report or document,
  change nothing in production, staging, DNS, billing or app-store consoles.
- After a deployment, verify with direct evidence (platform deployment record
  for the exact commit, health/readiness checks, a real authenticated request)
  before reporting success. Record what was verified and what was not.
- If you cannot access the hosting platform, say so. Write "not verified",
  never "deployed".
- Before pushing to any branch, check whether a hosting service
  auto-deploys from it. On some platforms a push **is** a deployment. Each
  project's `CLAUDE.md` records which branches are connected.

## 6. Secrets

- Never write secret values anywhere in a repository, commit message, PR,
  issue, log excerpt or chat transcript. This includes API keys, passwords,
  access/refresh tokens, private keys, signing keystores, webhook signing
  secrets, Supabase service-role/secret keys, Stripe and RevenueCat secrets,
  database URLs containing passwords, and Apple/Google credentials.
- Refer to secrets by **environment-variable name only**.
- `.env*` files stay git-ignored; only `.env.example` with placeholder values
  is committed.
- Server-only secrets must never be exposed to a client bundle (no
  `VITE_`/`NEXT_PUBLIC_` prefix on a secret).
- If you find a committed secret, stop, tell the owner, and recommend
  rotation. Do not try to "fix" it by rewriting history on your own.

## 7. Verification expectations

- Run the project's own gates (listed in its `CLAUDE.md`) and report exact
  commands and results. A failing or skipped check is reported as such.
- Never mark something complete because it "should" work. Never simulate
  success, fabricate data, or leave UI that claims a capability the backend
  does not have.
- Prices, stock, certifications, reviews, user counts and similar business
  facts must come from an authoritative source. Never invent them.

## 8. How to resume existing work

1. Read the project's `CLAUDE.md`, especially `## CURRENT CHECKPOINT` and
   `## WHERE TO RESUME`, and note its "Last verified" date.
2. Re-verify the checkpoint against reality: `git fetch`, compare branch
   heads, check the hosting platform's latest deployment, check migration
   heads. If reality differs, reality wins; update the checkpoint.
3. Check for unmerged branches and open PRs that may hold unfinished work.
4. If expected work is missing, **attempt recovery first** (other branches,
   reflog, open PRs, worktrees, stashes, the deployment platform's recorded
   commit) before re-implementing anything.
5. Only then continue with the safest next action named in `WHERE TO RESUME`.
6. After a significant verified milestone, update that project's
   `## CURRENT CHECKPOINT` and `## WHERE TO RESUME` with the new
   "Last verified" date. Do not silently rewrite architecture sections or
   historical decisions; record changes as new decisions.

## 9. Where the copies live

- `SMC-OS/SMC-OS` → `AI-PROJECT-CONTEXT.md` (GeoCore)
- `SMC-OS/smc-pro-studio` → `AI-PROJECT-CONTEXT.md`
- MeOra → add a copy when its repository is located.
