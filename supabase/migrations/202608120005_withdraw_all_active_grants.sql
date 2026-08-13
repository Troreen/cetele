-- Withdrawal is purpose-wide: every still-effective grant is withdrawn so an
-- older grant can never revive after repeated testing or future re-consent.
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
    insert into public.account_requests(user_id, kind, recovery_until)
    values (v_user, 'deletion', now() + interval '7 days') on conflict do nothing;
  end if;
end;
$$;
