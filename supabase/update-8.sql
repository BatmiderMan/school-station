-- ===== به‌روزرسانی ۸: نماینده‌ی کلاس (یک‌بار در SQL Editor اجرا کنید) =====
alter table public.students add column if not exists is_rep boolean not null default false;

-- فقط مدیر می‌تواند is_rep را عوض کند (دانش‌آموز اصلاً اجازه‌ی update روی students ندارد)

-- تقویم معافیت همه‌ی هم‌کلاسی‌ها؛ فقط برای نماینده‌ی فعال همان کلاس.
-- (از تابع security definer استفاده شده تا نام‌کاربری و اطلاعات دیگر دانش‌آموزان به نماینده نشان داده نشود.)
create or replace function public.class_calendar()
  returns table(student_id uuid, name text, week_start date, data jsonb)
  language sql security definer set search_path=public stable as $$
  select s.id, s.name, c.week_start, c.data
  from public.students s
  join public.calendar_pub c on c.student_id = s.id
  where s.active
    and s.cls = (select r.cls from public.students r where r.auth_id = auth.uid() and r.active and r.is_rep)
$$;
revoke all on function public.class_calendar() from public, anon;
grant execute on function public.class_calendar() to authenticated;
