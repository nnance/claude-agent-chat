---
description: Create the MVP phase supporting documents for Ralph Wiggum autonomous development loop based on the PRD
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Create Supporting Documents for Ralph Wiggum Autonomous Development

Your goal is to create the necessary supporting documents to enable autonomous development using the Ralph Wiggum loop. This includes generating a task list in `PLAN.md`, updating `PROMPT.md` with project-specific instructions, and modifying `.claude/settings.json` to ensure the agent has the required permissions.

## Phase 1: Read the PRD

Read the entire `PRD.md` file to understand the project requirements, features, and technical specifications. Take notes on:

- Core features and functionalities
- Tech stack and frameworks
- Any special instructions or considerations

## Phase 2: Generate Plan File

Based on the PRD, create a detailed task list in `PLAN.md`. Use the following template for the file. Each task should be atomic, verifiable, and ordered logically. Use the following structure for each task:

````markdown
# Project Plan

## Overview

Brief description of what you're building.

**Reference:** `PRD.md`

---

## Task List

```json
[
  {
    "category": "setup",
    "description": "[First setup task]",
    "steps": ["[Step 1]", "[Step 2]", "[Step 3]"],
    "passes": false
  },
  {
    "category": "feature",
    "description": "[Feature task]",
    "steps": ["[Step 1]", "[Step 2]"],
    "passes": false
  }
]
```

---

## Agent Instructions

1. Read `activity.md` first to understand current state
2. Find next task with `"passes": false`
3. Complete all steps for that task
4. Verify in browser using agent-browser
5. Update task to `"passes": true`
6. Log completion in `activity.md`
7. Repeat until all tasks pass

**Important:** Only modify the `passes` field. Do not remove or rewrite tasks.

---

## Completion Criteria

All tasks marked with `"passes": true`
````

### Task Generation Guidelines

Generate tasks based on the features and requirements gathered. Tasks should be:

- **Atomic**: Each task should be completable in one iteration
- **Verifiable**: Each task should have clear success criteria
- **Ordered**: Tasks should be in logical dependency order
- **Categorized**: Use categories like `setup`, `feature`, `integration`, `styling`, `testing`

**Typical task categories:**

1. **setup**: Project initialization, dependencies, configuration
2. **feature**: Core feature implementations
3. **integration**: Third-party service integrations
4. **styling**: UI/UX implementation
5. **testing**: Test coverage and verification

## Phase 3: Update PROMPT.md

After creating the PRD, update the `PROMPT.md` file to reflect the project specifics.

Read the current `PROMPT.md` file and update the following sections:

1. **Start command**: Replace the placeholder with the actual command to start the dev server (based on tech stack chosen)
2. **Build/lint commands**: Add any relevant build or lint commands
3. **Project-specific instructions**: Add any special considerations from the PRD

Use the Edit tool to update these sections while preserving the rest of the template.

## Phase 4: Update .claude/settings.json

**This step is critical for autonomous operation.** The agent must have permissions to run all CLI commands required by the project.

Read the current `.claude/settings.json` file and update the `permissions.allow` array based on the PRD's tech stack and requirements.

### Permission Mapping by Technology

Add permissions based on what was chosen in the PRD:

**Package Managers:**

- npm: Already included (`Bash(npm run:*)`, `Bash(npm install:*)`, etc.)
- pnpm: Already included (`Bash(pnpm:*)`)
- yarn: Already included (`Bash(yarn:*)`)
- bun: Already included (`Bash(bun:*)`)

**Frameworks (add if using):**

- Next.js: `Bash(next:*)`
- Vite: `Bash(vite:*)`
- Nuxt: `Bash(nuxt:*)`
- SvelteKit: `Bash(svelte-kit:*)`
- Astro: `Bash(astro:*)`
- Remix: `Bash(remix:*)`

**Databases & ORMs (add if using):**

- Prisma: `Bash(prisma:*)`, `Bash(npx prisma:*)`
- Drizzle: `Bash(drizzle-kit:*)`
- TypeORM: `Bash(typeorm:*)`
- Supabase: `Bash(supabase:*)`
- PlanetScale: `Bash(pscale:*)`
- MongoDB: `Bash(mongosh:*)`

**Authentication (add if using):**

- Auth.js/NextAuth: No additional CLI
- Clerk: `Bash(clerk:*)`
- Supabase Auth: Covered by `Bash(supabase:*)`
- Firebase Auth: `Bash(firebase:*)`

**Cloud/Hosting (add if using):**

- Vercel: `Bash(vercel:*)`
- Netlify: `Bash(netlify:*)`
- Railway: `Bash(railway:*)`
- Fly.io: `Bash(fly:*)`, `Bash(flyctl:*)`
- AWS: `Bash(aws:*)` (be careful with this one)
- Firebase: `Bash(firebase:*)`
- Cloudflare: `Bash(wrangler:*)`

**Testing (add if using):**

- Vitest: `Bash(vitest:*)`
- Jest: `Bash(jest:*)`
- Playwright: `Bash(playwright:*)`
- Cypress: `Bash(cypress:*)`

**Other Common Tools:**

- TypeScript: `Bash(tsc:*)`, `Bash(tsx:*)`
- ESLint: `Bash(eslint:*)`
- Prettier: `Bash(prettier:*)`
- Tailwind: `Bash(tailwindcss:*)`
- Biome: `Bash(biome:*)`
- Turbo: `Bash(turbo:*)`
- Docker Compose: `Bash(docker compose:*)`
- Make: `Bash(make:*)`

### How to Update settings.json

1. Read the current `.claude/settings.json`
2. Parse the existing `permissions.allow` array
3. Add new permissions based on the tech stack chosen in the PRD
4. Do NOT remove existing permissions (they are safe defaults)
5. Do NOT add overly broad permissions like `Bash` without specifiers
6. Write the updated settings.json

**Example:** If the PRD specifies Next.js + Prisma + Vercel, add:

```json
"Bash(next:*)",
"Bash(prisma:*)",
"Bash(npx prisma:*)",
"Bash(vercel:*)"
```

## Phase 5: Create Supporting Files

After creating the PRD and updating PROMPT.md and settings.json:

1. **Create activity.md** if it doesn't exist:

```markdown
# [Project Name] - Activity Log

## Current Status

**Last Updated:** [Current Date]
**Tasks Completed:** 0
**Current Task:** None started

---

## Session Log

<!-- Agent will append dated entries here -->
```

2. Confirm to the user that all files are ready for Ralph Wiggum autonomous development.

## Phase 6: Final Verification Prompt

After completing all phases, present the user with a verification checklist:

```
Your Plan is ready! Before running ralph.sh, please verify:

**PLAN.md**
- [ ] All features captured in task list
- [ ] Tasks are atomic and verifiable
- [ ] Tasks are in correct dependency order
- [ ] Success criteria is clear

**PROMPT.md:**
- [ ] Start command is correct for your tech stack
- [ ] Build/lint commands are accurate
- [ ] Veification steps are clear
- [ ] Project-specific instructions are included

**.claude/settings.json:**
- [ ] All necessary CLI tools are permitted
- [ ] No overly broad permissions added

Once verified, run: ./ralph.sh 20

Monitor progress in activity.md and screenshots/
```

Explicitly tell the user to verify these files before running the loop. This verification step is critical for a successful Ralph Wiggum run.
