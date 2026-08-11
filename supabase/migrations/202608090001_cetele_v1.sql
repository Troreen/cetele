-- Çetele V1 schema. Apply to a disposable hosted Supabase project first.
-- Hosted execution and RLS verification are intentionally not claimed by this repository alone.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.habit_mode as enum ('binary', 'quantitative');
create type public.definition_visibility as enum ('private', 'shared');
create type public.relationship_status as enum ('active', 'ended');
create type public.assignment_status as enum ('active', 'ended', 'void');
create type public.attention_state as enum ('open', 'followed_up', 'invalidated');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  timezone text not null default 'Europe/Stockholm',
  locale text not null default 'tr',
  group_name text,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  created_at timestamptz not null default now()
);

create table public.mentorship_invitations (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  invitee_email text not null,
  invitee_name text not null,
  invited_user_id uuid references auth.users(id),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_pending_invitation on public.mentorship_invitations(mentor_id, lower(invitee_email))
where accepted_at is null and cancelled_at is null;
create index invitations_by_mentor on public.mentorship_invitations(mentor_id);
create index invitations_by_invited_user on public.mentorship_invitations(invited_user_id);

create table public.mentorship_relationships (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  student_id uuid not null references public.profiles(id),
  status public.relationship_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check (mentor_id <> student_id)
);
create unique index one_active_direct_mentor on public.mentorship_relationships(student_id) where status = 'active';
create index mentorship_by_mentor on public.mentorship_relationships(mentor_id, status, student_id);
create index mentorship_by_student on public.mentorship_relationships(student_id, status, mentor_id);

create table public.habit_definitions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  creator_name text not null,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  guide text not null default '',
  why_it_matters text not null default '',
  completion_definition text not null,
  practical_tips text not null default '',
  resources jsonb not null default '[]'::jsonb,
  mode public.habit_mode not null default 'binary',
  default_target numeric check (default_target is null or default_target > 0),
  visibility public.definition_visibility not null default 'private',
  source_definition_id uuid references public.habit_definitions(id),
  source_creator_id uuid references public.profiles(id),
  source_creator_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((mode = 'binary' and default_target is null) or mode = 'quantitative')
);
create index definitions_by_author on public.habit_definitions(author_id);
create index shared_definitions on public.habit_definitions(visibility, author_id) where visibility = 'shared';
create index definitions_by_source on public.habit_definitions(source_definition_id);
create index definitions_by_source_creator on public.habit_definitions(source_creator_id);

create table public.habit_assignments (
  id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.habit_definitions(id),
  student_id uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  target numeric check (target is null or target > 0),
  status public.assignment_status not null default 'active',
  intervention_for_mentor_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  correction_reason text
);
create index assignments_by_student on public.habit_assignments(student_id, status);
create index assignments_by_definition on public.habit_assignments(definition_id);
create index assignments_by_assigner on public.habit_assignments(assigned_by);
create index assignments_by_intervention_mentor on public.habit_assignments(intervention_for_mentor_id);
create unique index one_active_definition_assignment on public.habit_assignments(definition_id, student_id) where status = 'active';

create table public.assignment_preferences (
  assignment_id uuid primary key references public.habit_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id),
  icon text not null default 'book',
  accent text not null default '#55a7ff' check (accent ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0
);
create index preferences_by_student_order on public.assignment_preferences(student_id, sort_order);

create table public.completions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.habit_assignments(id),
  student_id uuid not null references public.profiles(id),
  completion_date date not null,
  amount numeric check (amount is null or amount > 0),
  retrospective boolean not null default false,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, completion_date)
);
create index completions_by_student_date on public.completions(student_id, completion_date desc);
create index completions_by_assignment_date on public.completions(assignment_id, completion_date desc);

