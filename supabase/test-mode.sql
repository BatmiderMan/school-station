-- ===== حالت آزمایشی حضور و غیاب (برای تست در روز تعطیل) =====
-- پیش‌نیاز: update-9.sql اجرا شده باشد.
-- با روشن کردن آن، «امروز» برای نماینده و ثبت حضور و غیاب یک روز مدرسه‌ی گذشته می‌شود.

-- ۱) روشن کردن (تاریخ را به میلادی بنویسید؛ باید یک روز مدرسه‌ی هفته‌ی جاری باشد، مثلاً چهارشنبه ۲۱ اکتبر ۲۰۲۶):
insert into public.app_settings(key, value) values ('att_test_date', '2026-10-21')
on conflict (key) do update set value = excluded.value;

-- ۲) بعد از پایان تست، حتماً خاموش کنید (خط زیر را جدا اجرا کنید) و غیبت‌های آزمایشی را پاک کنید:
-- delete from public.app_settings where key = 'att_test_date';
-- delete from public.attendance where day = date '2026-10-21';
-- delete from public.att_sessions where day = date '2026-10-21';
-- delete from public.att_notes where day = date '2026-10-21';
