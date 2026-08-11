-- PR #5 review hardening. Apply after 202608090003_post_v1_upgrade_fixes.sql.

alter table public.profiles
  add column if not exists show_month_labels boolean not null default true,
  add column if not exists show_day_labels boolean not null default true;

alter table public.reminder_preferences
  add column if not exists habit_reminders jsonb not null default '{}'::jsonb;

update public.reminder_preferences rp
set habit_reminders = coalesce((
  select jsonb_object_agg(a.id::text, jsonb_build_object('enabled', rp.student_enabled, 'time', to_char(rp.student_time, 'HH24:MI')))
  from public.habit_assignments a
  where a.student_id = rp.user_id and a.status = 'active'
), '{}'::jsonb)
where rp.habit_reminders = '{}'::jsonb;

alter table public.reminder_preferences
  drop constraint if exists reminder_preferences_habit_reminders_object_check;
alter table public.reminder_preferences
  add constraint reminder_preferences_habit_reminders_object_check
  check (jsonb_typeof(habit_reminders) = 'object');

-- Keep direct table mutations narrower than the authenticated Server Action surface.
revoke update on table public.profiles from authenticated;
grant update(theme, show_month_labels, show_day_labels) on table public.profiles to authenticated;
revoke insert on table public.habit_definitions from authenticated;

drop policy if exists definitions_read on public.habit_definitions;
create policy definitions_read on public.habit_definitions for select to authenticated using (
  author_id = (select auth.uid())
  or (
    visibility = 'shared'
    and exists (
      select 1 from public.mentorship_relationships r
      where r.mentor_id = (select auth.uid()) and r.status = 'active'
    )
    and private.is_in_current_user_tree(author_id)
  )
  or exists (
    select 1 from public.habit_assignments a
    where a.definition_id = habit_definitions.id
      and a.status in ('active', 'ended')
      and (a.student_id = (select auth.uid()) or private.is_current_user_mentor_above(a.student_id))
  )
);

drop policy if exists assignments_read_upward on public.habit_assignments;
create policy assignments_read_upward on public.habit_assignments for select to authenticated using (
  status in ('active', 'ended')
  and (student_id = (select auth.uid()) or private.is_current_user_mentor_above(student_id))
);

