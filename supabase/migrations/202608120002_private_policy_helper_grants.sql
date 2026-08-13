-- RLS policies execute these SECURITY DEFINER helpers as the authenticated caller.
-- The private schema is not an exposed Data API schema; these grants allow policy
-- evaluation without publishing an application RPC surface.
grant usage on schema private to authenticated;
grant execute on function private.has_current_consent(uuid, public.consent_purpose) to authenticated;
grant execute on function private.is_active_account(uuid) to authenticated;
grant execute on function private.is_direct_mentor(uuid, uuid) to authenticated;
grant execute on function private.is_directly_related(uuid, uuid) to authenticated;
