# Worktree Registry — nesh

This repository uses [git worktrees](https://git-scm.com/docs/git-worktree) for parallel development.

## Directory Layout

```
~/Projects/nesh/
├── .git              # gitdir pointer → main/.git
├── .omc/             # OMC orchestration state (local)
├── main/             # Primary working tree (branch: main)
│   ├── .git/         # Actual git repository
│   └── ...           # All source files
├── feature-foo/      # Example worktree (branch: feature/foo)
└── bugfix-bar/       # Example worktree (branch: bugfix/bar)
```

## Active Worktrees

| Directory | Branch | Purpose | Created |
|-----------|--------|---------|---------|
| `main/` | `main` | Primary development | 2026-04-05 |

## Quick Reference

### Create a worktree

```bash
# From anywhere in the repo
git worktree add ../feature-name -b feature/name
```

### List worktrees

```bash
git worktree list
```

### Remove a worktree

```bash
git worktree remove ../feature-name
# or: rm -rf ../feature-name && git worktree prune
```

### Switch to a worktree

```bash
cd ../feature-name
```

## Workflow

1. Create a worktree for each feature/bugfix branch
2. Work in the worktree directory independently
3. Each worktree has its own `node_modules` — run `npm install` after creating
4. Commit and push from within the worktree
5. After merging, remove the worktree and prune

## Notes

- Worktrees are **local only** — they are not pushed to remote
- Each worktree gets its own working directory but shares the git object store
- Update this table when creating or removing worktrees
- Never delete `main/` — it contains the actual `.git/` directory
