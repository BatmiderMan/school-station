-- ===== به‌روزرسانی ۳: اطلاعیه‌ها (یک‌بار در SQL Editor اجرا کنید) =====
create or replace function public.my_cls() returns text
  language sql security definer set search_path=public stable
  as $$ select cls from public.students where auth_id=auth.uid() and active $$;

create table public.announcements(
  id text primary key,
  type text not null, title text not null, body text default '',
  cls text,                       -- خالی = همه‌ی کلاس‌ها
  ev text default '',             -- تاریخ رویداد (متن شمسی برای نمایش)
  exp date not null,              -- آخرین روز نمایش
  pin boolean default false,
  created_at timestamptz default now());
alter table public.announcements enable row level security;
revoke all on public.announcements from anon;
grant select,insert,update,delete on public.announcements to authenticated;

-- دانش‌آموز فقط اطلاعیه‌های منقضی‌نشده‌ی کلاس خودش (یا همه) را می‌بیند؛ بعد از تاریخ، خودکار ناپدید می‌شود.
create policy an_read on public.announcements for select to authenticated using (
  public.is_manager() or (
    public.my_student_id() is not null
    and exp >= (now() at time zone 'Asia/Tehran')::date
    and (cls is null or cls = public.my_cls())));
create policy an_mgr on public.announcements for all to authenticated using (public.is_manager()) with check (public.is_manager());
