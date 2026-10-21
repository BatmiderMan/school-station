-- ذخیره‌ی داده‌های پنل مدیر روی سرور (فقط مدیران می‌توانند بخوانند/بنویسند)
create table if not exists public.admin_data(
  key text primary key,            -- 'main' = همه‌ی داده‌ها، 'inbox:<id>' = هر ارسال دریافت‌شده
  data jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now());
alter table public.admin_data enable row level security;
revoke all on public.admin_data from anon;
grant select,insert,update,delete on public.admin_data to authenticated;
drop policy if exists ad_mgr on public.admin_data;
create policy ad_mgr on public.admin_data for all to authenticated using (public.is_manager()) with check (public.is_manager());
