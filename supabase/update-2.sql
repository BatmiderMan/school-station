-- ===== به‌روزرسانی ۲: جدول نمرات آزمون‌های مدرسه (یک‌بار در SQL Editor اجرا کنید) =====
create table public.school_pub(
  student_id uuid references public.students on delete cascade,
  exam_key text, title text, date text,
  data jsonb not null,
  primary key(student_id, exam_key));
alter table public.school_pub enable row level security;
revoke all on public.school_pub from anon;
grant select,insert,update,delete on public.school_pub to authenticated;
create policy sp_read on public.school_pub for select to authenticated using (student_id=public.my_student_id() or public.is_manager());
create policy sp_mgr  on public.school_pub for all to authenticated using (public.is_manager()) with check (public.is_manager());
