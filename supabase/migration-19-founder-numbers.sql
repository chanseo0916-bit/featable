-- Stable public Founder IDs.
-- Reserve Founder ID 0001 for chanseo0916@gmail.com; issue random unique IDs to everyone else.

alter table public.founders
  add column if not exists founder_number integer;

alter table public.founders
  alter column founder_number drop default;

-- Release 0001 if a partial/older run assigned it to somebody else.
update public.founders f
set founder_number = null
where f.founder_number = 1
  and not exists (
    select 1
    from auth.users u
    where u.id = f.user_id
      and lower(u.email) = 'chanseo0916@gmail.com'
  );

-- The requested account always owns Founder ID 0001.
update public.founders f
set founder_number = 1
from auth.users u
where u.id = f.user_id
  and lower(u.email) = 'chanseo0916@gmail.com';

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

  if new.founder_number is not null and new.founder_number between 2 and 9999 then
    return new;
  end if;

  loop
    candidate := floor(random() * 9998)::integer + 2;
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

-- Give existing unnumbered Founders a stable random ID.
do $$
declare
  founder_row record;
  candidate integer;
begin
  perform pg_advisory_xact_lock(hashtext('featable_founder_number_assignment'));

  for founder_row in
    select id from public.founders where founder_number is null order by created_at, id
  loop
    loop
      candidate := floor(random() * 9998)::integer + 2;
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

alter table public.founders
  alter column founder_number set not null;

comment on column public.founders.founder_number is
  'Stable random public Founder ID; 0001 is reserved for the founding account.';
