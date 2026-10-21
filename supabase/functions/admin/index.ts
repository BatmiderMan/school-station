// Edge Function «admin»: فقط مدیر می‌تواند حساب دانش‌آموز بسازد/رمز عوض کند/حذف کند.
// کلید سرّی (service role) خودکار توسط Supabase در همین‌جا در دسترس است و هیچ‌جای کد شما نمی‌آید.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, srv = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: ok } = await caller.rpc('is_manager');
  if (ok !== true) return json({ error: 'forbidden' }, 403);
  const admin = createClient(url, srv);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

  if (b.action === 'create') {
    const u = String(b.username || '').toLowerCase();
    if (!/^[a-z0-9_.-]{3,30}$/.test(u)) return json({ error: 'نام کاربری باید ۳ تا ۳۰ حرف انگلیسی/عدد باشد' }, 400);
    if (String(b.password || '').length < 6) return json({ error: 'رمز حداقل ۶ کاراکتر' }, 400);
    const email = `${u}@school.example`;
    let { data, error } = await admin.auth.admin.createUser({ email, password: b.password, email_confirm: true });
    if (error && /already|registered|exist/i.test(error.message)) {
      // ممکن است کاربرِ بی‌صاحب (باقی‌مانده از حساب قبلی که ردیف دانش‌آموزش پاک شده) باشد؛ اگر به هیچ دانش‌آموزی وصل نیست پاکش کن و دوباره بساز.
      let orphan: any = null;
      for (let page = 1; page <= 20 && !orphan; page++) {
        const { data: l, error: le } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (le || !l?.users?.length) break;
        orphan = l.users.find((x: any) => String(x.email).toLowerCase() === email) || null;
        if (l.users.length < 200) break;
      }
      if (!orphan) return json({ error: 'این نام کاربری قبلاً ثبت شده است' }, 400);
      const { data: used } = await admin.from('students').select('id').eq('auth_id', orphan.id).maybeSingle();
      if (used) return json({ error: 'این نام کاربری برای یک دانش‌آموز دیگر ساخته شده است' }, 400);
      await admin.auth.admin.deleteUser(orphan.id);
      ({ data, error } = await admin.auth.admin.createUser({ email, password: b.password, email_confirm: true }));
    }
    if (error) return json({ error: error.message }, 400);
    const { data: row, error: e2 } = await admin.from('students').insert({ local_id: b.local_id, name: b.name, cls: b.cls, username: u, auth_id: data.user.id }).select().single();
    if (e2) { await admin.auth.admin.deleteUser(data.user.id); return json({ error: e2.message }, 400); }
    return json({ student: row });
  }
  const { data: st } = await admin.from('students').select('id,auth_id').eq('id', b.student_id).maybeSingle();
  if (!st) return json({ error: 'not found' }, 404);
  if (b.action === 'password') {
    if (String(b.password || '').length < 6) return json({ error: 'رمز حداقل ۶ کاراکتر' }, 400);
    const { error } = await admin.auth.admin.updateUserById(st.auth_id, { password: b.password });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (b.action === 'toggle') {
    await admin.from('students').update({ active: !!b.active }).eq('id', st.id);
    const { error } = await admin.auth.admin.updateUserById(st.auth_id, { ban_duration: b.active ? 'none' : '876000h' });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }
  if (b.action === 'remove') {
    await admin.from('students').delete().eq('id', st.id);
    if (st.auth_id) await admin.auth.admin.deleteUser(st.auth_id);
    return json({ ok: true });
  }
  return json({ error: 'unknown action' }, 400);
});
