# ایستگاه مدیریت نتایج مدرسه

اجرا:
    npm install
    npm run dev      # توسعه
    npm run build    # خروجی در dist/ (base نسبی؛ روی هر هاستی کار می‌کند)

- src/main.ts      — برنامه (داشبورد، دانش‌آموزان، آزمون‌ها، اسکن، نمودارها، خروجی)
- src/scan/        — خواننده‌های کارنامه‌ی ماز (عکس/PDF) و قلم‌چی (PDF)، کپی‌شده از Planex
- داده‌ها روی Supabase (جدول admin_data) ذخیره می‌شود؛ بدون config سرور، در localStorage. پشتیبان JSON از بخش «خروجی و ابزار»

## ساخت و انتشار
    npm run dev          # پنل مدیر روی localhost
    npm run build:site   # dist-site: دانش‌آموز در ریشه + مدیر در /admin/ (همین را گیت‌هاب می‌سازد)

- آیکن‌ها: `public-student/` و `public-admin/` (favicon.svg منبع است؛ PNGها از روی آن ساخته شده‌اند).
- `scripts/pwa.mjs` بعد از هر build، manifest و service worker را می‌سازد.
