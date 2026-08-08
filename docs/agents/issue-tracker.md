# Issue tracker: GitHub

Issues and specifications for this repository live as GitHub issues. Use the `gh` CLI for operations once the private remote exists.

## Conventions

- Create: `gh issue create --title "..." --body-file <path>`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- Comment: `gh issue comment <number> --body-file <path>`
- Label: `gh issue edit <number> --add-label "..."`
- Close: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill meanings

- When a skill says "publish to the issue tracker", create a GitHub issue.
- When a skill says "fetch the relevant ticket", run `gh issue view <number> --comments`.

## Wayfinding operations

The map is one issue labelled `wayfinder:map`; tickets are child issues labelled `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`. Use GitHub sub-issues and native dependencies when available, falling back to task lists and `Blocked by:` links when unavailable. Claim the next unblocked, unassigned child in map order and resolve it with an answer plus a durable context pointer.
