-- Private accounts, consent evidence, and direct-only authorization.
-- Apply after 202608100001_pr5_review_hardening.sql to a disposable project first.
-- The legal-document rows below are deliberately non-production fixtures.

create type public.account_state as enum ('active', 'visibility_withdrawn', 'closure_requested', 'disabled');
create type public.claim_kind as enum ('access_code', 'mentorship_invitation');
create type public.legal_document_kind as enum ('terms', 'privacy_notice', 'core_tracking_consent', 'direct_mentor_visibility_consent');
create type public.legal_event_kind as enum ('terms_accepted', 'privacy_notice_presented', 'consent_granted', 'consent_withdrawn');
create type public.consent_purpose as enum ('core_tracking', 'direct_mentor_visibility');
create type public.account_request_kind as enum ('export', 'deletion');
create type public.account_request_state as enum ('requested', 'processing', 'ready', 'cancelled', 'completed');

alter table public.profiles rename column display_name to alias;
alter table public.profiles
  add column onboarding_completed_at timestamptz,
  add column account_state public.account_state not null default 'active',
  drop constraint if exists profiles_display_name_check;
alter table public.profiles
  add constraint profiles_alias_check check (
    char_length(btrim(alias)) between 2 and 40 and position('@' in alias) = 0
  );

drop trigger if exists auth_user_profile on auth.users;
drop function if exists public.handle_new_auth_user();

alter table public.mentorship_invitations
  rename column cancelled_at to revoked_at;
alter table public.mentorship_invitations
  rename column invited_user_id to claimed_user_id;
alter table public.mentorship_invitations
  drop column invitee_name,
  add column claimed_at timestamptz;
update public.mentorship_invitations set claimed_at = accepted_at where accepted_at is not null;
alter table public.mentorship_invitations
  add constraint mentorship_invitation_single_use check (
    (accepted_at is null and claimed_user_id is null)
    or (accepted_at is not null and claimed_user_id is not null)
  );

create table public.app_administrators (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references public.profiles(id),
  maximum_uses integer not null check (maximum_uses between 1 and 100),
  consumed_uses integer not null default 0 check (consumed_uses >= 0 and consumed_uses <= maximum_uses),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.pending_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  claim_kind public.claim_kind not null,
  access_code_id uuid references public.access_codes(id),
  mentorship_invitation_id uuid references public.mentorship_invitations(id),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  onboarding_completed_at timestamptz,
  cleanup_after timestamptz not null default (now() + interval '7 days'),
  check (
    (claim_kind = 'access_code' and access_code_id is not null and mentorship_invitation_id is null)
    or (claim_kind = 'mentorship_invitation' and access_code_id is null and mentorship_invitation_id is not null)
  )
);
create unique index pending_access_code_user on public.pending_registrations(access_code_id, user_id) where access_code_id is not null;
create unique index pending_mentorship_invitation on public.pending_registrations(mentorship_invitation_id) where mentorship_invitation_id is not null;
create index pending_registrations_cleanup on public.pending_registrations(cleanup_after) where onboarding_completed_at is null;

create table public.legal_documents (
  kind public.legal_document_kind not null,
  version text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  effective_at timestamptz not null,
  is_current boolean not null default false,
  production_approved boolean not null default false,
  primary key (kind, version)
);

-- Activation is an explicit database operation. Fresh installations remain
-- closed even if an application environment flag is accidentally enabled.
create table public.deployment_controls (
  singleton boolean primary key default true check (singleton),
  signup_enabled boolean not null default false,
  fixture_legal_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.deployment_controls(singleton) values (true);
create unique index one_current_legal_document_per_kind on public.legal_documents(kind) where is_current;

insert into public.legal_documents(kind, version, content_hash, effective_at, is_current, production_approved)
values
  ('terms', 'draft-fixture-2026-08-12', encode(digest('NON-PRODUCTION TERMS FIXTURE', 'sha256'), 'hex'), now(), true, false),
  ('privacy_notice', 'draft-fixture-2026-08-12', encode(digest('NON-PRODUCTION PRIVACY NOTICE FIXTURE', 'sha256'), 'hex'), now(), true, false),
  ('core_tracking_consent', 'draft-fixture-2026-08-12', encode(digest('NON-PRODUCTION CORE TRACKING CONSENT FIXTURE', 'sha256'), 'hex'), now(), true, false),
  ('direct_mentor_visibility_consent', 'draft-fixture-2026-08-12', encode(digest('NON-PRODUCTION DIRECT MENTOR VISIBILITY CONSENT FIXTURE', 'sha256'), 'hex'), now(), true, false);

create table public.legal_events (
  id uuid primary key default gen_random_uuid(),
  -- Deliberately no FK to auth.users: after Auth deletion this random UUID is
  -- retained as a pseudonymous evidence key, while email remains Auth-only.
  user_id uuid not null,
  event_kind public.legal_event_kind not null,
  purpose public.consent_purpose,
  document_kind public.legal_document_kind not null,
  document_version text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  recipient_scope jsonb not null default '{}'::jsonb,
  affirmative_method text not null check (char_length(affirmative_method) between 3 and 80),
  occurred_at timestamptz not null default now(),
  relates_to uuid references public.legal_events(id),
  foreign key (document_kind, document_version) references public.legal_documents(kind, version),
  check (jsonb_typeof(recipient_scope) = 'object'),
  check (
    (event_kind in ('consent_granted', 'consent_withdrawn') and purpose is not null)
    or (event_kind in ('terms_accepted', 'privacy_notice_presented') and purpose is null)
  ),
  check ((event_kind = 'consent_withdrawn') = (relates_to is not null))
);
create index legal_events_effective_consent on public.legal_events(user_id, purpose, occurred_at desc)
  where event_kind in ('consent_granted', 'consent_withdrawn');
create index legal_events_document on public.legal_events(document_kind, document_version);
create index legal_events_relates_to on public.legal_events(relates_to) where relates_to is not null;

create table public.account_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.account_request_kind not null,
  state public.account_request_state not null default 'requested',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  recovery_until timestamptz,
  check ((kind = 'deletion') or recovery_until is null)
);
create unique index one_open_account_request_per_kind on public.account_requests(user_id, kind)
  where state in ('requested', 'processing', 'ready');

