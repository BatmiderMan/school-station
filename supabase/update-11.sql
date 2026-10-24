-- ===== به‌روزرسانی ۱۱: برنامه‌ی آزمون‌ها (تشریحی مدرسه، ماز، قلم‌چی، ...) =====
-- یک‌بار در SQL Editor اجرا کنید؛ اجرای دوباره بی‌خطر است. برنامه را مدیر در پنل می‌نویسد و خودکار برای همه‌ی دانش‌آموزان نمایش داده می‌شود.
create table if not exists public.exam_plan(
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now());
alter table public.exam_plan enable row level security;
revoke all on public.exam_plan from anon;
grant select, insert, update, delete on public.exam_plan to authenticated;
drop policy if exists pl_read on public.exam_plan;
create policy pl_read on public.exam_plan for select to authenticated using (true);
drop policy if exists pl_mgr on public.exam_plan;
create policy pl_mgr on public.exam_plan for all to authenticated using (public.is_manager()) with check (public.is_manager());