create table public.excused_days (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  assignment_id uuid references public.habit_assignments(id),
  excuse_date date not null,
  granted_by uuid not null references public.profiles(id),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create unique index unique_assignment_excuse on public.excused_days(student_id, assignment_id, excuse_date) nulls not distinct;
create index excuses_by_student_date on public.excused_days(student_id, excuse_date desc);
create index excuses_by_assignment on public.excused_days(assignment_id);
create index excuses_by_grantor on public.excused_days(granted_by);

create table public.attention_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  trigger_assignment_id uuid not null references public.habit_assignments(id),
  contributing_assignment_ids uuid[] not null,
  responsible_mentor_id uuid not null references public.profiles(id),
  first_missed_date date not null,
  second_missed_date date not null,
  state public.attention_state not null default 'open',
  created_at timestamptz not null default now(),
  invalidated_at timestamptz,
  check (second_missed_date = first_missed_date + 1)
);
create unique index one_attention_per_student_day on public.attention_items(student_id, second_missed_date);
create index attention_open_by_student on public.attention_items(student_id, second_missed_date) where state = 'open';
create index attention_by_responsible_state on public.attention_items(responsible_mentor_id, state, created_at desc);
create index attention_by_student on public.attention_items(student_id, created_at desc);
create index attention_by_trigger_assignment on public.attention_items(trigger_assignment_id);

create table public.followups (
  id uuid primary key default gen_random_uuid(),
  attention_id uuid not null references public.attention_items(id),
  actor_id uuid not null references public.profiles(id),
  responsible_mentor_id uuid not null references public.profiles(id),
  private_note text not null default '' check (char_length(private_note) <= 1000),
  created_at timestamptz not null default now()
);
create index followups_by_attention on public.followups(attention_id, created_at desc);
create index followups_by_actor on public.followups(actor_id, created_at desc);
create index followups_by_responsible_mentor on public.followups(responsible_mentor_id);

create table public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id),
  review_date date not null,
  reviewed_at timestamptz not null default now(),
  unique (mentor_id, review_date)
);
create index reviews_by_mentor_date on public.daily_reviews(mentor_id, review_date desc);

