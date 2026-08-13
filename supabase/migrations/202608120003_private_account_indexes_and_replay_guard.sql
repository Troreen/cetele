create index if not exists legal_events_document on public.legal_events(document_kind, document_version);
create index if not exists legal_events_relates_to on public.legal_events(relates_to) where relates_to is not null;
create index if not exists access_codes_created_by on public.access_codes(created_by);

create or replace function private.begin_pending_registration(
  p_user_id uuid, p_claim_kind public.claim_kind, p_token_hash text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_pending_id uuid; v_code_id uuid; v_invitation_id uuid;
begin
  if p_user_id is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Valid registration claim required'; end if;
  if p_claim_kind = 'access_code' then
    select id into v_code_id from public.access_codes
    where token_hash = lower(p_token_hash) and revoked_at is null and expires_at > now()
      and consumed_uses + (select count(*) from public.pending_registrations pending where pending.access_code_id = public.access_codes.id and pending.onboarding_completed_at is null and pending.cleanup_after > now()) < maximum_uses
    for update;
    if v_code_id is null then raise exception 'Valid registration claim required'; end if;
  else
    select id into v_invitation_id from public.mentorship_invitations
    where token_hash = lower(p_token_hash) and revoked_at is null and expires_at > now()
      and accepted_at is null and claimed_user_id is null
    for update;
    if v_invitation_id is null then raise exception 'Valid registration claim required'; end if;
  end if;
  insert into public.pending_registrations(user_id, claim_kind, access_code_id, mentorship_invitation_id)
  values (p_user_id, p_claim_kind, v_code_id, v_invitation_id)
  on conflict (user_id) do update set cleanup_after = greatest(public.pending_registrations.cleanup_after, now() + interval '7 days')
  where public.pending_registrations.claim_kind = excluded.claim_kind
    and public.pending_registrations.access_code_id is not distinct from excluded.access_code_id
    and public.pending_registrations.mentorship_invitation_id is not distinct from excluded.mentorship_invitation_id
  returning id into v_pending_id;
  if v_pending_id is null then raise exception 'User already has a different pending registration'; end if;
  return v_pending_id;
end;
$$;
