# PR #5 hosted review-hardening recheck

Date: 2026-08-11

Tester: Codex, after Tarik's explicit approval to merge PR #5

Disposable project reference: `doyzpafuqqoydnkxmbxg`

## Migration

- Applied `supabase/migrations/202608100001_pr5_review_hardening.sql` through the Supabase SQL Editor only after Tarik lifted the manual-review boundary.
- Reviewed migration SHA-256: `18ba55704014be6300b8cf676f4090d86e0cfe39a1e522a911d87addc063616c`.
- The editor also idempotently reran migration `202608090003_post_v1_upgrade_fixes.sql`; the SQL Editor reported success with no returned rows.

## Executable matrix

The first post-migration run passed 155/156 checks. Its sole failure was `shared-definition.non-mentor` for the subject because the harness selected an older shared definition that could already be assigned to that subject. The policy deliberately permits a student to read a definition assigned to them, so this was a test-seed defect rather than an RLS denial defect.

The harness was corrected to create a fresh shared definition, verify visibility while it is still unassigned, and only then assign it. A regression test fixes that ordering contract.

Final redaction-safe aggregate:

```json
{
  "gate": "PASS",
  "project_ref": "doyzpafuqqoydnkxmbxg",
  "cleanup_marker": "cetele-hosted-verify:e60aa096-dc4a-4c26-96b5-b31a10ac01b3",
  "passed": 156,
  "failed": 0
}
```

## Evidence boundary and cleanup

- The executable matrix proves only the 156 committed allow/deny and mutation cases against this disposable project. It does not replace Tarik's manual findings or approval.
- No credentials, identity addresses, tokens, invitation links, or key values are recorded here.
- The failed-precondition and diagnostic runs used cleanup markers `cetele-hosted-verify:292168ba-f2ed-4e16-bdc7-c6b2e5a78f54` and `cetele-hosted-verify:f0b96a36-a4e5-4e56-a07a-f4951c3c86a6`. The final passing run used the marker above.
- The harness intentionally performs no destructive cleanup. These exact markers remain available for audited cleanup or the disposable project can be deleted as a whole.
