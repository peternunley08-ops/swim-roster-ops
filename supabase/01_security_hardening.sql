-- =====================================================================
--  Swim Roster — Phase 0 security hardening (run ONCE in Supabase SQL editor)
--  Closes two CRITICAL privilege-escalation paths to "owner".
--  Safe to run on the existing project; it only replaces policies/functions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- C1. An instructor could self-promote to owner because "profiles self
--     update" had no column restriction. Two layers of defense:
--       (a) RLS WITH CHECK pins role + active to their current values for
--           self-updates (so self can only edit username), AND
--       (b) a BEFORE UPDATE trigger that hard-blocks any role/active change
--           unless the caller is an owner (or a trusted service/SQL context
--           where auth.uid() is null, e.g. the dashboard or the Edge Function).
--     Either layer alone is sufficient; both is intentional belt-and-suspenders.
-- ---------------------------------------------------------------------

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- subquery sees the PRE-update row, so this forces NEW = OLD for these cols:
    and role   = (select p.role   from public.profiles p where p.id = auth.uid())
    and active = (select p.active from public.profiles p where p.id = auth.uid())
  );

create or replace function public.guard_profile_privilege()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.active is distinct from old.active)
     and auth.uid() is not null      -- allow service_role / SQL-editor (uid null)
     and not public.is_owner()        -- allow owners
  then
    raise exception 'Only an owner can change a profile''s role or active status';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_privilege on public.profiles;
create trigger guard_profile_privilege
  before update on public.profiles
  for each row execute function public.guard_profile_privilege();

-- ---------------------------------------------------------------------
-- C2(a). handle_new_user copied the new account's role straight from
--     client-controlled signup metadata, so a self-signup could pass
--     role:'owner'. Force EVERY new account to 'instructor'. Owners are
--     promoted only via the owner-gated update path (app or this editor).
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'instructor'                      -- NEVER trust client metadata for role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- =====================================================================
--  VERIFY (optional). After running the above AND turning public signup
--  OFF (Authentication -> Sign In / Providers -> "Allow new users to sign
--  up" = OFF), confirm the escalation is closed:
--
--  Signed in as a test INSTRUCTOR, in the browser console run:
--     await supa.from('profiles').update({ role:'owner' }).eq('id', (await supa.auth.getUser()).data.user.id)
--  -> must return an error (RLS / trigger), NOT success.
--
--  Owner account management must still work:
--     - rename an instructor, toggle active  -> succeeds for an owner.
-- =====================================================================
