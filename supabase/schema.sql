-- ===== ایستگاه مدرسه: ساختار دیتابیس (یک‌بار در SQL Editor اجرا کنید) =====
create table public.managers(user_id uuid primary key references auth.users on delete cascade);

create table public.students(
  id uuid primary key default gen_random_uuid(),
  local_id text unique not null,
  name text not null, cls text not null,
  username text unique not null,
  auth_id uuid unique references auth.users on delete set null,
  active boolean not null default true,
  created_at timestamptz default now());

create table public.exams_pub(
  student_id uuid references public.students on delete cascade,
  exam_key text, title text, inst text, date text,
  level int, rank int, subj jsonb default '{}',
  primary key(student_id, exam_key));

create table public.calendar_pub(
  student_id uuid references public.students on delete cascade,
  week_start date, data jsonb not null,
  primary key(student_id, week_start));

create table public.submissions(
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students on delete cascade,
  inst text, title text, date text, level int, rank int,
  subj jsonb, raw jsonb, file_b64 text, file_type text,
  created_at timestamptz default now(),
  constraint size_ok check (length(coalesce(file_b64,'')) < 1600000));

create or replace function public.is_manager() returns boolean
  language sql security definer set search_path=public stable
  as $$ select exists(select 1 from public.managers where user_id=auth.uid()) $$;

create or replace function public.my_student_id() returns uuid
  language sql security definer set search_path=public stable
  as $$ select id from public.students where auth_id=auth.uid() and active $$;

-- هر دانش‌آموز حداکثر ۳ ارسال در انتظار (جلوگیری از پر شدن دیتابیس)
create or replace function public.limit_submissions() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.submissions where student_id=new.student_id) >= 3 then
    raise exception 'too many pending submissions';
  end if;
  return new;
end $$;
create trigger trg_limit before insert on public.submissions
  for each row execute function public.limit_submissions();

alter table public.managers enable row level security;
alter table public.students enable row level security;
alter table public.exams_pub enable row level security;
alter table public.calendar_pub enable row level security;
alter table public.submissions enable row level security;

revoke all on all tables in schema public from anon;
grant select,insert,update,delete on all tables in schema public to authenticated;

create policy m_self on public.managers for select to authenticated using (user_id=auth.uid());

create policy s_read on public.students for select to authenticated using (auth_id=auth.uid() or public.is_manager());
create policy s_mgr  on public.students for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy e_read on public.exams_pub for select to authenticated using (student_id=public.my_student_id() or public.is_manager());
create policy e_mgr  on public.exams_pub for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy c_read on public.calendar_pub for select to authenticated using (student_id=public.my_student_id() or public.is_manager());
create policy c_mgr  on public.calendar_pub for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy u_read on public.submissions for select to authenticated using (student_id=public.my_student_id() or public.is_manager());
create policy u_ins  on public.submissions for insert to authenticated with check (student_id=public.my_student_id());
create policy u_mgr  on public.submissions for all to authenticated using (public.is_manager()) with check (public.is_manager());
