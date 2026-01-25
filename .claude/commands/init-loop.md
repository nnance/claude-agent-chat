---
description: Create the task plan for Ralph Wiggum autonomous development loop based on the PRD
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Create Task Plan for Ralph Wiggum Autonomous Development

Your goal is to create the necessary supporting documents to enable autonomous development using the Ralph Wiggum loop. This includes generating a task list in `PLAN.md`.

## Phase 1: Read the PRD

Read the entire `PRD.md` file to understand the features that need to be implemented. Take notes on:

- Features and functionalities
- Frameworks or libraries to be used
- Any special instructions or considerations

## Phase 2: Generate Plan File

Based on the PRD, create a detailed task list in `PLAN.md`. If an existing `PLAN.md` file exists, overwrite it. Use the following template for the file. Each task should be atomic, verifiable, and ordered logically. Use the following structure for each task:

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

## Phase 4: Clear previous activity.md

If an `activity.md` file exists, delete it to prepare for new activity logging.

**Create activity.md** if it doesn't exist:

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

## Phase 5: Final Verification Prompt

After completing all phases, present the user with a verification checklist:

```
Your Plan is ready! Before running ralph.sh, please verify:

**PLAN.md**
- [ ] All features captured in task list
- [ ] Tasks are atomic and verifiable
- [ ] Tasks are in correct dependency order
- [ ] Success criteria is clear

Once verified, run: ./ralph.sh 20

Monitor progress in activity.md and screenshots/
```

Explicitly tell the user to verify these files before running the loop. This verification step is critical for a successful Ralph Wiggum run.
