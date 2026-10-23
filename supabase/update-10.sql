-- ===== به‌روزرسانی ۱۰: ثبت حضور و غیاب توسط مدیر + معافیت‌ها هم حضور و غیاب دارند =====
-- پیش‌نیاز: update-9.sql. اجرای دوباره‌ی این فایل بی‌خطر است.

-- معاون و مدیر یکی هستند: هر دو با حساب مدیر (جدول managers) وارد می‌شوند و همه‌ی امکانات پنل را دارند.

-- چه کسی هر زنگ را ثبت کرده: rep (نماینده) / admin (مدیر یا معاون)
alter table public.att_sessions add column if not exists by_role text not null default 'rep';

-- ۲) نماینده: دانش‌آموز معاف هم می‌تواند غایب ثبت شود (معافیت یعنی نرفتن به کلاس، نه نبودن در مدرسه)
create or replace function public.save_attendance(p_periods int[], p_rows jsonb) returns jsonb
  language plpgsql security definer set search_path=public as $$
declare me record; t date := public.att_today(); per int; r jsonb; sid uuid; st text; saved int := 0;
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
      insert into public.attendance(student_id, cls, day, period, status, marked_by)
        values (sid, me.cls, t, per, st, me.id)
        on conflict (student_id, day, period) do update set status = excluded.status, marked_by = excluded.marked_by, marked_at = now();
      saved := saved + 1;
    end loop;
    insert into public.att_sessions(cls, day, period, marked_by, marked_at, by_role) values (me.cls, t, per, me.id, now(), 'rep')
      on conflict (cls, day, period) do update set marked_by = excluded.marked_by, marked_at = now(), by_role = 'rep';
  end loop;
  return jsonb_build_object('saved', saved, 'skipped', 0);
end $$;

-- ۳) ثبت حضور و غیاب یک کلاس برای هر روز، توسط مدیر
create or replace function public.staff_save_attendance(p_day date, p_cls text, p_periods int[], p_rows jsonb) returns jsonb
  language plpgsql security definer set search_path=public as $$
declare who text := 'admin'; per int; r jsonb; sid uuid; st text; saved int := 0;
begin
  if not public.is_manager() then raise exception 'دسترسی ندارید'; end if;
  foreach per in array coalesce(p_periods, '{}') loop
    if per < 1 or per > 12 then continue; end if;
    delete from public.attendance a
      where a.cls = p_cls and a.day = p_day and a.period = per
        and not exists (select 1 from jsonb_array_elements(p_rows) e
                        where (e->>'period')::int = per and (e->>'student_id')::uuid = a.student_id and e->>'status' in ('absent','late'));
    for r in select * from jsonb_array_elements(p_rows) loop
      if (r->>'period')::int <> per then continue; end if;
      st := r->>'status'; if st not in ('absent','late') then continue; end if;
      sid := (r->>'student_id')::uuid;
      if not exists (select 1 from public.students s where s.id = sid and s.cls = p_cls and s.active) then continue; end if;
      insert into public.attendance(student_id, cls, day, period, status, marked_by)
        values (sid, p_cls, p_day, per, st, null)
        on conflict (student_id, day, period) do update set status = excluded.status, marked_by = null, marked_at = now();
      saved := saved + 1;
    end loop;
    insert into public.att_sessions(cls, day, period, marked_by, marked_at, by_role) values (p_cls, p_day, per, null, now(), who)
      on conflict (cls, day, period) do update set marked_by = null, marked_at = now(), by_role = who;
  end loop;
  return jsonb_build_object('saved', saved);
end $$;

revoke all on function public.save_attendance(int[], jsonb), public.staff_save_attendance(date, text, int[], jsonb) from public, anon;
grant execute on function public.save_attendance(int[], jsonb), public.staff_save_attendance(date, text, int[], jsonb) to authenticated;
