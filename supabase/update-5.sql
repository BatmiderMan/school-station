-- ===== به‌روزرسانی ۵: وقت مشاوره (یک‌بار در SQL Editor اجرا کنید) =====
create table public.consults(
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  topic text not null, msg text default '', pref text default '',
  status text not null default 'pending' check (status in ('pending','scheduled','rejected')),
  slot_date date, slot_time text, place text, note text,
  created_at timestamptz default now(),
  constraint consult_len check (length(coalesce(msg,'')) <= 800 and length(coalesce(pref,'')) <= 200));

alter table public.consults enable row level security;
revoke all on public.consults from anon;
grant select,insert,update,delete on public.consults to authenticated;

-- حداکثر ۲ درخواست فعال (در انتظار یا وقت‌گرفته) برای هر دانش‌آموز
create or replace function public.limit_consults() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.consults where student_id=new.student_id and status in ('pending','scheduled')) >= 2 then
    raise exception 'too many active consults';
  end if;
  return new;
end $$;
create trigger trg_limit_consults before insert on public.consults
  for each row execute function public.limit_consults();

create policy cs_read on public.consults for select to authenticated using (student_id=public.my_student_id() or public.is_manager());
-- دانش‌آموز فقط می‌تواند درخواست «در انتظار» بسازد (زمان و پاسخ را فقط مدیر تعیین می‌کند)
create policy cs_ins on public.consults for insert to authenticated with check (
  student_id=public.my_student_id() and status='pending' and slot_date is null and slot_time is null and place is null and note is null);
create policy cs_del on public.consults for delete to authenticated using (student_id=public.my_student_id() and status='pending');
create policy cs_mgr on public.consults for all to authenticated using (public.is_manager()) with check (public.is_manager());
