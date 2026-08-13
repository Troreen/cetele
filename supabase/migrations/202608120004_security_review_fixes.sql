-- Independent-review fixes for direct-only identity visibility, explicit
-- activation, stale JWT mutation denial, and deletion-safe legal evidence.

alter table public.legal_events drop constraint if exists legal_events_user_id_fkey;

create or replace function private.is_direct_mentor(viewer uuid, subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_active_account(viewer) and private.is_active_account(subject)
    and exists (select 1 from public.legal_events granted
      where granted.user_id = subject and granted.event_kind = 'consent_granted'
        and granted.purpose = 'direct_mentor_visibility'
        and granted.recipient_scope ->> 'direct_mentor_id' = viewer::text
        and not exists (select 1 from public.legal_events withdrawn
          where withdrawn.event_kind = 'consent_withdrawn' and withdrawn.relates_to = granted.id))
    and exists (select 1 from public.mentorship_relationships r
      where r.mentor_id = viewer and r.student_id = subject and r.status = 'active');
$$;

create table if not exists public.deployment_controls (
  singleton boolean primary key default true check (singleton),
  signup_enabled boolean not null default false,
  fixture_legal_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.deployment_controls(singleton) values (true) on conflict (singleton) do nothing;
alter table public.deployment_controls enable row level security;
revoke all privileges on table public.deployment_controls from public, anon, authenticated;

create or replace function private.enforce_account_activation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_control public.deployment_controls%rowtype;
begin
  if new.onboarding_completed_at is null then return new; end if;
  select * into v_control from public.deployment_controls where singleton;
  if not coalesce(v_control.signup_enabled, false) then raise exception 'Account activation is disabled'; end if;
  if not v_control.fixture_legal_enabled and exists (
    select 1 from public.legal_documents where is_current and not production_approved
  ) then raise exception 'Production-approved legal documents required'; end if;
  return new;
end;
$$;
drop trigger if exists enforce_account_activation on public.profiles;
create trigger enforce_account_activation before insert on public.profiles
for each row execute function private.enforce_account_activation();

create or replace function private.enforce_active_direct_relationship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and (
    not private.is_active_account(new.mentor_id) or not private.is_active_account(new.student_id)
  ) then raise exception 'Both Direct Relationship participants must be active and consented'; end if;
  return new;
end;
$$;
drop trigger if exists enforce_active_direct_relationship on public.mentorship_relationships;
create trigger enforce_active_direct_relationship before insert or update of status on public.mentorship_relationships
for each row execute function private.enforce_active_direct_relationship();

-- Temporarily make the legacy helper direct-only so dependent policies and
-- routines can be replaced without a permissive interval.
create or replace function private.same_mentorship_tree(left_user uuid, right_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_direct_mentor(left_user, right_user)
      or private.is_direct_mentor(right_user, left_user);
$$;

create or replace function private.is_directly_related(left_user uuid, right_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_direct_mentor(left_user, right_user)
      or private.is_direct_mentor(right_user, left_user);
$$;

drop policy if exists profiles_read_direct on public.profiles;
create policy profiles_read_direct on public.profiles for select to authenticated using (
  (id = (select auth.uid()) and onboarding_completed_at is not null
    and (private.is_active_account((select auth.uid())) or account_state = 'closure_requested'))
  or private.is_direct_mentor((select auth.uid()), id)
);
drop policy if exists definitions_read_direct on public.habit_definitions;
create policy definitions_read_direct on public.habit_definitions for select to authenticated using (
  private.is_active_account((select auth.uid())) and (
    author_id = (select auth.uid())
    or (visibility = 'shared' and private.is_directly_related((select auth.uid()), author_id)
      and exists (select 1 from public.mentorship_relationships r where r.mentor_id = (select auth.uid()) and r.status = 'active'))
    or exists (select 1 from public.habit_assignments a where a.definition_id = habit_definitions.id
      and a.status in ('active', 'ended') and
      (a.student_id = (select auth.uid()) or private.is_direct_mentor((select auth.uid()), a.student_id)))
  )
);

create or replace function public.assign_habit_definition(p_definition_id uuid, p_student_id uuid, p_target numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_assignment_id uuid; v_mode public.habit_mode; v_default_target numeric; v_target numeric;
begin
  if not private.is_active_account((select auth.uid())) or not private.is_direct_mentor((select auth.uid()), p_student_id) then
    raise exception 'Active Direct Mentor required to assign this student'; end if;
  select d.mode, d.default_target into v_mode, v_default_target from public.habit_definitions d
  where d.id = p_definition_id and (d.author_id = (select auth.uid())
    or (d.visibility = 'shared' and private.is_directly_related((select auth.uid()), d.author_id)));
  if v_mode is null then raise exception 'Habit Definition is not available'; end if;
  v_target := case when v_mode = 'binary' then null else coalesce(p_target, v_default_target) end;
  if v_mode = 'quantitative' and coalesce(v_target, 0) <= 0 then raise exception 'Quantitative target required'; end if;
  insert into public.habit_assignments(definition_id, student_id, assigned_by, target)
  values (p_definition_id, p_student_id, (select auth.uid()), v_target) returning id into v_assignment_id;
  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id, details)
  values ((select auth.uid()), p_student_id, 'habit_assigned', 'habit_assignment', v_assignment_id,
    jsonb_build_object('definition_id', p_definition_id));
  return v_assignment_id;
end;
$$;

create or replace function public.adopt_habit_definition(p_source_definition_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_definition_id uuid; v_creator_alias text; v_source public.habit_definitions%rowtype;
begin
  if not private.is_active_account((select auth.uid())) or p_source_definition_id is null then raise exception 'Active account required'; end if;
  if not exists (select 1 from public.mentorship_relationships r where r.mentor_id = (select auth.uid())
    and r.status = 'active' and private.is_direct_mentor((select auth.uid()), r.student_id))
  then raise exception 'An active Direct Student is required'; end if;
  select p.alias into v_creator_alias from public.profiles p where p.id = (select auth.uid());
  select d.* into v_source from public.habit_definitions d where d.id = p_source_definition_id
    and d.visibility = 'shared' and private.is_directly_related((select auth.uid()), d.author_id);
  if v_source.id is null then raise exception 'Shared Habit Definition is not available'; end if;
  insert into public.habit_definitions(author_id, creator_name, name, description, guide, why_it_matters,
    completion_definition, practical_tips, resources, mode, default_target, visibility,
    source_definition_id, source_creator_id, source_creator_name)
  values ((select auth.uid()), v_creator_alias, v_source.name, v_source.description, v_source.guide,
    v_source.why_it_matters, v_source.completion_definition, v_source.practical_tips, v_source.resources,
    v_source.mode, v_source.default_target, 'private', v_source.id, v_source.author_id, v_source.creator_name)
  returning id into v_definition_id;
  return v_definition_id;
end;
$$;

create or replace function public.grant_excused_day(p_student_id uuid, p_assignment_id uuid, p_date date, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_excuse_id uuid; v_attention record; v_remaining uuid[];
begin
  if not private.is_active_account((select auth.uid())) or not private.is_direct_mentor((select auth.uid()), p_student_id)
  then raise exception 'Active Direct Mentor required to excuse this student'; end if;
  if p_assignment_id is not null and not exists (select 1 from public.habit_assignments a
    where a.id = p_assignment_id and a.student_id = p_student_id and a.status = 'active')
  then raise exception 'Assignment does not belong to the student'; end if;
  insert into public.excused_days(student_id, assignment_id, excuse_date, granted_by, note)
  values (p_student_id, p_assignment_id, p_date, (select auth.uid()), coalesce(p_note, ''))
  on conflict (student_id, assignment_id, excuse_date) do update set granted_by = excluded.granted_by, note = excluded.note
  returning id into v_excuse_id;
  for v_attention in select id, first_missed_date, second_missed_date from public.attention_items
    where student_id = p_student_id and state = 'open' and p_date in (first_missed_date, second_missed_date) for update
  loop
    v_remaining := public.missed_assignment_ids(p_student_id, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) = 0 then update public.attention_items set state = 'invalidated', invalidated_at = now() where id = v_attention.id;
    else update public.attention_items set trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining where id = v_attention.id;
    end if;
  end loop;
  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id, details)
  values ((select auth.uid()), p_student_id, 'excused_day_granted', 'excused_day', v_excuse_id,
    jsonb_build_object('responsible_mentor_id', (select auth.uid()), 'assignment_id', p_assignment_id, 'date', p_date));
  return v_excuse_id;
end;
$$;

drop function private.same_mentorship_tree(uuid, uuid);
revoke all on function private.enforce_account_activation() from public, anon, authenticated, service_role;
revoke all on function private.enforce_active_direct_relationship() from public, anon, authenticated, service_role;
revoke all on function private.is_directly_related(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function private.is_directly_related(uuid, uuid) to authenticated;

create or replace function public.revoke_user_sessions(p_user_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated, service_role;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

create or replace function private.withdraw_consent(p_purpose public.consent_purpose)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_grant public.legal_events%rowtype; v_withdrawn integer := 0;
begin
  for v_grant in select * from public.legal_events g where g.user_id = v_user
    and g.event_kind = 'consent_granted' and g.purpose = p_purpose
    and not exists (select 1 from public.legal_events w where w.event_kind = 'consent_withdrawn' and w.relates_to = g.id)
    order by g.occurred_at for update
  loop
    insert into public.legal_events(user_id, event_kind, purpose, document_kind, document_version,
      content_hash, recipient_scope, affirmative_method, relates_to)
    values (v_user, 'consent_withdrawn', p_purpose, v_grant.document_kind, v_grant.document_version,
      v_grant.content_hash, v_grant.recipient_scope, 'settings_withdrawal_confirmation', v_grant.id);
    v_withdrawn := v_withdrawn + 1;
  end loop;
  if v_withdrawn = 0 then raise exception 'Active Consent Grant required'; end if;
  if p_purpose = 'direct_mentor_visibility' then
    update public.mentorship_relationships set status = 'ended', ended_at = now() where student_id = v_user and status = 'active';
  else
    update public.profiles set account_state = 'closure_requested' where id = v_user;
    insert into public.account_requests(user_id, kind, recovery_until) values (v_user, 'deletion', now() + interval '7 days') on conflict do nothing;
  end if;
end;
$$;
