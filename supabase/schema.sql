-- MI AGENDA — base de datos para sincronizar entre dispositivos.
-- Ejecutar una sola vez en Supabase → SQL Editor → New query → Run.

create table if not exists public.items (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('activities', 'events', 'things')),
  data        jsonb not null,
  updated_at  bigint not null,          -- momento del cambio en el dispositivo (ms)
  deleted     boolean not null default false,
  synced_at   timestamptz not null default now()  -- momento en que llegó al servidor
);

create index if not exists items_user_synced on public.items (user_id, synced_at);

-- Cada persona solo puede ver y modificar sus propios datos
alter table public.items enable row level security;

drop policy if exists "items_own" on public.items;
create policy "items_own" on public.items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Gana siempre el cambio más reciente y se marca la hora de llegada al servidor
create or replace function public.items_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;  -- el cambio que llega es más antiguo: se ignora
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists items_before_write on public.items;
create trigger items_before_write
  before insert or update on public.items
  for each row execute function public.items_before_write();

-- Permisos de acceso para usuarios con sesión iniciada (las políticas de arriba limitan a sus propios datos)
grant select, insert, update, delete on public.items to authenticated;
