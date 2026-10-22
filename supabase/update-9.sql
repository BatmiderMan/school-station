-- ===== به‌روزرسانی ۹: حضور و غیاب (یک‌بار در SQL Editor اجرا کنید؛ اجرای دوباره هم بی‌خطر است) =====
-- پیش‌نیاز: update-8.sql (نماینده‌ی کلاس) قبلاً اجرا شده باشد.
-- نماینده غیبت را ثبت می‌کند؛ فقط مدیر «شرح غیبت» می‌نویسد. از دانش‌آموز هیچ دلیلی گرفته نمی‌شود.

-- غیبت و تأخیر؛ «حاضر» ردیف ندارد. هر ردیف = یک دانش‌آموز، یک روز، یک زنگ.
create table if not exists public.attendance(
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  cls text not null,
  day date not null,
  period int not null check (period between 1 and 12),
  status text not null check (status in ('absent','late')),
  marked_by uuid references public.students on delete set null,
  marked_at timestamptz not null default now(),
  unique(student_id, day, period));
create index if not exists att_day_idx on public.attendance(day);

-- ثبت‌شدنِ حضور و غیابِ هر زنگ توسط نماینده (تا مدیر بداند زنگ «ثبت نشده» یا «همه حاضر بودند»)
create table if not exists public.att_sessions(
  cls text not null, day date not null, period int not null,
  marked_by uuid references public.students on delete set null,
  marked_at timestamptz not null default now(),
  primary key(cls, day, period));

-- شرح مدیر (نتیجه‌ی تماس با والدین و ...) برای هر دانش‌آموز در هر روز؛ دانش‌آموز نمی‌بیند
create table if not exists public.att_notes(
  student_id uuid not null references public.students on delete cascade,
  day date not null,
  note text not null default '',
  called boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(student_id, day));

alter table public.attendance enable row level security;
alter table public.att_sessions enable row level security;
alter table public.att_notes enable row level security;
revoke all on public.attendance, public.att_sessions, public.att_notes from anon;
grant select, insert, update, delete on public.attendance, public.att_sessions, public.att_notes to authenticated;

-- دانش‌آموز فقط غیبت‌های خودش را می‌خواند (بدون هیچ نوشتن)؛ مدیر همه‌چیز
drop policy if exists at_read on public.attendance;
create policy at_read on public.attendance for select to authenticated using (student_id = public.my_student_id() or public.is_manager());
drop policy if exists at_mgr on public.attendance;
create policy at_mgr on public.attendance for all to authenticated using (public.is_manager()) with check (public.is_manager());
drop policy if exists as_mgr on public.att_sessions;
create policy as_mgr on public.att_sessions for all to authenticated using (public.is_manager()) with check (public.is_manager());
drop policy if exists an_mgr on public.att_notes;
create policy an_mgr on public.att_notes for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- تنظیمات (فقط مدیر): فعلاً فقط «تاریخ آزمایشی» برای تست در روزهای تعطیل
create table if not exists public.app_settings(key text primary key, value text not null);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon;
grant select, insert, update, delete on public.app_settings to authenticated;
drop policy if exists st_mgr on public.app_settings;
create policy st_mgr on public.app_settings for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- «امروز» برای حضور و غیاب: به وقت تهران، مگر اینکه حالت آزمایشی روشن باشد (فایل test-mode.sql)
create or replace function public.att_today() returns date
  language sql stable security definer set search_path=public as $$
  select coalesce((select value::date from public.app_settings where key = 'att_test_date'), (now() at time zone 'Asia/Tehran')::date) $$;

-- وضعیت امروزِ کلاسِ نماینده (فقط وضعیت‌ها)
create or replace function public.class_attendance() returns jsonb
  language plpgsql stable security definer set search_path=public as $$
declare me record; t date := public.att_today();
begin
  select * into me from public.students where auth_id = auth.uid() and active and is_rep;
  if not found then return null; end if;
  return jsonb_build_object(
    'today', t, 'cls', me.cls,
    'rows', coalesce((select jsonb_agg(jsonb_build_object('student_id', a.student_id, 'period', a.period, 'status', a.status))
                      from public.attendance a where a.cls = me.cls and a.day = t), '[]'::jsonb),
    'done', coalesce((select jsonb_agg(s.period order by s.period) from public.att_sessions s where s.cls = me.cls and s.day = t), '[]'::jsonb));