create or replace function private.prevent_legal_event_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Legal evidence is append-only';
end;
$$;
create trigger prevent_legal_event_mutation before update or delete on public.legal_events
for each row execute function private.prevent_legal_event_mutation();

create or replace function private.has_current_consent(p_user_id uuid, p_purpose public.consent_purpose)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.legal_events granted
    where granted.user_id = p_user_id
      and granted.event_kind = 'consent_granted'
      and granted.purpose = p_purpose
      and not exists (
        select 1 from public.legal_events withdrawn
        where withdrawn.event_kind = 'consent_withdrawn'
          and withdrawn.relates_to = granted.id
      )
  );
$$;

create or replace function private.is_active_account(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and p.onboarding_completed_at is not null
      and p.account_state = 'active'
      and private.has_current_consent(p_user_id, 'core_tracking')
  );
$$;

create or replace function private.is_direct_mentor(viewer uuid, subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_active_account(viewer)
    and private.is_active_account(subject)
    and exists (
      select 1 from public.legal_events granted
      where granted.user_id = subject and granted.event_kind = 'consent_granted'
        and granted.purpose = 'direct_mentor_visibility'
        and granted.recipient_scope ->> 'direct_mentor_id' = viewer::text
        and not exists (select 1 from public.legal_events withdrawn
          where withdrawn.event_kind = 'consent_withdrawn' and withdrawn.relates_to = granted.id)
    )
    and exists (
      select 1 from public.mentorship_relationships r
      where r.mentor_id = viewer and r.student_id = subject and r.status = 'active'
    );
$$;

create or replace function private.would_create_mentorship_cycle(p_mentor uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  with recursive descendants(student_id) as (
    select r.student_id from public.mentorship_relationships r
    where r.mentor_id = p_student and r.status = 'active'
    union
    select r.student_id from public.mentorship_relationships r
    join descendants d on r.mentor_id = d.student_id
    where r.status = 'active'
  )
  select p_mentor = p_student or exists (select 1 from descendants where student_id = p_mentor);
$$;

create or replace function public.reject_mentorship_cycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.would_create_mentorship_cycle(new.mentor_id, new.student_id) then
    raise exception 'Mentorship relationship would create a cycle';
  end if;
  return new;
end;
$$;

create or replace function private.is_directly_related(left_user uuid, right_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_direct_mentor(left_user, right_user)
      or private.is_direct_mentor(right_user, left_user);
$$;

drop policy if exists profiles_read_upward on public.profiles;
drop policy if exists relationships_read_upward on public.mentorship_relationships;
drop policy if exists definitions_read on public.habit_definitions;
drop policy if exists assignments_read_upward on public.habit_assignments;
drop policy if exists completions_read_upward on public.completions;
drop policy if exists excuses_read_upward on public.excused_days;
drop policy if exists attention_mentor_only on public.attention_items;
drop policy if exists followups_writer_and_above on public.followups;
drop policy if exists reviews_writer_and_above on public.daily_reviews;
drop policy if exists audit_actor_and_above on public.audit_events;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists preferences_subject_all on public.assignment_preferences;
drop policy if exists reminders_self on public.reminder_preferences;

create policy profiles_read_direct on public.profiles for select to authenticated using (
  (id = (select auth.uid()) and onboarding_completed_at is not null
    and (private.is_active_account((select auth.uid())) or account_state = 'closure_requested'))
  or private.is_direct_mentor((select auth.uid()), id)
);
create policy relationships_read_direct on public.mentorship_relationships for select to authenticated using (
  private.is_active_account((select auth.uid()))
  and (student_id = (select auth.uid()) or mentor_id = (select auth.uid()))
);
create policy definitions_read_direct on public.habit_definitions for select to authenticated using (
  private.is_active_account((select auth.uid())) and (
  author_id = (select auth.uid())
  or (
    visibility = 'shared'
    and private.is_directly_related((select auth.uid()), author_id)
    and exists (select 1 from public.mentorship_relationships r where r.mentor_id = (select auth.uid()) and r.status = 'active')
  )
  or exists (
    select 1 from public.habit_assignments a
    where a.definition_id = habit_definitions.id and a.status in ('active', 'ended')
      and ((a.student_id = (select auth.uid()) and private.is_active_account((select auth.uid()))) or private.is_direct_mentor((select auth.uid()), a.student_id))
  )
  )
);
create policy assignments_read_direct on public.habit_assignments for select to authenticated using (
  status in ('active', 'ended') and ((student_id = (select auth.uid()) and private.is_active_account((select auth.uid()))) or private.is_direct_mentor((select auth.uid()), student_id))
);
create policy completions_read_direct on public.completions for select to authenticated using (
  (student_id = (select auth.uid()) and private.is_active_account((select auth.uid()))) or private.is_direct_mentor((select auth.uid()), student_id)
);
create policy excuses_read_direct on public.excused_days for select to authenticated using (
  (student_id = (select auth.uid()) and private.is_active_account((select auth.uid()))) or private.is_direct_mentor((select auth.uid()), student_id)
);
create policy attention_read_direct on public.attention_items for select to authenticated using (
  (student_id = (select auth.uid()) and private.is_active_account((select auth.uid()))) or private.is_direct_mentor((select auth.uid()), student_id)
);
create policy followups_writer_only on public.followups for select to authenticated using (actor_id = (select auth.uid()) and private.is_active_account((select auth.uid())));
create policy reviews_writer_only on public.daily_reviews for select to authenticated using (mentor_id = (select auth.uid()) and private.is_active_account((select auth.uid())));
create policy audit_actor_only on public.audit_events for select to authenticated using (actor_id = (select auth.uid()) and private.is_active_account((select auth.uid())));
create policy profiles_update_active_self on public.profiles for update to authenticated
using (id = (select auth.uid()) and private.is_active_account((select auth.uid())))
with check (id = (select auth.uid()) and private.is_active_account((select auth.uid())));
create policy preferences_active_self on public.assignment_preferences for all to authenticated
using (student_id = (select auth.uid()) and private.is_active_account((select auth.uid())) and exists (select 1 from public.habit_assignments a where a.id = assignment_id and a.student_id = (select auth.uid())))
with check (student_id = (select auth.uid()) and private.is_active_account((select auth.uid())) and exists (select 1 from public.habit_assignments a where a.id = assignment_id and a.student_id = (select auth.uid())));
create policy reminders_active_self on public.reminder_preferences for all to authenticated
using (user_id = (select auth.uid()) and private.is_active_account((select auth.uid())))
with check (user_id = (select auth.uid()) and private.is_active_account((select auth.uid())));

drop function if exists private.is_current_user_mentor_above(uuid);
drop function if exists private.is_in_current_user_tree(uuid);
drop function if exists private.same_tree(uuid, uuid);
drop function if exists private.is_mentor_above(uuid, uuid);

drop index if exists public.assignments_by_intervention_mentor;
alter table public.habit_assignments drop column intervention_for_mentor_id;

create or replace function public.record_follow_up(p_attention_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_subject uuid; v_responsible uuid;
begin
  if not private.is_active_account((select auth.uid())) then raise exception 'Active account required'; end if;
  select student_id, responsible_mentor_id into v_subject, v_responsible
  from public.attention_items where id = p_attention_id and state = 'open' for update;
  if v_subject is null or (select auth.uid()) <> v_responsible
    or not private.is_direct_mentor((select auth.uid()), v_subject) then
    raise exception 'Direct Mentor required for follow-up';
  end if;
  insert into public.followups(attention_id, actor_id, responsible_mentor_id, private_note)
  values (p_attention_id, (select auth.uid()), v_responsible, coalesce(p_note, ''));
  update public.attention_items set state = 'followed_up' where id = p_attention_id;
  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id, details)
  values ((select auth.uid()), v_subject, 'follow_up_recorded', 'attention_item', p_attention_id,
    jsonb_build_object('responsible_mentor_id', v_responsible));
end;
$$;

create or replace function public.assign_habit_definition(p_definition_id uuid, p_student_id uuid, p_target numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_assignment_id uuid; v_mode public.habit_mode; v_default_target numeric; v_target numeric;
begin
  if not private.is_direct_mentor((select auth.uid()), p_student_id) then
    raise exception 'Direct Mentor required to assign this student';
  end if;
  select d.mode, d.default_target into v_mode, v_default_target from public.habit_definitions d
  where d.id = p_definition_id and (
    d.author_id = (select auth.uid())
    or (d.visibility = 'shared' and private.is_directly_related((select auth.uid()), d.author_id))
  );
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

create or replace function public.create_habit_definition(
  p_name text, p_description text, p_guide text, p_why_it_matters text,
  p_completion_definition text, p_practical_tips text, p_mode public.habit_mode,
  p_default_target numeric, p_visibility public.definition_visibility
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_definition_id uuid; v_creator_alias text; v_name text := btrim(coalesce(p_name, '')); v_completion text := btrim(coalesce(p_completion_definition, ''));
begin
  if not private.is_active_account((select auth.uid())) then raise exception 'Active account required'; end if;
  if not exists (
    select 1 from public.mentorship_relationships r
    where r.mentor_id = (select auth.uid()) and r.status = 'active'
      and private.is_direct_mentor((select auth.uid()), r.student_id)
  ) then raise exception 'An active Direct Student is required'; end if;
  select p.alias into v_creator_alias from public.profiles p where p.id = (select auth.uid());
  if char_length(v_name) not between 1 and 100
    or char_length(coalesce(p_description, '')) > 240 or char_length(coalesce(p_guide, '')) > 4000
    or char_length(coalesce(p_why_it_matters, '')) > 1000 or char_length(v_completion) not between 1 and 1000
    or char_length(coalesce(p_practical_tips, '')) > 1000 or p_mode is null or p_visibility is null
  then raise exception 'Valid Habit Definition required'; end if;
  if p_mode = 'binary' and p_default_target is not null then raise exception 'Binary Habit Definition target must be null'; end if;
  if p_default_target is not null and p_default_target <= 0 then raise exception 'Positive default target required'; end if;
  insert into public.habit_definitions(author_id, creator_name, name, description, guide, why_it_matters, completion_definition, practical_tips, mode, default_target, visibility)
  values ((select auth.uid()), v_creator_alias, v_name, coalesce(p_description, ''), coalesce(p_guide, ''), coalesce(p_why_it_matters, ''), v_completion, coalesce(p_practical_tips, ''), p_mode, p_default_target, p_visibility)
  returning id into v_definition_id;
  return v_definition_id;
end;
$$;

create or replace function public.adopt_habit_definition(p_source_definition_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_definition_id uuid; v_creator_alias text; v_source public.habit_definitions%rowtype;
begin
  if not private.is_active_account((select auth.uid())) or p_source_definition_id is null then raise exception 'Active account required'; end if;
  if not exists (
    select 1 from public.mentorship_relationships r
    where r.mentor_id = (select auth.uid()) and r.status = 'active'
      and private.is_direct_mentor((select auth.uid()), r.student_id)
  ) then raise exception 'An active Direct Student is required'; end if;
  select p.alias into v_creator_alias from public.profiles p where p.id = (select auth.uid());
  select d.* into v_source from public.habit_definitions d
  where d.id = p_source_definition_id and d.visibility = 'shared'
    and private.is_directly_related((select auth.uid()), d.author_id);
  if v_source.id is null then raise exception 'Shared Habit Definition is not available'; end if;
  insert into public.habit_definitions(author_id, creator_name, name, description, guide, why_it_matters, completion_definition, practical_tips, resources, mode, default_target, visibility, source_definition_id, source_creator_id, source_creator_name)
  values ((select auth.uid()), v_creator_alias, v_source.name, v_source.description, v_source.guide, v_source.why_it_matters, v_source.completion_definition, v_source.practical_tips, v_source.resources, v_source.mode, v_source.default_target, 'private', v_source.id, v_source.author_id, v_source.creator_name)
  returning id into v_definition_id;
  return v_definition_id;
end;
$$;

create or replace function public.record_completion(p_assignment_id uuid, p_date date, p_amount numeric, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_mode public.habit_mode; v_timezone text; v_today date; v_attention record; v_remaining uuid[];
begin
  if not private.is_active_account((select auth.uid())) then raise exception 'Active account required'; end if;
  select a.student_id, d.mode, p.timezone into v_student, v_mode, v_timezone
  from public.habit_assignments a join public.habit_definitions d on d.id = a.definition_id join public.profiles p on p.id = a.student_id
  where a.id = p_assignment_id and a.status = 'active';
  if v_student is null or v_student <> (select auth.uid()) then raise exception 'Not authorized for assignment'; end if;
  v_today := (now() at time zone v_timezone)::date;
  if p_date not in (v_today, v_today - 1) then raise exception 'Completion date is locked'; end if;
  if v_mode = 'binary' and p_amount is not null then raise exception 'Binary completion amount must be null'; end if;
  if v_mode = 'quantitative' and coalesce(p_amount, 0) <= 0 then raise exception 'Meaningful quantitative amount required'; end if;
  if p_amount is not null and p_amount <> trunc(p_amount) then raise exception 'Completion amount must be an integer'; end if;
  insert into public.completions(assignment_id, student_id, completion_date, amount, retrospective, note)
  values (p_assignment_id, v_student, p_date, p_amount, p_date = v_today - 1, coalesce(p_note, ''))
  on conflict (assignment_id, completion_date) do update set amount = excluded.amount, note = excluded.note, retrospective = excluded.retrospective, updated_at = now();
  for v_attention in select id, first_missed_date, second_missed_date from public.attention_items
    where student_id = v_student and state = 'open' and p_date in (first_missed_date, second_missed_date) for update
  loop
    v_remaining := public.missed_assignment_ids(v_student, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) = 0 then update public.attention_items set state = 'invalidated', invalidated_at = now() where id = v_attention.id;
    else update public.attention_items set trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining where id = v_attention.id; end if;
  end loop;
end;
$$;

create or replace function public.grant_excused_day(p_student_id uuid, p_assignment_id uuid, p_date date, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_excuse_id uuid; v_attention record; v_remaining uuid[];
begin
  if not private.is_active_account((select auth.uid()))
    or not private.is_direct_mentor((select auth.uid()), p_student_id) then
    raise exception 'Active Direct Mentor required to excuse this student';
  end if;
  if p_assignment_id is not null and not exists (
    select 1 from public.habit_assignments a
    where a.id = p_assignment_id and a.student_id = p_student_id and a.status = 'active'
  ) then raise exception 'Assignment does not belong to the student'; end if;
  insert into public.excused_days(student_id, assignment_id, excuse_date, granted_by, note)
  values (p_student_id, p_assignment_id, p_date, (select auth.uid()), coalesce(p_note, ''))
  on conflict (student_id, assignment_id, excuse_date) do update
    set granted_by = excluded.granted_by, note = excluded.note
  returning id into v_excuse_id;
  for v_attention in select id, first_missed_date, second_missed_date from public.attention_items
    where student_id = p_student_id and state = 'open' and p_date in (first_missed_date, second_missed_date) for update
  loop
    v_remaining := public.missed_assignment_ids(p_student_id, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) = 0 then
      update public.attention_items set state = 'invalidated', invalidated_at = now() where id = v_attention.id;
    else
      update public.attention_items set trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining where id = v_attention.id;
    end if;
  end loop;
  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id, details)
  values ((select auth.uid()), p_student_id, 'excused_day_granted', 'excused_day', v_excuse_id,
    jsonb_build_object('responsible_mentor_id', (select auth.uid()), 'assignment_id', p_assignment_id, 'date', p_date));
  return v_excuse_id;
end;
$$;

create or replace function public.remove_completion(p_assignment_id uuid, p_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_timezone text; v_today date; v_attention record; v_remaining uuid[];
begin
  if not private.is_active_account((select auth.uid())) then raise exception 'Active account required'; end if;
  select a.student_id, p.timezone into v_student, v_timezone from public.habit_assignments a join public.profiles p on p.id = a.student_id
  where a.id = p_assignment_id and a.status = 'active';
  if v_student is null or v_student <> (select auth.uid()) then raise exception 'Not authorized for assignment'; end if;
  v_today := (now() at time zone v_timezone)::date;
  if p_date not in (v_today, v_today - 1) then raise exception 'Completion date is locked'; end if;
  delete from public.completions where assignment_id = p_assignment_id and student_id = (select auth.uid()) and completion_date = p_date;
  for v_attention in select id, first_missed_date, second_missed_date from public.attention_items
    where student_id = v_student and state in ('open', 'invalidated') and p_date in (first_missed_date, second_missed_date) for update
  loop
    v_remaining := public.missed_assignment_ids(v_student, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) > 0 then update public.attention_items set state = 'open', invalidated_at = null, trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining where id = v_attention.id; end if;
  end loop;
end;
$$;

create or replace function public.reorder_habit_assignments(p_assignment_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not private.is_active_account((select auth.uid())) or p_assignment_ids is null or cardinality(p_assignment_ids) = 0 or cardinality(p_assignment_ids) > 200 or array_position(p_assignment_ids, null) is not null then raise exception 'Valid assignment order required'; end if;
  select count(distinct assignment_id) into v_count from unnest(p_assignment_ids) supplied(assignment_id);
  if v_count <> cardinality(p_assignment_ids) then raise exception 'Duplicate assignment IDs are not allowed'; end if;
  select count(*) into v_count from public.habit_assignments a where a.student_id = (select auth.uid()) and a.status = 'active';
  if v_count <> cardinality(p_assignment_ids) or exists (
    select 1 from unnest(p_assignment_ids) supplied(assignment_id) left join public.habit_assignments a
      on a.id = supplied.assignment_id and a.student_id = (select auth.uid()) and a.status = 'active' where a.id is null
  ) then raise exception 'Complete active assignment order required'; end if;
  insert into public.assignment_preferences(assignment_id, student_id, sort_order)
  select supplied.assignment_id, (select auth.uid()), supplied.ordinality::integer - 1 from unnest(p_assignment_ids) with ordinality supplied(assignment_id, ordinality)
  on conflict (assignment_id) do update set student_id = excluded.student_id, sort_order = excluded.sort_order;
end;
$$;

create or replace function public.record_daily_review()
returns void language plpgsql security definer set search_path = '' as $$
declare v_today date;
begin
  if not private.is_active_account((select auth.uid())) then raise exception 'Active account required'; end if;
  select (now() at time zone p.timezone)::date into v_today from public.profiles p where p.id = (select auth.uid());
  if not exists (
    select 1 from public.mentorship_relationships r where r.mentor_id = (select auth.uid()) and r.status = 'active'
      and private.is_direct_mentor((select auth.uid()), r.student_id)
  ) then raise exception 'An active Direct Student is required'; end if;
  insert into public.daily_reviews(mentor_id, review_date) values ((select auth.uid()), v_today) on conflict (mentor_id, review_date) do nothing;
end;
$$;

create or replace function public.reconcile_my_attention()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_created integer := 0;
begin
  if not private.is_active_account((select auth.uid())) then raise exception 'Active account required'; end if;
  insert into public.attention_items(student_id, trigger_assignment_id, contributing_assignment_ids, responsible_mentor_id, first_missed_date, second_missed_date)
  select r.student_id, candidate.ids[1], candidate.ids, r.mentor_id, candidate.first_date, candidate.second_date
  from public.mentorship_relationships r
  join public.profiles student_profile on student_profile.id = r.student_id
  cross join lateral (
    select day.first_date, day.first_date + 1 as second_date,
      public.missed_assignment_ids(r.student_id, day.first_date, day.first_date + 1) as ids
    from generate_series(
      greatest((now() at time zone student_profile.timezone)::date - 183,
        coalesce((select min(a.created_at at time zone student_profile.timezone)::date from public.habit_assignments a where a.student_id = r.student_id), (now() at time zone student_profile.timezone)::date - 2)),
      (now() at time zone student_profile.timezone)::date - 2, interval '1 day'
    ) as generated(first_date)
    cross join lateral (select generated.first_date::date as first_date) day
    where cardinality(public.missed_assignment_ids(r.student_id, day.first_date, day.first_date + 1)) > 0
      and not exists (select 1 from public.attention_items existing where existing.student_id = r.student_id and existing.second_missed_date = day.first_date + 1 and existing.state <> 'invalidated')
    order by day.first_date desc limit 1
  ) candidate
  where r.status = 'active' and r.mentor_id = (select auth.uid())
    and private.is_direct_mentor((select auth.uid()), r.student_id)
    and not exists (select 1 from public.attention_items open_item where open_item.student_id = r.student_id and open_item.state = 'open')
  on conflict (student_id, second_missed_date) do update
  set trigger_assignment_id = excluded.trigger_assignment_id,
      contributing_assignment_ids = excluded.contributing_assignment_ids,
      state = case when public.attention_items.state = 'invalidated' then 'open'::public.attention_state else public.attention_items.state end,
      invalidated_at = case when public.attention_items.state = 'invalidated' then null else public.attention_items.invalidated_at end;
  get diagnostics v_created = row_count;
  return v_created;
end;
$$;

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

create or replace function public.begin_pending_registration(
  p_user_id uuid, p_claim_kind public.claim_kind, p_token_hash text
)
returns uuid language sql security invoker set search_path = '' as $$
  select private.begin_pending_registration(p_user_id, p_claim_kind, p_token_hash);
$$;

create or replace function private.complete_onboarding(
  p_alias text, p_terms_version text, p_privacy_version text,
  p_core_version text, p_direct_version text, p_terms boolean,
  p_core boolean, p_direct boolean
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_pending public.pending_registrations%rowtype; v_doc record; v_grant uuid; v_mentor uuid;
  v_signup_enabled boolean; v_fixture_legal_enabled boolean;
begin
  if v_user is null or char_length(btrim(coalesce(p_alias, ''))) not between 2 and 40 or position('@' in p_alias) > 0 then raise exception 'Valid Alias required'; end if;
  if not p_terms or not p_core then raise exception 'Required choices must be affirmative'; end if;
  select signup_enabled, fixture_legal_enabled into v_signup_enabled, v_fixture_legal_enabled
  from public.deployment_controls where singleton;
  if not coalesce(v_signup_enabled, false) then raise exception 'Account activation is disabled'; end if;
  select * into v_pending from public.pending_registrations where user_id = v_user and onboarding_completed_at is null and cleanup_after > now() for update;
  if v_pending.id is null then raise exception 'Active pending registration required'; end if;
  if not exists (select 1 from auth.users u where u.id = v_user and u.email_confirmed_at is not null) then raise exception 'Verified recovery email required'; end if;
  if v_pending.claim_kind = 'mentorship_invitation' and not p_direct then raise exception 'Direct Mentor Visibility Consent required'; end if;
  if exists (
    select 1 from (values
      ('terms'::public.legal_document_kind, p_terms_version),
      ('privacy_notice'::public.legal_document_kind, p_privacy_version),
      ('core_tracking_consent'::public.legal_document_kind, p_core_version)
    ) wanted(kind, version)
    left join public.legal_documents d on d.kind = wanted.kind and d.version = wanted.version and d.is_current
      and (d.production_approved or v_fixture_legal_enabled)
    where d.kind is null
  ) then raise exception 'Current legal documents required'; end if;
  if v_pending.claim_kind = 'mentorship_invitation' and not exists (
    select 1 from public.legal_documents d where d.kind = 'direct_mentor_visibility_consent' and d.version = p_direct_version and d.is_current
      and (d.production_approved or v_fixture_legal_enabled)
  ) then raise exception 'Current visibility consent document required'; end if;

  if v_pending.claim_kind = 'access_code' then
    update public.access_codes set consumed_uses = consumed_uses + 1
    where id = v_pending.access_code_id and revoked_at is null and expires_at > now() and consumed_uses < maximum_uses;
    if not found then raise exception 'Registration claim is no longer available'; end if;
  else
    select mentor_id into v_mentor from public.mentorship_invitations
    where id = v_pending.mentorship_invitation_id and revoked_at is null and expires_at > now()
      and accepted_at is null and claimed_user_id is null for update;
    if v_mentor is null then raise exception 'Registration claim is no longer available'; end if;
    if not private.is_active_account(v_mentor) then raise exception 'Inviting Direct Mentor is no longer active'; end if;
  end if;

  insert into public.profiles(id, alias, onboarding_completed_at, account_state)
  values (v_user, btrim(p_alias), now(), 'active');
  insert into public.reminder_preferences(user_id) values (v_user);

  select * into v_doc from public.legal_documents where kind = 'terms' and version = p_terms_version;
  insert into public.legal_events(user_id, event_kind, document_kind, document_version, content_hash, affirmative_method)
  values (v_user, 'terms_accepted', v_doc.kind, v_doc.version, v_doc.content_hash, 'separate_checkbox_submitted');
  select * into v_doc from public.legal_documents where kind = 'privacy_notice' and version = p_privacy_version;
  insert into public.legal_events(user_id, event_kind, document_kind, document_version, content_hash, affirmative_method)
  values (v_user, 'privacy_notice_presented', v_doc.kind, v_doc.version, v_doc.content_hash, 'layered_notice_presented');
  select * into v_doc from public.legal_documents where kind = 'core_tracking_consent' and version = p_core_version;
  insert into public.legal_events(user_id, event_kind, purpose, document_kind, document_version, content_hash, recipient_scope, affirmative_method)
  values (v_user, 'consent_granted', 'core_tracking', v_doc.kind, v_doc.version, v_doc.content_hash,
    jsonb_build_object('recipient', 'self'), 'separate_checkbox_submitted') returning id into v_grant;
  if v_pending.claim_kind = 'mentorship_invitation' then
    select * into v_doc from public.legal_documents where kind = 'direct_mentor_visibility_consent' and version = p_direct_version;
    insert into public.legal_events(user_id, event_kind, purpose, document_kind, document_version, content_hash, recipient_scope, affirmative_method)
    values (v_user, 'consent_granted', 'direct_mentor_visibility', v_doc.kind, v_doc.version, v_doc.content_hash,
      jsonb_build_object('direct_mentor_id', v_mentor), 'separate_checkbox_submitted');
    insert into public.mentorship_relationships(mentor_id, student_id) values (v_mentor, v_user);
    update public.mentorship_invitations set claimed_user_id = v_user, claimed_at = now(), accepted_at = now()
    where id = v_pending.mentorship_invitation_id and accepted_at is null;
  end if;
  update public.pending_registrations set verified_at = now(), onboarding_completed_at = now() where id = v_pending.id;
end;
$$;

create or replace function public.complete_onboarding(
  p_alias text, p_terms_version text, p_privacy_version text,
  p_core_version text, p_direct_version text, p_terms boolean,
  p_core boolean, p_direct boolean
)
returns void language sql security invoker set search_path = '' as $$
  select private.complete_onboarding(p_alias, p_terms_version, p_privacy_version, p_core_version, p_direct_version, p_terms, p_core, p_direct);
$$;

create or replace function private.withdraw_consent(p_purpose public.consent_purpose)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_grant public.legal_events%rowtype; v_withdrawn integer := 0;
begin
  for v_grant in select * from public.legal_events g
  where g.user_id = v_user and g.event_kind = 'consent_granted' and g.purpose = p_purpose
    and not exists (select 1 from public.legal_events w where w.event_kind = 'consent_withdrawn' and w.relates_to = g.id)
  order by g.occurred_at for update
  loop
    insert into public.legal_events(user_id, event_kind, purpose, document_kind, document_version, content_hash, recipient_scope, affirmative_method, relates_to)
    values (v_user, 'consent_withdrawn', p_purpose, v_grant.document_kind, v_grant.document_version,
      v_grant.content_hash, v_grant.recipient_scope, 'settings_withdrawal_confirmation', v_grant.id);
    v_withdrawn := v_withdrawn + 1;
  end loop;
  if v_withdrawn = 0 then raise exception 'Active Consent Grant required'; end if;
  if p_purpose = 'direct_mentor_visibility' then
    update public.mentorship_relationships set status = 'ended', ended_at = now() where student_id = v_user and status = 'active';
  else
    update public.profiles set account_state = 'closure_requested' where id = v_user;
    insert into public.account_requests(user_id, kind, recovery_until) values (v_user, 'deletion', now() + interval '7 days')
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.withdraw_consent(p_purpose public.consent_purpose)
returns void language sql security invoker set search_path = '' as $$
  select private.withdraw_consent(p_purpose);
$$;

create or replace function public.request_account_export()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authenticated account required'; end if;
  insert into public.account_requests(user_id, kind) values ((select auth.uid()), 'export')
  on conflict (user_id, kind) where state in ('requested', 'processing', 'ready') do update set requested_at = excluded.requested_at
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.request_account_deletion()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authenticated account required'; end if;
  update public.profiles set account_state = 'closure_requested' where id = (select auth.uid());
  insert into public.account_requests(user_id, kind, recovery_until)
  values ((select auth.uid()), 'deletion', now() + interval '7 days')
  on conflict (user_id, kind) where state in ('requested', 'processing', 'ready') do update set requested_at = excluded.requested_at
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.has_current_consent((select auth.uid()), 'core_tracking') then
    raise exception 'Recoverable account required';
  end if;
  update public.account_requests set state = 'cancelled', completed_at = now()
  where user_id = (select auth.uid()) and kind = 'deletion' and state = 'requested' and recovery_until > now();
  if not found then raise exception 'Recoverable deletion request required'; end if;
  update public.profiles set account_state = 'active' where id = (select auth.uid()) and account_state = 'closure_requested';
end;
$$;

create or replace function public.revoke_user_sessions(p_user_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

alter table public.app_administrators enable row level security;
alter table public.access_codes enable row level security;
alter table public.pending_registrations enable row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_events enable row level security;
alter table public.account_requests enable row level security;
alter table public.deployment_controls enable row level security;

revoke all privileges on table public.app_administrators, public.access_codes, public.pending_registrations,
  public.legal_documents, public.legal_events, public.account_requests, public.deployment_controls from public, anon, authenticated;
grant select on table public.legal_documents to authenticated;
grant select on table public.legal_events, public.account_requests to authenticated;

create policy legal_documents_authenticated_read on public.legal_documents for select to authenticated using (true);
create policy legal_events_self_read on public.legal_events for select to authenticated using (user_id = (select auth.uid()));
create policy account_requests_self_read on public.account_requests for select to authenticated using (user_id = (select auth.uid()));

revoke all on function private.prevent_legal_event_mutation() from public, anon, authenticated, service_role;
revoke all on function private.has_current_consent(uuid, public.consent_purpose) from public, anon, authenticated, service_role;
revoke all on function private.is_active_account(uuid) from public, anon, authenticated, service_role;
revoke all on function private.is_direct_mentor(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.would_create_mentorship_cycle(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.is_directly_related(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.begin_pending_registration(uuid, public.claim_kind, text) from public, anon, authenticated, service_role;
revoke all on function private.complete_onboarding(text, text, text, text, text, boolean, boolean, boolean) from public, anon, authenticated, service_role;
revoke all on function private.withdraw_consent(public.consent_purpose) from public, anon, authenticated, service_role;

revoke all on function public.begin_pending_registration(uuid, public.claim_kind, text) from public, anon, authenticated, service_role;
revoke all on function public.complete_onboarding(text, text, text, text, text, boolean, boolean, boolean) from public, anon, authenticated, service_role;
revoke all on function public.withdraw_consent(public.consent_purpose) from public, anon, authenticated, service_role;
revoke all on function public.request_account_export() from public, anon, authenticated, service_role;
revoke all on function public.request_account_deletion() from public, anon, authenticated, service_role;
revoke all on function public.cancel_account_deletion() from public, anon, authenticated, service_role;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated, service_role;
grant usage on schema private to authenticated, service_role;
grant execute on function private.has_current_consent(uuid, public.consent_purpose) to authenticated;
grant execute on function private.is_active_account(uuid) to authenticated;
grant execute on function private.is_direct_mentor(uuid, uuid) to authenticated;
grant execute on function private.is_directly_related(uuid, uuid) to authenticated;
grant execute on function private.begin_pending_registration(uuid, public.claim_kind, text) to service_role;
grant execute on function private.complete_onboarding(text, text, text, text, text, boolean, boolean, boolean) to authenticated;
grant execute on function private.withdraw_consent(public.consent_purpose) to authenticated;
grant execute on function public.begin_pending_registration(uuid, public.claim_kind, text) to service_role;
grant execute on function public.complete_onboarding(text, text, text, text, text, boolean, boolean, boolean) to authenticated;
grant execute on function public.withdraw_consent(public.consent_purpose) to authenticated;
grant execute on function public.request_account_export() to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

drop function if exists public.claim_mentorship_invitation(text, uuid);
drop function if exists public.accept_mentorship_invitation(uuid);

create index access_codes_expiry on public.access_codes(expires_at) where revoked_at is null;
create index access_codes_created_by on public.access_codes(created_by);
create index mentorship_invitations_expiry on public.mentorship_invitations(expires_at) where revoked_at is null and accepted_at is null;
