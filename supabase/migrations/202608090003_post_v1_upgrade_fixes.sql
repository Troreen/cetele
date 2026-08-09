-- Additive upgrade fixes for projects that applied an earlier 202608090001_cetele_v1.sql.
-- Apply after 202608090002_manual_secure_invitations.sql. This migration is safe to run
-- when the equivalent function bodies were already present in the initial migration.

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

-- Supabase projects can carry explicit default EXECUTE grants for anon and
-- authenticated in addition to PostgreSQL's PUBLIC grant. Reset every V1
-- function explicitly, including trigger and policy helpers, before restoring
-- only the application-facing RPC surface.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated, service_role;
revoke all on function private.is_direct_mentor(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.is_mentor_above(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.same_tree(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.is_current_user_mentor_above(uuid) from public, anon, authenticated, service_role;
revoke all on function private.is_in_current_user_tree(uuid) from public, anon, authenticated, service_role;
revoke all on function public.reject_mentorship_cycle() from public, anon, authenticated, service_role;
revoke all on function public.missed_assignment_ids(uuid, date, date) from public, anon, authenticated, service_role;
revoke all on function public.record_completion(uuid, date, numeric, text) from public, anon, authenticated, service_role;
revoke all on function public.record_follow_up(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.remove_completion(uuid, date) from public, anon, authenticated, service_role;
revoke all on function public.end_habit_assignment(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.assign_habit_definition(uuid, uuid, numeric) from public, anon, authenticated, service_role;
revoke all on function public.grant_excused_day(uuid, uuid, date, text) from public, anon, authenticated, service_role;
revoke all on function public.record_daily_review() from public, anon, authenticated, service_role;
revoke all on function public.reconcile_my_attention() from public, anon, authenticated, service_role;
revoke all on function public.claim_mentorship_invitation(text, uuid) from public, anon, authenticated, service_role;

grant execute on function private.is_current_user_mentor_above(uuid) to authenticated;
grant execute on function private.is_in_current_user_tree(uuid) to authenticated;
grant execute on function public.record_completion(uuid, date, numeric, text) to authenticated;
grant execute on function public.record_follow_up(uuid, text) to authenticated;
grant execute on function public.remove_completion(uuid, date) to authenticated;
grant execute on function public.end_habit_assignment(uuid, text) to authenticated;
grant execute on function public.assign_habit_definition(uuid, uuid, numeric) to authenticated;
grant execute on function public.grant_excused_day(uuid, uuid, date, text) to authenticated;
grant execute on function public.record_daily_review() to authenticated;
grant execute on function public.reconcile_my_attention() to authenticated;
grant execute on function public.claim_mentorship_invitation(text, uuid) to service_role;
grant select on table public.audit_events to authenticated;