end $$;

-- ثبت حضور و غیابِ چند زنگِ امروز توسط نماینده.
-- p_periods: زنگ‌هایی که ثبت می‌شوند؛ p_rows: [{student_id, period, status:'absent'|'late'}] (حاضرها ردیف ندارند)
-- دانش‌آموزی که در آن زنگ معافیت دارد (طبق تقویم منتشرشده) هرگز غایب ثبت نمی‌شود.
create or replace function public.save_attendance(p_periods int[], p_rows jsonb) returns jsonb
  language plpgsql security definer set search_path=public as $$
declare me record; t date := public.att_today(); per int; r jsonb; sid uuid; st text; saved int := 0; skipped int := 0;
begin
  select * into me from public.students where auth_id = auth.uid() and active and is_rep;
  if not found then raise exception 'فقط نماینده‌ی کلاس می‌تواند حضور و غیاب ثبت کند'; end if;
  foreach per in array coalesce(p_periods, '{}') loop
    if per < 1 or per > 12 then continue; end if;
    delete from public.attendance a
      where a.cls = me.cls and a.day = t and a.period = per
        and not exists (select 1 from jsonb_array_elements(p_rows) e
                        where (e->>'period')::int = per and (e->>'student_id')::uuid = a.student_id and e->>'status' in ('absent','late'));
    for r in select * from jsonb_array_elements(p_rows) loop
      if (r->>'period')::int <> per then continue; end if;
      st := r->>'status'; if st not in ('absent','late') then continue; end if;
      sid := (r->>'student_id')::uuid;
      if not exists (select 1 from public.students s where s.id = sid and s.cls = me.cls and s.active) then continue; end if;
      if exists (select 1 from public.calendar_pub c, jsonb_array_elements(c.data->'days') d
                 where c.student_id = sid and d->>'date' = t::text and (d->'cells'->(per-1)->>'t') in ('g','f','p')) then
        skipped := skipped + 1; continue;
      end if;
      insert into public.attendance(student_id, cls, day, period, status, marked_by)
        values (sid, me.cls, t, per, st, me.id)
        on conflict (student_id, day, period) do update set status = excluded.status, marked_by = excluded.marked_by, marked_at = now();
      saved := saved + 1;
    end loop;
    insert into public.att_sessions(cls, day, period, marked_by, marked_at) values (me.cls, t, per, me.id, now())
      on conflict (cls, day, period) do update set marked_by = excluded.marked_by, marked_at = now();
  end loop;
  return jsonb_build_object('saved', saved, 'skipped', skipped);
end $$;

-- مدیر: تغییر دستیِ وضعیت یک زنگ (present = حذف غیبت)
create or replace function public.admin_set_attendance(p_student uuid, p_day date, p_period int, p_status text) returns void
  language plpgsql security definer set search_path=public as $$
declare c text;
begin
  if not public.is_manager() then raise exception 'فقط مدیر'; end if;
  select cls into c from public.students where id = p_student;
  if c is null then raise exception 'دانش‌آموز پیدا نشد'; end if;
  if p_status = 'present' then
    delete from public.attendance where student_id = p_student and day = p_day and period = p_period;
  elsif p_status in ('absent','late') then
    insert into public.attendance(student_id, cls, day, period, status, marked_by)
      values (p_student, c, p_day, p_period, p_status, null)
      on conflict (student_id, day, period) do update set status = excluded.status, marked_at = now();
  else raise exception 'وضعیت نامعتبر'; end if;
end $$;

revoke all on function public.att_today(), public.class_attendance(), public.save_attendance(int[], jsonb), public.admin_set_attendance(uuid, date, int, text) from public, anon;
grant execute on function public.att_today(), public.class_attendance(), public.save_attendance(int[], jsonb), public.admin_set_attendance(uuid, date, int, text) to authenticated;

-- ===== پاک‌سازی بخش «دلیل غیبت توسط دانش‌آموز» (اگر نسخه‌ی قبلی این فایل را اجرا کرده بودید) =====
drop function if exists public.submit_absence_reason(date, text);
drop function if exists public.att_deadline(date);
drop function if exists public.att_cutoff();
alter table public.attendance drop column if exists reason, drop column if exists reason_at, drop column if exists deadline;
