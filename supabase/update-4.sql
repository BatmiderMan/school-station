-- ===== به‌روزرسانی ۴: تاریخ شروع نمایش اطلاعیه (یک‌بار در SQL Editor اجرا کنید) =====
alter table public.announcements add column if not exists starts date;
drop policy if exists an_read on public.announcements;
create policy an_read on public.announcements for select to authenticated using (
  public.is_manager() or (
    public.my_student_id() is not null
    and (starts is null or starts <= (now() at time zone 'Asia/Tehran')::date)
    and exp >= (now() at time zone 'Asia/Tehran')::date
    and (cls is null or cls = public.my_cls())));