create or replace function public.create_habit_definition(
  p_name text,
  p_description text,
  p_guide text,
  p_why_it_matters text,
  p_completion_definition text,
  p_practical_tips text,
  p_mode public.habit_mode,
  p_default_target numeric,
  p_visibility public.definition_visibility
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_definition_id uuid;
  v_creator_name text;
  v_name text := btrim(coalesce(p_name, ''));
  v_completion_definition text := btrim(coalesce(p_completion_definition, ''));
begin
  if (select auth.uid()) is null then raise exception 'Authenticated profile required'; end if;
  if not exists (
    select 1 from public.mentorship_relationships r
    where r.mentor_id = (select auth.uid()) and r.status = 'active'
  ) then raise exception 'An active direct student is required'; end if;

  select p.display_name into v_creator_name
  from public.profiles p where p.id = (select auth.uid());
  if v_creator_name is null then raise exception 'Authenticated profile required'; end if;

  if char_length(v_name) not between 1 and 100
    or char_length(coalesce(p_description, '')) > 240
    or char_length(coalesce(p_guide, '')) > 4000
    or char_length(coalesce(p_why_it_matters, '')) > 1000
    or char_length(v_completion_definition) not between 1 and 1000
    or char_length(coalesce(p_practical_tips, '')) > 1000
    or p_mode is null
    or p_visibility is null then
    raise exception 'Valid Habit Definition required';
  end if;
  if p_mode = 'binary' and p_default_target is not null then
    raise exception 'Binary Habit Definition target must be null';
  end if;
  if p_default_target is not null and p_default_target <= 0 then
    raise exception 'Positive default target required';
  end if;

  insert into public.habit_definitions(
    author_id, creator_name, name, description, guide, why_it_matters,
    completion_definition, practical_tips, mode, default_target, visibility
  )
  values ((select auth.uid()), v_creator_name, v_name, coalesce(p_description, ''),
    coalesce(p_guide, ''), coalesce(p_why_it_matters, ''), v_completion_definition,
    coalesce(p_practical_tips, ''), p_mode, p_default_target, p_visibility)
  returning id into v_definition_id;
  return v_definition_id;
end;
$$;

create or replace function public.adopt_habit_definition(p_source_definition_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_definition_id uuid;
  v_creator_name text;
  v_source public.habit_definitions%rowtype;
begin
  if (select auth.uid()) is null or p_source_definition_id is null then
    raise exception 'Authenticated Shared Habit adoption required';
  end if;
  if not exists (
    select 1 from public.mentorship_relationships r
    where r.mentor_id = (select auth.uid()) and r.status = 'active'
  ) then raise exception 'An active direct student is required'; end if;

  select p.display_name into v_creator_name
  from public.profiles p where p.id = (select auth.uid());
  if v_creator_name is null then raise exception 'Authenticated profile required'; end if;

  select d.* into v_source
  from public.habit_definitions d
  where d.id = p_source_definition_id
    and d.visibility = 'shared'
    and private.is_in_current_user_tree(d.author_id);
  if v_source.id is null then raise exception 'Shared Habit Definition is not available'; end if;

  insert into public.habit_definitions(
    author_id, creator_name, name, description, guide, why_it_matters,
    completion_definition, practical_tips, resources, mode, default_target, visibility,
    source_definition_id, source_creator_id, source_creator_name
  )
  values ((select auth.uid()), v_creator_name, v_source.name, v_source.description,
    v_source.guide, v_source.why_it_matters, v_source.completion_definition,
    v_source.practical_tips, v_source.resources, v_source.mode, v_source.default_target,
    'private', v_source.id, v_source.author_id, v_source.creator_name)
  returning id into v_definition_id;
  return v_definition_id;
end;
$$;

update public.completions
set amount = greatest(1, round(amount))
where amount is not null and amount <> trunc(amount);

alter table public.completions
  drop constraint if exists completions_amount_integer_check;
alter table public.completions
  add constraint completions_amount_integer_check
  check (amount is null or amount = trunc(amount));

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
  if v_student is null or v_student <> (select auth.uid()) then raise exception 'Not authorized for assignment'; end if;
  v_today := (now() at time zone v_timezone)::date;
  if p_date not in (v_today, v_today - 1) then raise exception 'Completion date is locked'; end if;
  if v_mode = 'binary' and p_amount is not null then raise exception 'Binary completion amount must be null'; end if;
  if v_mode = 'quantitative' and coalesce(p_amount, 0) <= 0 then raise exception 'Meaningful quantitative amount required'; end if;
  if p_amount is not null and p_amount <> trunc(p_amount) then raise exception 'Completion amount must be an integer'; end if;
  insert into public.completions(assignment_id, student_id, completion_date, amount, retrospective, note)
  values (p_assignment_id, v_student, p_date, p_amount, p_date = v_today - 1, coalesce(p_note, ''))
  on conflict (assignment_id, completion_date) do update
    set amount = excluded.amount, note = excluded.note,
        retrospective = excluded.retrospective, updated_at = now();
  for v_attention in
    select id, first_missed_date, second_missed_date
    from public.attention_items
    where student_id = v_student and state = 'open'
      and p_date in (first_missed_date, second_missed_date)
    for update
  loop
    v_remaining := public.missed_assignment_ids(v_student, v_attention.first_missed_date, v_attention.second_missed_date);
    if cardinality(v_remaining) = 0 then
      update public.attention_items set state = 'invalidated', invalidated_at = now()
      where id = v_attention.id;
    else
      update public.attention_items
      set trigger_assignment_id = v_remaining[1], contributing_assignment_ids = v_remaining
      where id = v_attention.id;
    end if;
  end loop;
end;
$$;

create or replace function public.reorder_habit_assignments(p_assignment_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if (select auth.uid()) is null or p_assignment_ids is null
    or cardinality(p_assignment_ids) = 0 or cardinality(p_assignment_ids) > 200
    or array_position(p_assignment_ids, null) is not null then
    raise exception 'Valid assignment order required';
  end if;
  select count(distinct assignment_id) into v_count
  from unnest(p_assignment_ids) as supplied(assignment_id);
  if v_count <> cardinality(p_assignment_ids) then raise exception 'Duplicate assignment IDs are not allowed'; end if;
  select count(*) into v_count
  from public.habit_assignments a
  where a.student_id = (select auth.uid()) and a.status = 'active';
  if v_count <> cardinality(p_assignment_ids) then
    raise exception 'Complete active assignment order required';
  end if;
  if exists (
    select 1
    from unnest(p_assignment_ids) as supplied(assignment_id)
    left join public.habit_assignments a
      on a.id = supplied.assignment_id
      and a.student_id = (select auth.uid())
      and a.status = 'active'
    where a.id is null
  ) then raise exception 'Active Habit Assignment for current user required'; end if;

  insert into public.assignment_preferences(assignment_id, student_id, sort_order)
  select supplied.assignment_id, (select auth.uid()), supplied.ordinality::integer - 1
  from unnest(p_assignment_ids) with ordinality as supplied(assignment_id, ordinality)
  on conflict (assignment_id) do update
    set student_id = excluded.student_id, sort_order = excluded.sort_order;
end;
$$;

revoke all on function public.create_habit_definition(text, text, text, text, text, text, public.habit_mode, numeric, public.definition_visibility) from public, anon, authenticated, service_role;
revoke all on function public.adopt_habit_definition(uuid) from public, anon, authenticated, service_role;
revoke all on function public.record_completion(uuid, date, numeric, text) from public, anon, authenticated, service_role;
revoke all on function public.reorder_habit_assignments(uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.create_habit_definition(text, text, text, text, text, text, public.habit_mode, numeric, public.definition_visibility) to authenticated;
grant execute on function public.adopt_habit_definition(uuid) to authenticated;
grant execute on function public.record_completion(uuid, date, numeric, text) to authenticated;
grant execute on function public.reorder_habit_assignments(uuid[]) to authenticated;
