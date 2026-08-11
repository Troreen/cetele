-- Manual Secure Invitations. Apply after 202608090001_cetele_v1.sql.
-- Legacy pending invitations cannot be recovered into token-bearing links and must be reissued.

alter table public.mentorship_invitations
  add column token_hash text,
  add column expires_at timestamptz;

update public.mentorship_invitations
set cancelled_at = now()
where accepted_at is null and cancelled_at is null;

update public.mentorship_invitations
set token_hash = encode(digest(gen_random_uuid()::text || id::text, 'sha256'), 'hex'),
    expires_at = created_at + interval '1 second';

drop index if exists public.one_pending_invitation;

alter table public.mentorship_invitations
  alter column token_hash set not null,
  alter column expires_at set not null,
  drop column invitee_email,
  add constraint mentorship_invitations_token_hash_unique unique (token_hash),
  add constraint mentorship_invitations_token_hash_sha256 check (token_hash ~ '^[0-9a-f]{64}$'),
  add constraint mentorship_invitations_expiry_after_creation check (expires_at > created_at);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_display_name text;
begin
  v_display_name := btrim(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Çetele kullanıcısı'));
  if char_length(v_display_name) < 2 then v_display_name := 'Çetele kullanıcısı'; end if;
  insert into public.profiles(id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;
  insert into public.reminder_preferences(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user() from public;

drop function if exists public.accept_mentorship_invitation(uuid);

create or replace function public.claim_mentorship_invitation(p_token_hash text, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_invitation_id uuid;
  v_mentor uuid;
  v_expires_at timestamptz;
  v_invited_user_id uuid;
  v_accepted_at timestamptz;
  v_cancelled_at timestamptz;
  v_existing_mentor uuid;
begin
  if p_token_hash is null or p_token_hash !~* '^[0-9a-f]{64}$' or p_user_id is null then
    raise exception 'Valid invitation claim required';
  end if;

  select id, mentor_id, expires_at, invited_user_id, accepted_at, cancelled_at
  into v_invitation_id, v_mentor, v_expires_at, v_invited_user_id, v_accepted_at, v_cancelled_at
  from public.mentorship_invitations
  where token_hash = lower(p_token_hash)
  for update;

  if v_invitation_id is null
    or v_expires_at <= now()
    or v_invited_user_id is not null
    or v_accepted_at is not null
    or v_cancelled_at is not null then
    raise exception 'Valid invitation claim required';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Invitation claimant profile required'; end if;

  select mentor_id into v_existing_mentor
  from public.mentorship_relationships
  where student_id = p_user_id and status = 'active'
  for update;
  if v_existing_mentor is not null then raise exception 'Student already has an active mentor'; end if;
  if v_mentor = p_user_id or private.is_mentor_above(p_user_id, v_mentor) then
    raise exception 'Mentorship relationship would create a cycle';
  end if;

  insert into public.mentorship_relationships(mentor_id, student_id) values (v_mentor, p_user_id);
  update public.mentorship_invitations
  set invited_user_id = p_user_id, accepted_at = now()
  where id = v_invitation_id;
  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id)
  values (p_user_id, p_user_id, 'mentorship_invitation_accepted', 'mentorship_invitation', v_invitation_id);
  return v_invitation_id;
end;
$$;

revoke all on function public.claim_mentorship_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_mentorship_invitation(text, uuid) to service_role;