create table public.reminder_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  student_enabled boolean not null default true,
  student_time time not null default '20:30',
  mentor_enabled boolean not null default true,
  mentor_time time not null default '21:00',
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id),
  subject_id uuid references public.profiles(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_by_subject_date on public.audit_events(subject_id, created_at desc);
create index audit_by_actor_date on public.audit_events(actor_id, created_at desc);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_display_name text;
begin
  v_display_name := btrim(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1)));
  if char_length(v_display_name) < 2 then v_display_name := 'Çetele kullanıcısı'; end if;
  insert into public.profiles(id, display_name)
  values (new.id, v_display_name)
  on conflict (id) do nothing;
  insert into public.reminder_preferences(user_id) values (new.id)
  on conflict (user_id) do nothing;
  if coalesce(new.raw_user_meta_data ->> 'invitation_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    update public.mentorship_invitations
    set invited_user_id = new.id
    where id = (new.raw_user_meta_data ->> 'invitation_id')::uuid
      and lower(invitee_email) = lower(coalesce(new.email, ''))
      and invited_user_id is null and accepted_at is null and cancelled_at is null;
  end if;
  return new;
end;
$$;
create trigger auth_user_profile after insert on auth.users for each row execute function public.handle_new_auth_user();
revoke all on function public.handle_new_auth_user() from public;

create or replace function private.is_direct_mentor(viewer uuid, subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mentorship_relationships r
    where r.mentor_id = viewer and r.student_id = subject and r.status = 'active'
  );
$$;

create or replace function private.is_mentor_above(viewer uuid, subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  with recursive ancestry(mentor_id, student_id, path) as (
    select r.mentor_id, r.student_id, array[r.student_id, r.mentor_id]
    from public.mentorship_relationships r
    where r.student_id = subject and r.status = 'active'
    union all
    select r.mentor_id, r.student_id, a.path || r.mentor_id
    from public.mentorship_relationships r
    join ancestry a on r.student_id = a.mentor_id
    where r.status = 'active' and not r.mentor_id = any(a.path)
  )
  select exists (select 1 from ancestry where mentor_id = viewer);
$$;

create or replace function private.same_tree(left_user uuid, right_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select left_user = right_user
    or private.is_mentor_above(left_user, right_user)
    or private.is_mentor_above(right_user, left_user)
    or exists (
      select 1 from public.profiles p
      where private.is_mentor_above(p.id, left_user) and private.is_mentor_above(p.id, right_user)
    );
$$;

revoke all on function private.is_direct_mentor(uuid, uuid) from public;
revoke all on function private.is_mentor_above(uuid, uuid) from public;
revoke all on function private.same_tree(uuid, uuid) from public;

create or replace function private.is_current_user_mentor_above(subject uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_mentor_above((select auth.uid()), subject);
$$;

create or replace function private.is_in_current_user_tree(other_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.same_tree((select auth.uid()), other_user);
$$;

revoke all on function private.is_current_user_mentor_above(uuid) from public;
revoke all on function private.is_in_current_user_tree(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_current_user_mentor_above(uuid) to authenticated;
grant execute on function private.is_in_current_user_tree(uuid) to authenticated;

create or replace function public.reject_mentorship_cycle()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if private.is_mentor_above(new.student_id, new.mentor_id) then
    raise exception 'Mentorship relationship would create a cycle';
  end if;
  return new;
end;
$$;
create trigger mentorship_no_cycle before insert or update on public.mentorship_relationships for each row execute function public.reject_mentorship_cycle();
revoke all on function public.reject_mentorship_cycle() from public;

create or replace function public.missed_assignment_ids(p_student_id uuid, p_first_date date, p_second_date date)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(a.id order by a.created_at, a.id), '{}'::uuid[])
  from public.habit_assignments a
  join public.profiles student_profile on student_profile.id = a.student_id
  where a.student_id = p_student_id and a.status = 'active'
    and (a.created_at at time zone student_profile.timezone)::date <= p_first_date
    and not exists (select 1 from public.completions c where c.assignment_id = a.id and c.completion_date = p_first_date)
    and not exists (select 1 from public.completions c where c.assignment_id = a.id and c.completion_date = p_second_date)
    and not exists (
      select 1 from public.excused_days e
      where e.student_id = p_student_id and e.excuse_date = p_first_date
        and (e.assignment_id is null or e.assignment_id = a.id)
    )
    and not exists (
      select 1 from public.excused_days e
      where e.student_id = p_student_id and e.excuse_date = p_second_date
        and (e.assignment_id is null or e.assignment_id = a.id)
    );
$$;
revoke all on function public.missed_assignment_ids(uuid, date, date) from public;

create or replace function public.record_completion(p_assignment_id uuid, p_date date, p_amount numeric, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid;
  v_mode public.habit_mode;
  v_timezone text;
  v_today date;
  v_attention record;
  v_remaining uuid[];
begin
  select a.student_id, d.mode, p.timezone into v_student, v_mode, v_timezone
  from public.habit_assignments a
  join public.habit_definitions d on d.id = a.definition_id
  join public.profiles p on p.id = a.student_id
  where a.id = p_assignment_id and a.status = 'active';
  if v_student is null or v_student <> auth.uid() then raise exception 'Not authorized for assignment'; end if;
  v_today := (now() at time zone v_timezone)::date;
  if p_date not in (v_today, v_today - 1) then raise exception 'Completion date is locked'; end if;
  if v_mode = 'quantitative' and coalesce(p_amount, 0) <= 0 then raise exception 'Meaningful quantitative amount required'; end if;
  insert into public.completions(assignment_id, student_id, completion_date, amount, retrospective, note)
  values (p_assignment_id, v_student, p_date, p_amount, p_date = v_today - 1, coalesce(p_note, ''))
  on conflict (assignment_id, completion_date) do update set amount = excluded.amount, note = excluded.note, retrospective = excluded.retrospective, updated_at = now();
  for v_attention in
    select id, first_missed_date, second_missed_date
    from public.attention_items
    where student_id = v_student and state = 'open' and p_date in (first_missed_date, second_missed_date)
    for update
  loop
    v_remaining := public.missed_assignment_ids(v_student, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) = 0 then
      update public.attention_items set state = 'invalidated', invalidated_at = now() where id = v_attention.id;
    else
      update public.attention_items
      set trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining
      where id = v_attention.id;
    end if;
  end loop;
end;
$$;

create or replace function public.record_follow_up(p_attention_id uuid, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_subject uuid; v_responsible uuid;
begin
  select student_id, responsible_mentor_id into v_subject, v_responsible from public.attention_items where id = p_attention_id and state = 'open' for update;
  if v_subject is null or not (auth.uid() = v_responsible or private.is_mentor_above(auth.uid(), v_subject)) then raise exception 'Not authorized for follow-up'; end if;
  insert into public.followups(attention_id, actor_id, responsible_mentor_id, private_note) values (p_attention_id, auth.uid(), v_responsible, coalesce(p_note, ''));
  update public.attention_items set state = 'followed_up' where id = p_attention_id;
  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id, details)
  values (auth.uid(), v_subject, 'follow_up_recorded', 'attention_item', p_attention_id, jsonb_build_object('responsible_mentor_id', v_responsible, 'intervention', auth.uid() <> v_responsible));
end;
$$;

create or replace function public.remove_completion(p_assignment_id uuid, p_date date)
returns void language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_timezone text; v_today date; v_attention record; v_remaining uuid[];
begin
  select a.student_id, p.timezone into v_student, v_timezone
  from public.habit_assignments a join public.profiles p on p.id = a.student_id
  where a.id = p_assignment_id and a.status = 'active';
  if v_student is null or v_student <> auth.uid() then raise exception 'Not authorized for assignment'; end if;
  v_today := (now() at time zone v_timezone)::date;
  if p_date not in (v_today, v_today - 1) then raise exception 'Completion date is locked'; end if;
  delete from public.completions where assignment_id = p_assignment_id and student_id = auth.uid() and completion_date = p_date;
  for v_attention in
    select id, first_missed_date, second_missed_date from public.attention_items
    where student_id = v_student and state in ('open', 'invalidated') and p_date in (first_missed_date, second_missed_date)
    for update
  loop
    v_remaining := public.missed_assignment_ids(v_student, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) > 0 then
      update public.attention_items set state = 'open', invalidated_at = null, trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining where id = v_attention.id;
    end if;
  end loop;
end;
$$;

create or replace function public.end_habit_assignment(p_assignment_id uuid, p_reason text)
returns public.assignment_status language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_status public.assignment_status; v_attention record; v_remaining uuid[];
begin
  select student_id into v_student from public.habit_assignments where id = p_assignment_id and status = 'active' for update;
  if v_student is null or not private.is_direct_mentor(auth.uid(), v_student) then raise exception 'Direct mentor required for assignment correction'; end if;
  select case when exists (select 1 from public.completions where assignment_id = p_assignment_id) then 'ended'::public.assignment_status else 'void'::public.assignment_status end into v_status;
  update public.habit_assignments set status = v_status, ended_at = now(), correction_reason = p_reason where id = p_assignment_id;
  for v_attention in
    select id, first_missed_date, second_missed_date
    from public.attention_items
    where student_id = v_student and state = 'open' and p_assignment_id = any(contributing_assignment_ids)
    for update
  loop
    v_remaining := public.missed_assignment_ids(v_student, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) = 0 then
      update public.attention_items set state = 'invalidated', invalidated_at = now() where id = v_attention.id;
    else
      update public.attention_items
      set trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining
      where id = v_attention.id;
    end if;
  end loop;
  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id, details)
  values (auth.uid(), v_student, 'assignment_corrected', 'habit_assignment', p_assignment_id, jsonb_build_object('status', v_status, 'reason', p_reason));
  return v_status;
end;
$$;

create or replace function public.assign_habit_definition(p_definition_id uuid, p_student_id uuid, p_target numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_assignment_id uuid;
  v_responsible_mentor uuid;
  v_mode public.habit_mode;
  v_default_target numeric;
  v_target numeric;
begin
  select r.mentor_id into v_responsible_mentor
  from public.mentorship_relationships r
  where r.student_id = p_student_id and r.status = 'active';
  if v_responsible_mentor is null
    or not (auth.uid() = v_responsible_mentor or private.is_mentor_above(auth.uid(), p_student_id)) then
    raise exception 'Not authorized to assign this student';
  end if;

  select d.mode, d.default_target into v_mode, v_default_target
  from public.habit_definitions d
  where d.id = p_definition_id
    and (d.author_id = auth.uid() or (d.visibility = 'shared' and private.same_tree(auth.uid(), d.author_id)));
  if v_mode is null then raise exception 'Habit definition is not available'; end if;

  v_target := case when v_mode = 'binary' then null else coalesce(p_target, v_default_target) end;
  if v_mode = 'quantitative' and coalesce(v_target, 0) <= 0 then raise exception 'Quantitative target required'; end if;

  insert into public.habit_assignments(definition_id, student_id, assigned_by, target, intervention_for_mentor_id)
  values (p_definition_id, p_student_id, auth.uid(), v_target,
    case when auth.uid() = v_responsible_mentor then null else v_responsible_mentor end)
  returning id into v_assignment_id;

  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id, details)
  values (
    auth.uid(), p_student_id,
    case when auth.uid() = v_responsible_mentor then 'habit_assigned' else 'senior_assignment_intervention' end,
    'habit_assignment', v_assignment_id,
    jsonb_build_object('responsible_mentor_id', v_responsible_mentor, 'definition_id', p_definition_id)
  );
  return v_assignment_id;
end;
$$;

create or replace function public.grant_excused_day(p_student_id uuid, p_assignment_id uuid, p_date date, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_excuse_id uuid;
  v_responsible_mentor uuid;
  v_attention record;
  v_remaining uuid[];
begin
  select r.mentor_id into v_responsible_mentor
  from public.mentorship_relationships r
  where r.student_id = p_student_id and r.status = 'active';
  if v_responsible_mentor is null or auth.uid() <> v_responsible_mentor then
    raise exception 'Direct mentor required to excuse this student';
  end if;
  if p_assignment_id is not null and not exists (
    select 1 from public.habit_assignments a
    where a.id = p_assignment_id and a.student_id = p_student_id and a.status = 'active'
  ) then raise exception 'Assignment does not belong to the student'; end if;

  insert into public.excused_days(student_id, assignment_id, excuse_date, granted_by, note)
  values (p_student_id, p_assignment_id, p_date, auth.uid(), coalesce(p_note, ''))
  on conflict (student_id, assignment_id, excuse_date) do update
    set granted_by = excluded.granted_by, note = excluded.note
  returning id into v_excuse_id;

  for v_attention in
    select id, first_missed_date, second_missed_date
    from public.attention_items
    where student_id = p_student_id and state = 'open' and p_date in (first_missed_date, second_missed_date)
    for update
  loop
    v_remaining := public.missed_assignment_ids(p_student_id, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) = 0 then
      update public.attention_items set state = 'invalidated', invalidated_at = now() where id = v_attention.id;
    else
      update public.attention_items
      set trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining
      where id = v_attention.id;
    end if;
  end loop;

  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id, details)
  values (
    auth.uid(), p_student_id,
    'excused_day_granted',
    'excused_day', v_excuse_id,
    jsonb_build_object('responsible_mentor_id', v_responsible_mentor, 'assignment_id', p_assignment_id, 'date', p_date)
  );
  return v_excuse_id;
end;
$$;

revoke all on function public.end_habit_assignment(uuid, text) from public;
grant execute on function public.end_habit_assignment(uuid, text) to authenticated;
revoke all on function public.assign_habit_definition(uuid, uuid, numeric) from public;
revoke all on function public.grant_excused_day(uuid, uuid, date, text) from public;
grant execute on function public.assign_habit_definition(uuid, uuid, numeric) to authenticated;
grant execute on function public.grant_excused_day(uuid, uuid, date, text) to authenticated;

create or replace function public.record_daily_review()
returns void language plpgsql security definer set search_path = '' as $$
declare v_today date;
begin
  select (now() at time zone p.timezone)::date into v_today from public.profiles p where p.id = auth.uid();
  if v_today is null then raise exception 'Authenticated profile required'; end if;
  if not exists (select 1 from public.mentorship_relationships r where r.mentor_id = auth.uid() and r.status = 'active') then
    raise exception 'An active direct student is required';
  end if;
  insert into public.daily_reviews(mentor_id, review_date) values (auth.uid(), v_today)
  on conflict (mentor_id, review_date) do nothing;
end;
$$;

create or replace function public.reconcile_my_attention()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_created integer := 0;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid()) then raise exception 'Authenticated profile required'; end if;
  insert into public.attention_items(
    student_id, trigger_assignment_id, contributing_assignment_ids,
    responsible_mentor_id, first_missed_date, second_missed_date
  )
  select r.student_id, candidate.ids[1], candidate.ids, r.mentor_id, candidate.first_date, candidate.second_date
  from public.mentorship_relationships r
  join public.profiles student_profile on student_profile.id = r.student_id
  cross join lateral (
    select day.first_date, day.first_date + 1 as second_date, public.missed_assignment_ids(r.student_id, day.first_date, day.first_date + 1) as ids
    from generate_series(
      greatest((now() at time zone student_profile.timezone)::date - 183,
        coalesce((select min(a.created_at at time zone student_profile.timezone)::date from public.habit_assignments a where a.student_id = r.student_id), (now() at time zone student_profile.timezone)::date - 2)),
      (now() at time zone student_profile.timezone)::date - 2,
      interval '1 day'
    ) as generated(first_date)
    cross join lateral (select generated.first_date::date as first_date) day
    where cardinality(public.missed_assignment_ids(r.student_id, day.first_date, day.first_date + 1)) > 0
      and day.first_date + 1 > coalesce((select max(previous.second_missed_date) from public.attention_items previous where previous.student_id = r.student_id and previous.state = 'followed_up'), date '0001-01-01')
      and not exists (
        select 1 from public.attention_items existing
        where existing.student_id = r.student_id
          and existing.second_missed_date = day.first_date + 1
          and existing.state <> 'invalidated'
      )
    order by day.first_date desc
    limit 1
  ) candidate
  where r.status = 'active'
    and (r.mentor_id = auth.uid() or private.is_mentor_above(auth.uid(), r.student_id))
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

create or replace function public.accept_mentorship_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_mentor uuid; v_email text; v_accepted_at timestamptz; v_existing_mentor uuid;
begin
  select mentor_id, lower(invitee_email), accepted_at into v_mentor, v_email, v_accepted_at
  from public.mentorship_invitations
  where id = p_invitation_id and invited_user_id = auth.uid() and cancelled_at is null
  for update;
  if v_mentor is null or v_email <> lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'Valid invitation required'; end if;
  select mentor_id into v_existing_mentor
  from public.mentorship_relationships
  where student_id = auth.uid() and status = 'active';
  if v_accepted_at is not null and v_existing_mentor = v_mentor then return; end if;
  if v_existing_mentor is not null then raise exception 'Student already has an active mentor'; end if;
  insert into public.mentorship_relationships(mentor_id, student_id) values (v_mentor, auth.uid());
  update public.mentorship_invitations set accepted_at = now() where id = p_invitation_id;
  insert into public.audit_events(actor_id, subject_id, event_type, entity_type, entity_id)
  values (auth.uid(), auth.uid(), 'mentorship_invitation_accepted', 'mentorship_invitation', p_invitation_id);
end;
$$;

revoke all on function public.record_completion(uuid, date, numeric, text) from public;
revoke all on function public.record_follow_up(uuid, text) from public;
revoke all on function public.remove_completion(uuid, date) from public;
revoke all on function public.record_daily_review() from public;
revoke all on function public.reconcile_my_attention() from public;
revoke all on function public.accept_mentorship_invitation(uuid) from public;
grant execute on function public.record_completion(uuid, date, numeric, text) to authenticated;
grant execute on function public.record_follow_up(uuid, text) to authenticated;
grant execute on function public.remove_completion(uuid, date) to authenticated;
grant execute on function public.record_daily_review() to authenticated;
grant execute on function public.reconcile_my_attention() to authenticated;
grant execute on function public.accept_mentorship_invitation(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.mentorship_invitations enable row level security;
alter table public.mentorship_relationships enable row level security;
alter table public.habit_definitions enable row level security;
alter table public.habit_assignments enable row level security;
alter table public.assignment_preferences enable row level security;
alter table public.completions enable row level security;
alter table public.excused_days enable row level security;
alter table public.attention_items enable row level security;
alter table public.followups enable row level security;
alter table public.daily_reviews enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.audit_events enable row level security;

revoke all privileges on table
  public.profiles,
  public.mentorship_invitations,
  public.mentorship_relationships,
  public.habit_definitions,
  public.habit_assignments,
  public.assignment_preferences,
  public.completions,
  public.excused_days,
  public.attention_items,
  public.followups,
  public.daily_reviews,
  public.reminder_preferences,
  public.audit_events
from public, anon, authenticated;
revoke all privileges on sequence public.audit_events_id_seq from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on table
  public.profiles,
  public.mentorship_invitations,
  public.mentorship_relationships,
  public.habit_definitions,
  public.habit_assignments,
  public.assignment_preferences,
  public.completions,
  public.excused_days,
  public.attention_items,
  public.followups,
  public.daily_reviews,
  public.reminder_preferences,
  public.audit_events
to authenticated;
grant insert on table public.habit_definitions to authenticated;
grant insert, update on table public.assignment_preferences, public.reminder_preferences to authenticated;
grant update on table public.profiles to authenticated;

create policy profiles_read_upward on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_current_user_mentor_above(id));
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy invitations_read_parties on public.mentorship_invitations for select to authenticated using (mentor_id = (select auth.uid()) or invited_user_id = (select auth.uid()));
create policy relationships_read_upward on public.mentorship_relationships for select to authenticated using (student_id = (select auth.uid()) or mentor_id = (select auth.uid()) or private.is_current_user_mentor_above(student_id));
create policy definitions_read on public.habit_definitions for select to authenticated using (
  author_id = (select auth.uid())
  or (visibility = 'shared' and private.is_in_current_user_tree(author_id))
  or exists (
    select 1 from public.habit_assignments a
    where a.definition_id = habit_definitions.id
      and (a.student_id = (select auth.uid()) or private.is_current_user_mentor_above(a.student_id))
  )
);
create policy definitions_insert_mentors on public.habit_definitions for insert to authenticated with check (
  author_id = (select auth.uid()) and exists (select 1 from public.mentorship_relationships r where r.mentor_id = (select auth.uid()) and r.status = 'active')
);
create policy definitions_update_mentors on public.habit_definitions for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()) and exists (select 1 from public.mentorship_relationships r where r.mentor_id = (select auth.uid()) and r.status = 'active'));
create policy assignments_read_upward on public.habit_assignments for select to authenticated using (student_id = (select auth.uid()) or private.is_current_user_mentor_above(student_id));
create policy preferences_subject_all on public.assignment_preferences for all to authenticated
using (student_id = (select auth.uid()) and exists (select 1 from public.habit_assignments a where a.id = assignment_id and a.student_id = (select auth.uid())))
with check (student_id = (select auth.uid()) and exists (select 1 from public.habit_assignments a where a.id = assignment_id and a.student_id = (select auth.uid())));
create policy completions_read_upward on public.completions for select to authenticated using (student_id = (select auth.uid()) or private.is_current_user_mentor_above(student_id));
create policy excuses_read_upward on public.excused_days for select to authenticated using (student_id = (select auth.uid()) or private.is_current_user_mentor_above(student_id));
create policy attention_mentor_only on public.attention_items for select to authenticated using (private.is_current_user_mentor_above(student_id));
create policy followups_writer_and_above on public.followups for select to authenticated using (actor_id = (select auth.uid()) or private.is_current_user_mentor_above(actor_id));
create policy reviews_writer_and_above on public.daily_reviews for select to authenticated using (mentor_id = (select auth.uid()) or private.is_current_user_mentor_above(mentor_id));
create policy reviews_write_self on public.daily_reviews for insert to authenticated with check (mentor_id = (select auth.uid()) and exists (select 1 from public.mentorship_relationships r where r.mentor_id = (select auth.uid()) and r.status = 'active'));
create policy reviews_update_self on public.daily_reviews for update to authenticated using (mentor_id = (select auth.uid())) with check (mentor_id = (select auth.uid()));
create policy reminders_self on public.reminder_preferences for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy audit_actor_and_above on public.audit_events for select to authenticated using (actor_id = (select auth.uid()) or (subject_id is not null and private.is_current_user_mentor_above(subject_id)));

-- No student-facing attention policy or peer aggregate view exists in conservative V1.
-- Relationship transfer is also deliberately absent: second active mentors are rejected.
