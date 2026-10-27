create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'Thành viên',
  color text not null default '#7658e8',
  email text,
  is_manager boolean not null default false
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  assignee_id uuid not null references public.profiles(id),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  due_date date not null,
  created_at timestamptz not null default now(),
  completion_report text
);

alter table public.tasks add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.tasks add column if not exists completion_report text;

create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
create index if not exists tasks_group_id_idx on public.tasks(group_id);
create index if not exists group_members_user_id_idx on public.group_members(user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Thành viên'
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

insert into public.profiles (id, name, email)
select
  id,
  coalesce(
    nullif(raw_user_meta_data->>'name', ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    'Thành viên'
  ),
  email
from auth.users
on conflict (id) do nothing;

do $$
declare
  legacy_manager_id uuid;
  legacy_group_id uuid;
begin
  if not exists (select 1 from public.groups)
    and exists (select 1 from public.profiles)
    and (
      exists (select 1 from public.tasks)
      or exists (select 1 from public.profiles where is_manager)
    ) then
    select id into legacy_manager_id
    from public.profiles
    where is_manager
    order by id
    limit 1;

    if legacy_manager_id is null then
      select id into legacy_manager_id
      from public.profiles
      order by id
      limit 1;
    end if;

    insert into public.groups (name, created_by)
    values ('Nhóm hiện tại', legacy_manager_id)
    returning id into legacy_group_id;

    insert into public.group_members (group_id, user_id, role)
    select
      legacy_group_id,
      id,
      case when is_manager or id = legacy_manager_id then 'manager' else 'member' end
    from public.profiles
    on conflict (group_id, user_id) do nothing;
  end if;

  update public.tasks
  set group_id = (select id from public.groups order by created_at, id limit 1)
  where group_id is null
    and exists (select 1 from public.groups);
end;
$$;

alter table public.tasks alter column group_id set not null;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_manager(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'manager'
  );
$$;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members viewer
    join public.group_members subject on subject.group_id = viewer.group_id
    where viewer.user_id = auth.uid() and subject.user_id = p_profile_id
  );
$$;

create or replace function public.create_group(p_name text)
returns table (id uuid, name text, invite_code text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
  clean_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để tạo nhóm.';
  end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 80 then
    raise exception 'Tên nhóm cần có từ 2 đến 80 ký tự.';
  end if;

  insert into public.groups (name, created_by)
  values (clean_name, auth.uid())
  returning groups.id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'manager');

  return query
  select g.id, g.name, g.invite_code, gm.role
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where g.id = new_group_id and gm.user_id = auth.uid();
end;
$$;

create or replace function public.join_group(p_invite_code text)
returns table (id uuid, name text, invite_code text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để tham gia nhóm.';
  end if;

  select g.id into target_group_id
  from public.groups g
  where g.invite_code = upper(btrim(coalesce(p_invite_code, '')));

  if target_group_id is null then
    raise exception 'Mã mời không hợp lệ.';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (target_group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return query
  select g.id, g.name, g.invite_code, gm.role
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where g.id = target_group_id and gm.user_id = auth.uid();
end;
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.tasks enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_manager_insert on public.profiles;
drop policy if exists profiles_manager_update on public.profiles;
drop policy if exists profiles_manager_delete on public.profiles;
drop policy if exists profiles_select_group_members on public.profiles;
create policy profiles_select_group_members on public.profiles
for select to authenticated using (public.can_view_profile(id));

drop policy if exists groups_select_members on public.groups;
create policy groups_select_members on public.groups
for select to authenticated using (public.is_group_member(id));

drop policy if exists group_members_select_group on public.group_members;
create policy group_members_select_group on public.group_members
for select to authenticated using (public.is_group_member(group_id));

drop policy if exists tasks_select_authenticated on public.tasks;
drop policy if exists tasks_manager_insert on public.tasks;
drop policy if exists tasks_update_status on public.tasks;
drop policy if exists tasks_manager_update on public.tasks;
drop policy if exists tasks_manager_delete on public.tasks;
drop policy if exists tasks_select_group_members on public.tasks;
create policy tasks_select_group_members on public.tasks
for select to authenticated using (public.is_group_member(group_id));

drop policy if exists tasks_insert_group_managers on public.tasks;
create policy tasks_insert_group_managers on public.tasks
for insert to authenticated with check (public.is_group_manager(group_id));

drop policy if exists tasks_update_group_members on public.tasks;
create policy tasks_update_group_members on public.tasks
for update to authenticated
using (public.is_group_manager(group_id) or (auth.uid() = assignee_id and public.is_group_member(group_id)))
with check (public.is_group_manager(group_id) or (auth.uid() = assignee_id and public.is_group_member(group_id)));

revoke all on public.profiles, public.groups, public.group_members, public.tasks from anon, authenticated;
grant select on public.profiles, public.groups, public.group_members, public.tasks to authenticated;
grant insert on public.tasks to authenticated;
grant update (status, completion_report) on public.tasks to authenticated;

revoke all on function public.create_profile_for_new_user() from public;
revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.is_group_manager(uuid) from public;
revoke all on function public.can_view_profile(uuid) from public;
revoke all on function public.create_group(text) from public;
revoke all on function public.join_group(text) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_manager(uuid) to authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;

drop function if exists public.is_manager();
drop function if exists public.update_task_status(uuid, text);
