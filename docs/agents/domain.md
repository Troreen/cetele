# Domain Docs

How the engineering skills consume this repository's domain documentation.

## Before exploring, read these

- `CONTEXT.md` at the repository root, or `CONTEXT-MAP.md` if it exists.
- ADRs under `docs/adr/` that touch the area being changed.

If these files do not exist, proceed silently. The domain-modeling workflow creates them lazily when terms or durable decisions are resolved.

## File structure

Çetele is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

Use terms as defined in `CONTEXT.md` in issues, specifications, tests, and code. Do not drift to synonyms that the glossary explicitly avoids. A missing domain term is either unnecessary new language or a gap to resolve through domain modeling.

## Flag ADR conflicts

Surface any contradiction with an existing ADR explicitly instead of silently overriding it.
