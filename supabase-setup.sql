-- Однократная настройка базы для планера ЕГЭ-2027.
-- Supabase → SQL Editor → New query → вставить весь файл → Run.

create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null default '',
  share_token text not null unique
              default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists students_touch on public.students;
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();

-- Доступ к таблице только для вошедшего репетитора (анонимные посетители таблицу не видят).
revoke all on table public.students from anon;
grant select, insert, update, delete on table public.students to authenticated;

-- Репетитор видит и меняет только своих учениц.
alter table public.students enable row level security;
drop policy if exists "owner full access" on public.students;
create policy "owner full access" on public.students
  for all using (owner = auth.uid()) with check (owner = auth.uid());

-- Ученица открывает свою карточку по секретной ссылке, без аккаунта и только для чтения.
-- Заметки репетитора (data.private) ученице не передаются.
create or replace function public.student_by_token(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', name, 'data', data - 'private', 'updated_at', updated_at)
  from public.students
  where share_token = p_token and length(p_token) >= 32;
$$;

revoke all on function public.student_by_token(text) from public;
grant execute on function public.student_by_token(text) to anon, authenticated;
