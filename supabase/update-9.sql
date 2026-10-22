-- ===== به‌روزرسانی ۹: حضور و غیاب (یک‌بار در SQL Editor اجرا کنید) =====
-- پیش‌نیاز: update-8.sql (نماینده‌ی کلاس) قبلاً اجرا شده باشد.

-- تنظیمات عمومی (مثلاً ساعت پایان مهلت ثبت دلیل غیبت)
create table if not exists public.app_settings(key text primary key, value text not null);

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
  deadline timestamptz not null default now(),   -- آخرین زمانی که دانش‌آموز می‌تواند دلیل بنویسد
  reason text,                                   -- دلیل غیبت به قلم خود دانش‌آموز
  reason_at timestamptz,
  unique(student_id, day, period));
create index if not exists att_day_idx on public.attendance(day);

-- ثبت‌شدنِ حضور و غیابِ هر زنگ توسط نماینده (برای اینکه مدیر بداند زنگ «ثبت نشده» یا «همه حاضر بودند»)
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

alter table public.app_settings enable row level security;
alter table public.attendance enable row level security;
alter table public.att_sessions enable row level security;
alter table public.att_notes enable row level security;
revoke all on public.app_settings, public.attendance, public.att_sessions, public.att_notes from anon;
grant select, insert, update, delete on public.app_settings, public.attendance, public.att_sessions, public.att_notes to authenticated;

drop policy if exists st_read on public.app_settings;
create policy st_read on public.app_settings for select to authenticated using (true);
drop policy if exists st_mgr on public.app_settings;
create policy st_mgr on public.app_settings for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- دانش‌آموز فقط غیبت‌های خودش را می‌بیند و مستقیم چیزی نمی‌نویسد (فقط با تابع submit_absence_reason)
drop policy if exists at_read on public.attendance;
create policy at_read on public.attendance for select to authenticated using (student_id = public.my_student_id() or public.is_manager());
drop policy if exists at_mgr on public.attendance;
create policy at_mgr on public.attendance for all to authenticated using (public.is_manager()) with check (public.is_manager());
drop policy if exists as_mgr on public.att_sessions;
create policy as_mgr on public.att_sessions for all to authenticated using (public.is_manager()) with check (public.is_manager());
drop policy if exists an_mgr on public.att_notes;
create policy an_mgr on public.att_notes for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- تاریخ امروز به وقت تهران
create or replace function public.att_today() returns date
  language sql stable as $$ select (now() at time zone 'Asia/Tehran')::date $$;

-- ساعت پایان مهلت ثبت دلیل (پیش‌فرض ۱۰)
create or replace function public.att_cutoff() returns int
  language sql stable security definer set search_path=public as $$
  select coalesce((select value::int from public.app_settings where key='att_cutoff_hour'), 10) $$;

-- مهلتِ ثبت دلیل: تا ساعت مقرر همان روز؛ اگر غیبت بعد از آن ساعت ثبت شود، تا ساعت مقرر روز بعد
create or replace function public.att_deadline(p_day date) returns timestamptz
  language plpgsql stable security definer set search_path=public as $$
declare cut int := public.att_cutoff(); d1 timestamptz;
begin
  d1 := (p_day::timestamp + make_interval(hours => cut)) at time zone 'Asia/Tehran';
  if now() < d1 then return d1; end if;
  return (p_day::timestamp + make_interval(days => 1, hours => cut)) at time zone 'Asia/Tehran';
end $$;

-- وضعیت امروزِ کلاسِ نماینده (فقط وضعیت‌ها؛ دلیل‌ها را نماینده نمی‌بیند)
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
-- p_periods: زنگ‌هایی که ثبت می‌شوند (۱ تا ...)؛ p_rows: [{student_id, period, status:'absent'|'late'}] (حاضرها ردیف ندارند)
-- دانش‌آموزی که در آن زنگ معافیت دارد (طبق تقویم منتشرشده) هرگز غایب ثبت نمی‌شود.
create or replace function public.save_attendance(p_periods int[], p_rows jsonb) returns jsonb
  language plpgsql security definer set search_path=public as $$
declare me record; t date := public.att_today(); per int; r jsonb; sid uuid; st text; dl timestamptz; saved int := 0; skipped int := 0;
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
      dl := coalesce((select min(a.deadline) from public.attendance a where a.student_id = sid and a.day = t), public.att_deadline(t));
      insert into public.attendance(student_id, cls, day, period, status, marked_by, deadline)
        values (sid, me.cls, t, per, st, me.id, dl)
        on conflict (student_id, day, period) do update set status = excluded.status, marked_by = excluded.marked_by, marked_at = now();
      saved := saved + 1;
    end loop;
    insert into public.att_sessions(cls, day, period, marked_by, marked_at) values (me.cls, t, per, me.id, now())
      on conflict (cls, day, period) do update set marked_by = excluded.marked_by, marked_at = now();
  end loop;
  return jsonb_build_object('saved', saved, 'skipped', skipped);
end $$;

-- دانش‌آموز دلیل غیبتِ یک روز را (تا پایان مهلت) می‌نویسد
create or replace function public.submit_absence_reason(p_day date, p_reason text) returns void
  language plpgsql security definer set search_path=public as $$
declare sid uuid := public.my_student_id(); dl timestamptz; txt text := btrim(coalesce(p_reason, ''));
begin
  if sid is null then raise exception 'حساب دانش‌آموز پیدا نشد'; end if;
  if char_length(txt) < 3 then raise exception 'دلیل غیبت را کمی کامل‌تر بنویسید'; end if;
  if char_length(txt) > 600 then raise exception 'متن بیش از حد طولانی است (حداکثر ۶۰۰ حرف)'; end if;
  select min(deadline) into dl from public.attendance where student_id = sid and day = p_day;
  if dl is null then raise exception 'برای این روز غیبتی ثبت نشده است'; end if;
  if now() > dl then raise exception 'مهلت ثبت دلیل این غیبت تمام شده است'; end if;
  update public.attendance set reason = txt, reason_at = now() where student_id = sid and day = p_day;
end $$;

-- مدیر: تغییر دستیِ وضعیت یک زنگ (present = حذف غیبت)
create or replace function public.admin_set_attendance(p_student uuid, p_day date, p_period int, p_status text) returns void
  language plpgsql security definer set search_path=public as $$
declare c text; dl timestamptz;
begin
  if not public.is_manager() then raise exception 'فقط مدیر'; end if;
  select cls into c from public.students where id = p_student;
  if c is null then raise exception 'دانش‌آموز پیدا نشد'; end if;
  if p_status = 'present' then
    delete from public.attendance where student_id = p_student and day = p_day and period = p_period;
  elsif p_status in ('absent','late') then
    dl := coalesce((select min(deadline) from public.attendance where student_id = p_student and day = p_day), public.att_deadline(p_day));
    insert into public.attendance(student_id, cls, day, period, status, marked_by, deadline)
      values (p_student, c, p_day, p_period, p_status, null, dl)
      on conflict (student_id, day, period) do update set status = excluded.status, marked_at = now();
  else raise exception 'وضعیت نامعتبر'; end if;
end $$;

revoke all on function public.att_today(), public.att_cutoff(), public.att_deadline(date), public.class_attendance(),
  public.save_attendance(int[], jsonb), public.submit_absence_reason(date, text), public.admin_set_attendance(uuid, date, int, text) from public, anon;
grant execute on function public.att_today(), public.att_cutoff(), public.att_deadline(date), public.class_attendance(),
  public.save_attendance(int[], jsonb), public.submit_absence_reason(date, text), public.admin_set_attendance(uuid, date, int, text) to authenticated;
