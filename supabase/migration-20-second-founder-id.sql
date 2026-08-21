-- Reserve Founder ID 0002 for dasarom4@gmail.com.
-- All other Founders receive a stable random ID from 0003 to 9999.

create unique index if not exists founders_founder_number_key
  on public.founders(founder_number);

create or replace function public.assign_founder_number()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  account_email text;
  candidate integer;
  attempts integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('featable_founder_number_assignment'));

  select lower(email) into account_email
  from auth.users
  where id = new.user_id;

  if account_email = 'chanseo0916@gmail.com' then
    new.founder_number := 1;
    return new;
  end if;

  if account_email = 'dasarom4@gmail.com' then
    new.founder_number := 2;
    return new;
  end if;

  if new.founder_number is not null and new.founder_number between 3 and 9999 then
    return new;
  end if;

  loop
    candidate := floor(random() * 9997)::integer + 3;
    exit when not exists (
      select 1 from public.founders where founder_number = candidate
    );
    attempts := attempts + 1;
    if attempts >= 10000 then
      raise exception 'No available Founder IDs remain';
    end if;
  end loop;

  new.founder_number := candidate;
  return new;
end;
$$;

drop trigger if exists assign_founder_number_before_insert on public.founders;
create trigger assign_founder_number_before_insert
  before insert on public.founders
  for each row execute function public.assign_founder_number();

do $$
declare
  founder_row record;
  candidate integer;
begin
  perform pg_advisory_xact_lock(hashtext('featable_founder_number_assignment'));

  -- Release 0002 if it was randomly assigned by the previous migration.
  update public.founders f
  set founder_number = null
  where f.founder_number = 2
    and not exists (
      select 1
      from auth.users u
      where u.id = f.user_id
        and lower(u.email) = 'dasarom4@gmail.com'
    );

  -- Assign the permanent second Founder ID when this account has a profile.
  update public.founders f
  set founder_number = 2
  from auth.users u
  where u.id = f.user_id
    and lower(u.email) = 'dasarom4@gmail.com';

  -- Reassign anyone displaced from 0002 without changing any other stable IDs.
  for founder_row in
    select id from public.founders where founder_number is null order by created_at, id
  loop
    loop
      candidate := floor(random() * 9997)::integer + 3;
      exit when not exists (
        select 1 from public.founders where founder_number = candidate
      );
    end loop;

    update public.founders
    set founder_number = candidate
    where id = founder_row.id;
  end loop;
end;
$$;

comment on column public.founders.founder_number is
  'Stable random public Founder ID; 0001 and 0002 are reserved for founding accounts.';
