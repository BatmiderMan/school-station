import './style.css';
import { ic, initUi, toast, ANN, annHtml, j2iso, iso2j, daysLeft, isoToday } from './ui';
import { mkServer } from './server';
import { mkExams } from './exams';
import { mkAttend } from './attend';
import { initPwa } from './pwa';
import { snapList } from './store';
import fontUrl from './assets/vazirmatn-arabic-wght-normal.woff2?url';
import { importReport, rememberHeading, INSTITUTES, ImportedExam, ExamSettings } from './scan';
import { matchStudents, confident } from './scan/nameMatch';
export function start(){

const CL:string[]=['تجربی ۳۲۱','تجربی ۳۲۲','ریاضی ۳۱۱'],CC=['var(--c0)','var(--c1)','var(--c2)'];
const SUBJ=['ریاضی','فیزیک','شیمی','زیست','ادبیات','عربی','دین و زندگی','زبان'];
const K='school_station_v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=v=>v==null||isNaN(v)?'—':Math.round(v).toLocaleString('fa-IR');
const n1=v=>v==null||isNaN(v)?'—':(Math.round(v*10)/10).toLocaleString('fa-IR');
const avg=a=>{a=a.filter(x=>x!=null&&!isNaN(x));return a.length?a.reduce((s,x)=>s+x,0)/a.length:null};
const dl=d=>d==null?'':`<span class="${d>=0?'up':'dn'}">${d>=0?'▲':'▼'} ${n(Math.abs(d))}</span>`;
function today(){const p=new Intl.DateTimeFormat('en-u-ca-persian-nu-latn',{year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t).value;return `${g('year')}/${g('month')}/${g('day')}`}
/* ---------- data ---------- */
const W:any=window;
let D:any=W.__D??null;if(!W.__REMOTE){try{D=JSON.parse(localStorage.getItem(K))}catch(e){}}
let AP:any=null;
const save=()=>{try{if(W.__REMOTE)W.__REMOTE.save(D);else localStorage.setItem(K,JSON.stringify(D))}catch(e){}if(AP)AP()};
function gen(){
  let s=7;const r=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const F=['علی','محمد','رضا','امیر','حسین','مهدی','سینا','آرین','پارسا','کیان','نوید','بابک'],L=['احمدی','کریمی','رضایی','حسینی','موسوی','جعفری','صادقی','نظری','کاظمی','فرهادی','مرادی','اکبری'];
  const st=[],used=new Set();
  CL.forEach((c,ci)=>{for(let i=0;i<(ci==2?14:18);i++){let nm;do{nm=F[Math.floor(r()*12)]+' '+L[Math.floor(r()*12)]}while(used.has(nm));used.add(nm);st.push({id:'s'+st.length,name:nm,cls:c,base:4200+r()*4800,sl:(r()-.45)*350,note:''})}});
  const ds=['1405/06/25','1405/07/02','1405/07/10','1405/07/19','1405/07/24'],ti=['آزمون ماز مرحله ۱','آزمون قلم‌چی ۲ مهر','آزمون ماز مرحله ۲','آزمون قلم‌چی ۱۰ مهر','آزمون ماز مرحله ۳'];
  const ex=ds.map((d,i)=>({id:'e'+i,title:ti[i],inst:i%2?'قلم‌چی':'ماز',date:d,res:{}}));
  st.forEach(x=>{ex.forEach((e,i)=>{if(r()<.07)return;const lv=Math.max(3000,Math.min(9900,x.base+x.sl*i+(r()-.5)*600));const sj={};(x.cls.startsWith('ریاضی')?['ریاضی','فیزیک','شیمی','ادبیات']:['زیست','فیزیک','شیمی','ریاضی']).forEach(k=>sj[k]=Math.max(-10,Math.min(95,Math.round(lv/110-10+(r()-.5)*34))));e.res[x.id]={level:Math.round(lv),rank:Math.round((10000-lv)/10000*90000),subj:sj}})});
  const gr={};st.forEach(x=>{gr[x.id]={};['ریاضی','فیزیک','شیمی','ادبیات','دین و زندگی','زبان'].forEach(k=>gr[x.id][k]=[0,1].map(()=>Math.max(6,Math.min(20,Math.round((x.base/500+(r()-.5)*5)*2)/2))))});
  st.forEach(x=>{delete x.base;delete x.sl});
  return{students:st,exams:ex,grades:gr}
}
if(!D||!D.students)D=gen();
{const OLDC:any={'تجربی ۱':'تجربی ۳۲۱','تجربی ۲':'تجربی ۳۲۲','ریاضی ۱':'ریاضی ۳۱۱'};const js=JSON.stringify(D);if(/(تجربی ۱|تجربی ۲|ریاضی ۱)(?![۰-۹])/.test(js)){D=JSON.parse(js.replace(/(تجربی ۱|تجربی ۲|ریاضی ۱)(?![۰-۹])/g,x=>OLDC[x]));save()}}
const exs=()=>[...D.exams].sort((a,b)=>a.date<b.date?-1:1);
const lv=(sid,e)=>e&&e.res[sid]?e.res[sid].level:null;
const insE=(ins:string=U.ins)=>exs().filter(e=>e.inst===ins);
const sers=(sid,ins:string=U.ins)=>insE(ins).map(e=>lv(sid,e));
function lp(sid,ins:string=U.ins){const v=sers(sid,ins).filter(x=>x!=null);return{l:v[v.length-1]??null,p:v.length>1?v[v.length-2]:null}}
const lr=(sid,ins)=>{const E=insE(ins).filter(e=>e.res[sid]);const r=E[E.length-1]?.res[sid],p=E[E.length-2]?.res[sid];return{l:r?.level??null,rk:r?.rank??null,d:r&&p?r.level-p.level:null}};
const byNum=(a:any,b:any)=>(a.num||1e9)-(b.num||1e9)||a.name.localeCompare(b.name,'fa');
function ensureNums(){const mx:any={};D.students.forEach(s=>{if(s.num)mx[s.cls]=Math.max(mx[s.cls]||0,s.num)});D.students.forEach(s=>{if(!s.num){mx[s.cls]=(mx[s.cls]||0)+1;s.num=mx[s.cls]}})}
function ensureSch(){if(!D.sch)D.sch={exams:[]};if(!D.sch.v2){D.sch.exams=D.sch.exams.filter(e=>!/^h[0-2]$/.test(e.id));D.sch.v2=1;save()}return D.sch}
const sexams=()=>[...ensureSch().exams].sort((a:any,b:any)=>a.date<b.date?-1:1);
const ofc=c=>D.students.filter(s=>c==='all'||s.cls===c);
function snap(ins:string=U.ins){const E=insE(ins);return D.students.map(s=>{const{l,p}=lp(s.id,ins);return{...s,l,d:p==null||l==null?null:l-p,rk:(E[E.length-1]?.res[s.id]||{}).rank}})}
/* ---------- charts (oldest at right for RTL) ---------- */
function line(labels,series){const W=600,H=230,pl=40,pr=12,pt=14,pb=34,all=series.flatMap(s=>s.v).filter(x=>x!=null);if(!all.length)return'<p class="m">داده‌ای نیست</p>';
 const lo=Math.floor(Math.min(...all)/500)*500,hi=Math.ceil(Math.max(...all)/500)*500||lo+500,N=Math.max(labels.length-1,1);
 const X=i=>W-pr-(W-pl-pr)*i/N,Y=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo||1));
 let o=`<svg viewBox="0 0 ${W} ${H}" width="100%">`;
 for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4,y=Y(v);o+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="var(--bd)"/><text x="${pl-4}" y="${y+4}" text-anchor="end">${n(v)}</text>`}
 labels.forEach((l,i)=>o+=`<text x="${X(i)}" y="${H-12}" text-anchor="middle">${esc(l)}</text>`);
 series.forEach(s=>{let d='',st=0;s.v.forEach((v,i)=>{if(v==null){st=0;return}d+=(st?'L':'M')+X(i)+' '+Y(v)+' ';st=1});o+=`<path d="${d}" fill="none" stroke="${s.c}" stroke-width="2.4"/>`;s.v.forEach((v,i)=>{if(v!=null)o+=`<circle cx="${X(i)}" cy="${Y(v)}" r="3.2" fill="${s.c}"><title>${esc(s.name)}: ${n(v)}</title></circle>`})});
 o+='</svg>';if(series.length>1)o+='<div class="m">'+series.map(s=>`<span style="color:${s.c}">●</span> ${esc(s.name)}`).join(' &nbsp; ')+'</div>';return o}
function bars(items,fmt=n){if(!items.length)return'<p class="m">داده‌ای نیست</p>';const mx=Math.max(...items.map(i=>Math.abs(i.v)),1);return items.map(i=>`<div style="margin:6px 0"><div style="display:flex;justify-content:space-between"><span>${esc(i.l)}</span><b>${fmt(i.v)}</b></div><div class="bar"><i style="width:${Math.max(2,Math.abs(i.v)/mx*100)}%;background:${i.c||'var(--ac)'}"></i></div></div>`).join('')}
/* ---------- state & nav ---------- */
const U:any={p:'home',ins:'ماز',sx:null,es:'g',rc:CL[0],rs:'num',rx:null,as:'o',xs:'cal',xc:CL[0],w:null,sv:'',gm:'a',cls:'all',q:'',ex:null,ct:'trend',sort:'num'};
const PG=[['home','خانه','home'],['day','روز','att'],['ex','معافیت','cal'],['stu','دانش‌آموزان','users'],['exm','آزمون‌ها','clip'],['ann','اطلاعیه‌ها','bell'],['con','مشاوره','chat'],['srv','سرور','cloud'],['exp','ابزار','tool']];
function go(p){U.p=p;VSIG='';draw()}
let VSIG='',bgT:any=0;
/* بازرسم پس‌زمینه (بعد از دریافت/ارسال داده با سرور): اگر کاربر مشغول تایپ است صبر می‌کند تا متنش پاک نشود */
function bgDraw(){const a=document.activeElement as HTMLElement|null;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.closest&&a.closest('#app')){clearTimeout(bgT);bgT=setTimeout(bgDraw,3000);return}draw()}
function draw(){const sig=[U.p,U.sid,U.xs,U.stab,U.X&&U.X.tab,U.AT&&U.AT.tab].join('|'),nav=sig!==VSIG,y=window.scrollY;VSIG=sig;ensureNums();ensureEx();if(typeof AT2!=='undefined')AT2.warm();if(U.w==null)U.w=wk0();$('#dt').textContent=new Date().toLocaleDateString('fa-IR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const cur=U.p==='sp'?'stu':U.p;$('#nv').innerHTML=PG.map(([k,t,i])=>`<button class="${cur===k?'on':''}" onclick="go('${k}')" aria-label="${t}">${ic(i)}<span>${t}</span>${k==='exm'&&SV.pend()?`<i class="bdg">${n(SV.pend())}</i>`:''}${k==='day'&&AT2.badge()?`<i class="bdg">${n(AT2.badge())}</i>`:''}</button>`).join('');
 $('#pt').textContent=U.p==='sp'?'پروفایل دانش‌آموز':(PG.find(p=>p[0]===U.p)||[,''])[1];
 if(nav){$('#app').classList.remove('in');void ($('#app') as any).offsetWidth;$('#app').classList.add('in')}
 $('#app').innerHTML=({home,ex:xpg,stu,day:()=>AT2.page(),exm:()=>EX.page(),ana:()=>EX.page(),ann:annPage,con:()=>SV.conPage(),srv:()=>SV.page(),exp,sp:spage})[U.p]();window.scrollTo(0,nav?0:y)}
const insSeg=()=>`<div class="seg">${['ماز','قلم‌چی'].map(i=>`<button class="${U.ins===i?'on':''}" onclick="U.ins='${i}';draw()">مبنا: ${i}</button>`).join('')}</div>`;
const chips=()=>`<div class="seg">${['all',...CL].map(c=>`<button class="${U.cls===c?'on':''}" onclick="U.cls='${c}';draw()">${c==='all'?'همه کلاس‌ها':c}</button>`).join('')}</div>`;
/* ---------- dashboard ---------- */
function dash(){const E=insE(),le=E[E.length-1],pe=E[E.length-2],S=snap();
 const avL=avg(S.map(s=>s.l)),pL=pe?avg(D.students.map(s=>lv(s.id,pe))):null,lL=le?avg(D.students.map(s=>lv(s.id,le))):null;
 const miss=le?D.students.filter(s=>!le.res[s.id]):[];
 const att=S.map(s=>{const r=[];if(s.d!=null&&s.d<=-400)r.push('افت تراز');if(s.l!=null&&s.l<5000)r.push('تراز پایین');return{...s,r}}).filter(s=>s.r.length).sort((a,b)=>b.r.length-a.r.length||(a.d||0)-(b.d||0));
 const row=(s,x)=>`<div class="row" onclick="op('${s.id}')"><span>${esc(s.name)} <span class="tag">${s.cls}</span></span><span>${x}</span></div>`;
 return `<div class="g">
 <div class="c k"><b>${n(D.students.length)}</b><span>دانش‌آموز (تجربی ${n(ofc('تجربی ۳۲۱').length+ofc('تجربی ۳۲۲').length)} · ریاضی ${n(ofc('ریاضی ۳۱۱').length)})</span></div>
 <div class="c k"><b>${n(lL)}</b><span>میانگین تراز آخرین آزمون ${pL!=null&&lL!=null?dl(lL-pL):''}</span></div>
 <div class="c k"><b>${n(att.length)}</b><span>نیازمند توجه</span></div>
 <div class="c k"><b>${n(miss.length)}</b><span>بدون نتیجه در آخرین آزمون</span></div></div>
 <div class="c" style="margin-top:10px"><h3>کلاس‌ها ${le?`<span class="m">— ${esc(le.title)}، ${le.date}</span>`:''}</h3><div class="g">${CL.map((c,i)=>{const ss=ofc(c);return `<div class="c" style="border-top:3px solid ${CC[i]}"><b>${c}</b> <span class="m">${n(ss.length)} نفر</span><div class="m">میانگین تراز: <b style="color:var(--tx)">${n(avg(ss.map(s=>lv(s.id,le))))}</b></div></div>`}).join('')}</div></div>
 <div class="g2" style="margin-top:10px">
 <div class="c"><h3>روند میانگین تراز کلاس‌ها</h3>${line(E.map(e=>e.date.slice(5)),CL.map((c,i)=>({name:c,c:CC[i],v:E.map(e=>avg(ofc(c).map(s=>lv(s.id,e))))})))}</div>
 <div class="c"><h3>⚠️ نیازمند توجه</h3>${att.slice(0,7).map(s=>row(s,s.r.map(t=>`<span class="tag r">${t}</span>`).join(''))).join('')||'<p class="m">موردی نیست 🎉</p>'}</div>
 <div class="c"><h3>🏆 برترین‌ها (آخرین تراز)</h3>${[...S].filter(s=>s.l!=null).sort((a,b)=>b.l-a.l).slice(0,5).map((s,i)=>row(s,`${n(i+1)}. <b>${n(s.l)}</b>`)).join('')}</div>
 <div class="c"><h3>📈 بیشترین پیشرفت</h3>${[...S].filter(s=>s.d!=null).sort((a,b)=>b.d-a.d).slice(0,5).map(s=>row(s,dl(s.d))).join('')}</div>
 </div>
 <div class="c" style="margin-top:10px"><h3>میان‌برها</h3><div class="tb"><button class="btn p" onclick="xgo('mg')">ثبت آزمون جدید</button><button class="btn" onclick="xgo('in')">اسکن کارنامه</button><button class="btn" onclick="go('stu')">افزودن دانش‌آموز</button><button class="btn" onclick="xgo('ex')">نتایج آزمون‌ها</button><button class="btn" onclick="go('exp')">گرفتن خروجی</button></div>
 </div>`}
/* ---------- students ---------- */
const spark=(v:any[])=>{const a=v.filter(x=>x!=null);if(a.length<2)return '<span class="m">—</span>';const lo=Math.min(...a),hi=Math.max(...a),W=64,H=20,X=(i:number)=>W-2-(W-4)*i/(a.length-1),Y=(x:number)=>H-2-(H-4)*(x-lo)/((hi-lo)||1);return `<svg width="${W}" height="${H}"><polyline fill="none" stroke="${a[a.length-1]>=a[0]?'var(--ok)':'var(--bad)'}" stroke-width="2" points="${a.map((x,i)=>X(i)+','+Y(x)).join(' ')}"/></svg>`};
function stuRows(){const k=U.sort,q=U.q.trim();return snap().filter(s=>(U.cls==='all'||s.cls===U.cls)&&(!q||s.name.includes(q)||String(s.num)===q)).sort((a,b)=>k==='n'?a.name.localeCompare(b.name,'fa'):k==='l'?(b.l||0)-(a.l||0):k==='d'?(b.d??-1e9)-(a.d??-1e9):(a.cls===b.cls?(a.num||1e9)-(b.num||1e9):a.cls.localeCompare(b.cls,'fa')))}
function stu(){const S=stuRows(),wl=S.filter(s=>s.l!=null),dr=S.filter(s=>s.d!=null&&s.d<=-400).length,best=[...S].filter(s=>s.d!=null).sort((a,b)=>b.d-a.d)[0];
 return chips()+insSeg()+`<div class="g" style="margin-bottom:10px"><div class="c k"><b>${n(S.length)}</b><span>دانش‌آموز</span></div><div class="c k"><b>${n(avg(wl.map(s=>s.l)))}</b><span>میانگین تراز ${U.ins}</span></div><div class="c k"><b>${n(wl.length)}</b><span>دارای نتیجه ${U.ins}</span></div><div class="c k"><b class="${dr?'dn':''}">${n(dr)}</b><span>افت ۴۰۰+ تراز</span></div>${best&&best.d>0?`<div class="c k" onclick="op('${best.id}')" style="cursor:pointer"><b style="font-size:16px">${esc(best.name)}</b><span>بیشترین پیشرفت ${dl(best.d)}</span></div>`:''}</div>
 <div class="tb"><input placeholder="جستجوی نام یا شماره…" value="${esc(U.q)}" oninput="U.q=this.value;sr()"><button class="btn" onclick="renum('a')">شماره‌گذاری الفبایی</button><button class="btn" onclick="renum('l')">شماره‌گذاری به ترتیب فعلی</button></div>
 <div class="c tw" id="tl">${stbl(S)}</div>
 <div class="c" style="margin-top:10px"><h3>افزودن دانش‌آموز</h3><div class="tb"><select id="ac">${CL.map(c=>`<option ${c===U.cls?'selected':''}>${c}</option>`).join('')}</select><span class="m">هر خط یک نفر: شماره، نام، فامیل، کد ملی (۱۰ رقم). مثال: «۱۲ علی احمدی ۰۰۱۲۳۴۵۶۷۸». شماره‌ی تلفن والدین (۰۹…) را اگر خواستید می‌توانید آخر خط اضافه کنید؛ اجباری نیست.</span></div><textarea id="an" placeholder="۱ علی احمدی ۰۰۱۲۳۴۵۶۷۸&#10;۲ رضا کریمی ۰۰۹۸۷۶۵۴۳۲"></textarea><button class="btn p" onclick="addS()">افزودن</button></div>`}
const stbl=S=>{const dup:any={};S.forEach(s=>{const k=s.cls+'|'+s.num;dup[k]=(dup[k]||0)+1});const th=(k:string,t:string)=>`<th style="cursor:pointer" onclick="U.sort='${k}';draw()">${t}${U.sort===k?' ▾':''}</th>`;
 return `<table><thead><tr>${th('num','شماره')}${th('n','نام')}<th>کلاس</th><th>گروه</th>${th('l','تراز ماز')}<th>رتبه ماز</th><th>تراز قلم‌چی</th><th>رتبه قلم‌چی</th><th>روند ${U.ins}</th></tr></thead><tbody>${S.map(s=>{const a=lr(s.id,'ماز'),b=lr(s.id,'قلم‌چی'),g=ensureEx().g[s.id],g2=isDual(s.cls)?ensureEx().g2[s.id]:'';return `<tr onclick="op('${s.id}')"><td onclick="event.stopPropagation()"><input type="number" min="1" value="${s.num??''}" style="width:58px;${dup[s.cls+'|'+s.num]>1?'border-color:var(--bad)':''}" onchange="setNum('${s.id}',this.value)"></td><td>${esc(s.name)}</td><td>${s.cls}</td><td>${g?`<span class="tag" style="background:${GC[GL.indexOf(g)]};color:#fff">${g}</span>`:'—'}${g2?`<span class="tag" style="background:${GC[GL.indexOf(g2)]};color:#fff" title="گروه‌بندی دوتایی">${g2}²</span>`:''}</td><td>${n(a.l)} ${dl(a.d)}</td><td>${n(a.rk)}</td><td>${n(b.l)} ${dl(b.d)}</td><td>${n(b.rk)}</td><td>${spark(sers(s.id))}</td></tr>`}).join('')}</tbody></table>`};
function sr(){$('#tl').innerHTML=stbl(stuRows())}
const setNum=(id:string,v:string)=>{D.students.find(x=>x.id===id).num=+v||undefined;save();draw()};
function renum(mode:string){if(U.cls==='all'){alert('اول یک کلاس را از بالا انتخاب کنید.');return}if(!confirm('کلاس '+U.cls+' از ۱ شماره‌گذاری مجدد شود؟'))return;const ss=D.students.filter(x=>x.cls===U.cls);if(mode==='a')ss.sort((a,b)=>a.name.localeCompare(b.name,'fa'));ss.forEach((x,i)=>x.num=i+1);save();draw()}
const nidClean=(v:string)=>String(v).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g,'');
const sf=(id:string,k:string,v:string)=>{const x=D.students.find(z=>z.id===id);if(k==='num')x.num=+v||undefined;else if(k==='cls'){x.cls=v;delete ensureEx().g[id];delete ensureEx().g2[id];x.num=undefined;ensureNums()}else if(k==='nid')x.nid=nidClean(v);else x[k]=v.trim();save();draw()};
function addS(){const c=$('#ac').value;let mx=Math.max(0,...D.students.filter(x=>x.cls===c).map(x=>x.num||0)),noId=0,bad=0;
 $('#an').value.split('\n').map(x=>x.trim()).filter(Boolean).forEach(raw=>{let line=nidClean0(raw),nid='',phone='';const pm=line.match(/(?:^|\s)(09\d{9})(?=\s|$)/);if(pm){phone=pm[1];line=line.replace(pm[1],' ').replace(/\s+/g,' ').trim()}const t=line.match(/^(.*\S)\s+(\d{10})$/);if(t){line=t[1];nid=t[2]}
  const m=line.match(/^(\d+)\s*[-.،,:)\t ]\s*(.+)$/);const num=m?+m[1]:++mx;if(num>mx)mx=num;const name=m?m[2].trim():line;if(!nid){noId++;if(/\d{6,}/.test(name))bad++}
  const id='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);D.students.push({id,name,cls:c,num,nid,phone,note:''});D.grades[id]={}});
 save();draw();if(noId)toast(n(noId)+' نفر بدون کد ملی ثبت شد؛ بعداً در پروفایلشان وارد کنید.')}
const nidClean0=(s:string)=>String(s).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
/* ---------- صفحه‌ی کامل دانش‌آموز ---------- */
function op(id:string){if(U.p!=='sp')U.back=U.p;U.sid=id;U.stab='ov';U.p='sp';$('#md').classList.remove('on');draw()}
function stuNav(d:number){const s=D.students.find(x=>x.id===U.sid),L=D.students.filter(x=>x.cls===s.cls).sort(byNum),t=L[L.findIndex(x=>x.id===s.id)+d];if(t){U.sid=t.id;draw();window.scrollTo(0,0)}}
function exCard(e:any,s:any){const r=e.res[s.id],mates=D.students.filter(x=>x.cls===s.cls&&e.res[x.id]),rc=1+mates.filter(x=>e.res[x.id].level>r.level).length,same=exs().filter(x=>x.inst===e.inst&&x.res[s.id]),pi=same.findIndex(x=>x.id===e.id),pl=pi>0?same[pi-1].res[s.id].level:null,keys=Object.keys(r.subj||{});
 return `<details class="c" style="margin-top:8px"><summary style="cursor:pointer;display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap"><span><b>${esc(e.title)}</b> <span class="tag">${e.inst}</span> <span class="m">${esc(e.date)}</span></span><span>تراز <b>${n(r.level)}</b> ${pl!=null?dl(r.level-pl):''} · رتبه ${n(r.rank)} · در کلاس ${n(rc)} از ${n(mates.length)}</span></summary>
 <div class="tw" style="margin-top:8px"><table><thead><tr><th>درس</th><th>درصد</th><th>درست/غلط/نزده</th><th>تراز درس</th><th>میانگین کلاس</th></tr></thead><tbody>${keys.map(k=>{const v=r.subj[k],ca=avg(mates.map(x=>e.res[x.id].subj?.[k])),w=r.raw?.[k];return `<tr style="cursor:default"><td>${esc(k)}</td><td style="${hue(v)}"><b>${n(v)}٪</b></td><td>${w?`${n(w[0])} / ${n(w[1])} / ${n(w[2])}`:'—'}</td><td>${n(r.slv?.[k])}</td><td>${n(ca)}٪ ${dl(ca==null?null:v-ca)}</td></tr>`}).join('')}</tbody></table></div></details>`}
function spage(){const s=D.students.find(x=>x.id===U.sid);if(!s){U.p='stu';return stu()}
 const id=s.id,E=ensureEx(),g=E.g[id],mates=D.students.filter(x=>x.cls===s.cls).sort(byNum),ix=mates.findIndex(x=>x.id===id),mine=exs().filter(e=>e.res[id]),sch=sexams().filter(e=>e.cls===s.cls&&e.sc[id]);
 const kp=(ins:string)=>{const a=lr(id,ins);return `<div class="c k"><span>تراز ${ins}</span><b>${n(a.l)}</b><span>${a.d!=null?dl(a.d)+' · ':''}رتبه ${n(a.rk)}</span></div>`};
 const hero=`<div class="c hero"><div class="av">${n(s.num)}</div><div style="flex:1;min-width:150px"><h2 style="margin:0">${esc(s.name)}</h2><div class="m">${s.cls} · شماره ${n(s.num)}${s.nid?` · کد ملی <span dir="ltr">${esc(s.nid)}</span>`:''}${s.phone?` · 📞 والدین <a href="tel:${esc(s.phone)}" dir="ltr">${esc(s.phone)}</a>`:''}</div><div>${g?`<span class="tag" style="background:${GC[GL.indexOf(g)]};color:#fff">گروه ${g}</span>`:'<span class="tag">بدون گروه</span>'}${isDual(s.cls)&&E.g2[id]?`<span class="tag" style="background:${GC[GL.indexOf(E.g2[id])]};color:#fff">دوتایی: ${E.g2[id]}</span>`:''}<span class="tag">${n(mine.length)} آزمون</span></div></div><div class="tb"><button class="btn" ${ix>0?'':'disabled'} onclick="stuNav(-1)">▶ قبلی</button><button class="btn" ${ix<mates.length-1?'':'disabled'} onclick="stuNav(1)">بعدی ◀</button><button class="btn p" onclick="U.p=U.back||'stu';draw()">↩ بازگشت</button></div></div>`;
 const kpis=`<div class="g" style="margin:10px 0">${kp('ماز')}${kp('قلم‌چی')}<div class="c k"><b>${n(sch.length)}</b><span>آزمون مدرسه</span></div><div class="c k" style="cursor:pointer" onclick="xstu('${id}')"><b>📝</b><span>همه‌ی نتایج آزمون‌های او ←</span></div>${AT2.kpi(s)}</div>`;
 const tab=U.stab||'ov';let body='';
 if(tab==='ov'){
  const sm:any={};mine.forEach(e=>Object.entries(e.res[id].subj||{}).forEach(([k,v]:any)=>(sm[k]=sm[k]||[]).push(v)));
  const rows=Object.entries(sm).map(([k,a]:any)=>({k,last:a[a.length-1],prev:a.length>1?a[a.length-2]:null,av:avg(a),c:a.length})).sort((x,y)=>y.av-x.av);
  body=`<div class="g2">${['ماز','قلم‌چی'].map(ins=>{const Ei=insE(ins),has=Ei.filter(e=>e.res[id]);return `<div class="c"><h3>روند تراز ${ins}</h3>${has.length>1?line(Ei.map(e=>e.date.slice(5)),[{name:ins,c:'var(--ac)',v:sers(id,ins)}]):`<p class="m">${has.length?'فقط یک آزمون ثبت شده':'نتیجه‌ای ثبت نشده'}</p>`}</div>`}).join('')}</div>
  <div class="c tw" style="margin-top:10px"><h3>وضعیت دروس در همه‌ی آزمون‌ها ${rows.length?`<span class="m">قوی‌ترین: <b>${esc(rows[0].k)}</b> · ضعیف‌ترین: <b>${esc(rows[rows.length-1].k)}</b></span>`:''}</h3>${rows.length?`<table><thead><tr><th>درس</th><th>آخرین</th><th>تغییر</th><th>میانگین کل</th><th>تعداد آزمون</th></tr></thead><tbody>${rows.map(r=>`<tr style="cursor:default"><td>${esc(r.k)}</td><td style="${hue(r.last)}"><b>${n(r.last)}٪</b></td><td>${dl(r.prev==null?null:r.last-r.prev)}</td><td style="${hue(r.av)}">${n(r.av)}٪</td><td>${n(r.c)}</td></tr>`).join('')}</tbody></table>`:'<p class="m">هنوز درصدی ثبت نشده</p>'}</div>`}
 else if(tab==='rep'){
  const f=U.rf&&U.rf!=='all'?U.rf:null,list=mine.filter(e=>!f||e.inst===f),subs=[...new Set(list.flatMap(e=>Object.keys(e.res[id].subj||{})))] as string[];
  body=seg('rf',[['all','همه'],['ماز','ماز'],['قلم‌چی','قلم‌چی']])+(list.length?`<div class="c tw"><table><thead><tr><th>تاریخ</th><th>مؤسسه</th><th>آزمون</th><th>تراز</th><th>رتبه</th>${subs.map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${[...list].reverse().map(e=>{const r=e.res[id];return `<tr style="cursor:default"><td>${esc(e.date)}</td><td>${e.inst}</td><td>${esc(e.title)}</td><td><b>${n(r.level)}</b></td><td>${n(r.rank)}</td>${subs.map(k=>{const v=r.subj?.[k];return `<td style="${v==null?'':hue(v)}">${v==null?'—':n(v)+'٪'}</td>`}).join('')}</tr>`}).join('')}</tbody></table></div><p class="m" style="margin:10px 0 0">برای دیدن جزئیات هر آزمون روی آن بزنید:</p>${[...list].reverse().map(e=>exCard(e,s)).join('')}`:'<div class="c m">آزمونی ثبت نشده است.</div>')}
 else if(tab==='sch'){
  body=[...sch].reverse().map(e=>{const mm=D.students.filter(x=>x.cls===e.cls);return `<div class="c" style="margin-bottom:10px"><h3>${esc(e.title)} <span class="m">${esc(e.date)}</span></h3>${bars(e.lessons.filter(l=>e.sc[id][l.name]!=null).map(l=>({l:`${l.name} (از ${n(l.max)}) · میانگین کلاس ${n1(avg(mm.map(x=>e.sc[x.id]?.[l.name])))}`,v:e.sc[id][l.name]})),n1)}</div>`}).join('')||'<div class="c m">برای این دانش‌آموز نمره‌ی آزمون مدرسه ثبت نشده است.</div>'}
 else if(tab==='ex'){
  const w=U.w,cl=s.cls,pw=(E.pw[w]||{})[id],subs=[...new Set(tt(cl).flat().filter(Boolean))] as string[];let cnt=0;
  let gr=`<div class="cal"><div></div>${[0,1,2,3].map(d=>{const L=letterC(cl,d,w);return `<div class="ch" style="--gc:${GC[GL.indexOf(L)]}"><b>${DAYN[d]}</b><span>${jd(dateOf(w,d))}</span><i>${L}</i></div>`}).join('')}`;
  for(let p=0;p<E.per;p++){gr+=`<div class="cp">${n(p+1)}</div>`;for(let d=0;d<4;d++){const st=status(id,cl,w,d,p);if(st)cnt++;gr+=`<div class="cell ${st?'x'+st:''}" style="--gc:${GC[GL.indexOf(letterC(cl,d,w))]}"><b>${esc(subj(cl,d,p))}</b><em>${st?({g:'معافیت گروه',f:'معافیت معلم',p:'معافیت پیشرفت'} as any)[st]:'حضور'}</em></div>`}}
  const hist=Object.keys(E.pw).filter(k=>E.pw[k][id]).sort((a,b)=>+b-+a);
  body=`<div class="c"><div class="tb"><b>گروه:</b><select onchange="setG('${id}',this.value)">${['','A','B','C','D'].map(L=>`<option value="${L}" ${(g||'')===L?'selected':''}>${L||'بدون گروه'}</option>`).join('')}</select></div></div>${wnav()}<p class="m">${n(cnt)} ساعت معافیت در این هفته</p>${gr}
  <div class="g2" style="margin-top:10px"><div class="c"><h3>معافیت پیشرفت این هفته</h3>${pw?`${pw.map((k:string)=>{const[d,p]=k.split('-');return `<span class="tag">${DAYN[+d]} ساعت ${n(+p+1)} ${esc(subj(cl,+d,+p))}</span>`}).join('')}<div style="margin-top:8px"><button class="btn" onclick="revoke('${id}')">لغو</button></div>`:`<button class="btn p" onclick="grant('${id}')">اعطا</button>`}<h3 style="margin-top:14px">درس‌های دلخواه برای معافیت</h3><div class="chips">${subs.map(k=>`<button class="${(E.skip[id]||[]).includes(k)?'on':''}" onclick="tgSkip('${id}','${esc(k)}')">${esc(k)}</button>`).join('')}</div></div>
  <div class="c"><h3>سابقه‌ی معافیت پیشرفت</h3>${hist.map(k=>`<div class="row" style="cursor:default"><span>هفته‌ی ${jd(dateOf(+k,0))}</span><span class="m">${E.pw[k][id].map((q:string)=>{const[d,p]=q.split('-');return DAYN[+d]+' '+subj(cl,+d,+p)}).join('، ')}</span></div>`).join('')||'<p class="m">تا حالا نداشته</p>'}</div></div>`}
 else if(tab==='abs'){body=AT2.stuTab(s)}
 else{
  if(s.note&&!s.notes){s.notes=[{d:'',x:s.note}];s.note='';save()}const ac=D.srv?.accounts?.[id];
  body=`<div class="g2"><div class="c"><h3>مشخصات</h3><div class="tb" style="flex-direction:column;align-items:stretch"><label class="m">نام <input style="width:100%" value="${esc(s.name)}" onchange="sf('${id}','name',this.value)"></label><label class="m">شماره <input type="number" style="width:100%" value="${s.num??''}" onchange="sf('${id}','num',this.value)"></label><label class="m">کلاس <select style="width:100%" onchange="sf('${id}','cls',this.value)">${CL.map(c=>`<option ${c===s.cls?'selected':''}>${c}</option>`).join('')}</select></label><label class="m">کد ملی <input dir="ltr" inputmode="numeric" maxlength="10" style="width:100%" value="${esc(s.nid||'')}" onchange="sf('${id}','nid',this.value)"></label><label class="m">تلفن والدین (اختیاری) <input dir="ltr" inputmode="tel" style="width:100%" value="${esc(s.phone||'')}" onchange="sf('${id}','phone',this.value)"></label></div>
  <p class="m">${ac?`حساب پنل: <span dir="ltr">${esc(ac.username)}</span> ${ac.active?'(فعال)':'(غیرفعال)'}`:'حساب پنل ندارد (بخش سرور)'}</p><button class="btn" style="color:var(--bad)" onclick="delS('${id}')">حذف دانش‌آموز</button></div>
  <div class="c"><h3>سابقه‌ی مشاوره (${n((D.consult||[]).filter((q:any)=>q.lid===id).length)} جلسه)</h3>${(D.consult||[]).filter((q:any)=>q.lid===id).map((q:any)=>`<div class="row" style="cursor:default"><span>${q.slot_date?new Date(q.slot_date+'T12:00:00').toLocaleDateString('fa-IR',{weekday:'long',day:'numeric',month:'long'}):'—'}</span><span class="m">${esc(q.note||'')}</span></div>`).join('')||'<p class="m">جلسه‌ای ثبت نشده</p>'}</div>
  <div class="c"><h3>یادداشت‌های مدیر</h3><textarea id="nt" placeholder="یادداشت جدید…"></textarea><button class="btn p" onclick="addNote('${id}')">افزودن یادداشت</button>${(s.notes||[]).map((q:any,i:number)=>`<div class="row" style="cursor:default"><span>${esc(q.x)}<br><span class="m">${esc(q.d)}</span></span><button class="btn" onclick="delNote('${id}',${i})">✕</button></div>`).reverse().join('')}</div></div>`}
 return hero+kpis+seg('stab',[['ov','📊 نمای کلی'],['rep','📄 همه‌ی آزمون‌ها'],['sch','🏫 مدرسه'],['ex','📅 معافیت'],['abs','🚫 غیبت‌ها'],['set','⚙️ مشخصات و یادداشت']])+body}
const addNote=(id:string)=>{const t=$('#nt').value.trim();if(!t)return;const s=D.students.find(x=>x.id===id);(s.notes=s.notes||[]).push({d:today(),x:t});save();draw()};
const delNote=(id:string,i:number)=>{const s=D.students.find(x=>x.id===id);s.notes.splice(i,1);save();draw()};
const cm=()=>{$('#md').classList.remove('on');draw()};
const sg=(id,k,i,v)=>{D.grades[id][k][i]=Math.max(0,Math.min(20,+v||0));save()};
const sn=(id,v)=>{D.students.find(x=>x.id===id).note=v;save()};
function delS(id){if(!confirm('این دانش‌آموز و نتایجش حذف شود؟'))return;D.students=D.students.filter(x=>x.id!==id);delete D.grades[id];D.exams.forEach(e=>delete e.res[id]);ensureSch().exams.forEach(e=>delete e.sc[id]);save();U.p=U.back&&U.back!=='sp'?U.back:'stu';draw()}
/* ---------- exams ---------- */
function exm(){const E=exs().reverse();if(!U.ex||!D.exams.find(e=>e.id===U.ex))U.ex=E[0]?.id;const e=D.exams.find(x=>x.id===U.ex);
 return `<div class="g2"><div class="c"><h3>آزمون‌ها</h3>${E.map(x=>`<div class="row" onclick="U.ex='${x.id}';draw()" style="${x.id===U.ex?'font-weight:800;color:var(--ac)':''}"><span>${esc(x.title)} <span class="tag">${x.inst}</span></span><span class="m">${x.date} · ${n(Object.keys(x.res).length)} نفر · ${n(avg(Object.values(x.res as any).map((r:any)=>r.level)))}</span></div>`).join('')||'<p class="m">آزمونی نیست</p>'}</div>
 <div class="c"><h3>ثبت آزمون جدید</h3><div class="tb"><input id="et" placeholder="عنوان (مثلاً قلم‌چی ۸ آبان)"><select id="ei" onchange="document.getElementById('ec').style.display=this.value==='مدرسه'?'':'none'"><option>ماز</option><option>قلم‌چی</option><option>مدرسه</option></select><select id="ec" style="display:none">${CL.map(c=>`<option ${c===U.xc?'selected':''}>${c}</option>`).join('')}</select><input id="ed" value="${today()}" style="width:110px"></div><button class="btn p" onclick="addE()">ایجاد آزمون</button>
 <p class="m">نتایج را بعد از ساخت، از طریق چسباندن لیست «نام، تراز، رتبه» وارد کنید. یا از بخش «اسکن کارنامه» فایل کارنامه‌ی ماز/قلم‌چی را بدهید.</p></div></div>
 ${e?`<div class="c" style="margin-top:10px"><h3>${esc(e.title)} <span class="m">${e.date}</span> <button class="btn" style="float:left;color:var(--bad)" onclick="delE('${e.id}')">حذف</button></h3>
 <div class="tw"><table><thead><tr><th>#</th><th>نام</th><th>کلاس</th><th>تراز</th><th>رتبه</th></tr></thead><tbody>${D.students.filter(s=>e.res[s.id]).sort((a,b)=>e.res[b.id].level-e.res[a.id].level).map((s,i)=>`<tr onclick="op('${s.id}')"><td>${n(i+1)}</td><td>${esc(s.name)}</td><td>${s.cls}</td><td>${n(e.res[s.id].level)}</td><td>${n(e.res[s.id].rank)}</td></tr>`).join('')}</tbody></table></div>
 <h3 style="margin-top:12px">چسباندن نتایج</h3><textarea id="pr" placeholder="علی احمدی, 7250, 21000"></textarea><button class="btn p" onclick="paste('${e.id}')">ثبت نتایج</button> <span class="m" id="pm"></span></div>`:''}`}
function addE(){const t=$('#et').value.trim();if(!t)return;if($('#ei').value==='مدرسه'){mkSch(t,$('#ed').value.trim(),$('#ec').value);draw();return}const id='e'+Date.now().toString(36);D.exams.push({id,title:t,inst:$('#ei').value,date:$('#ed').value.trim(),res:{}});U.ex=id;save();draw()}
function paste(id){const e=D.exams.find(x=>x.id===id);let ok=0,bad=0;$('#pr').value.split('\n').forEach(l=>{const p=l.split(/[,\t،]/).map(x=>x.trim().replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));if(p.length<2)return;const s=D.students.find(x=>x.name===p[0]);const lvl=+p[1];if(!s||isNaN(lvl)){bad++;return}e.res[s.id]={level:lvl,rank:+p[2]||null,subj:{}};ok++});save();draw();$('#pm').textContent=`${n(ok)} ثبت شد، ${n(bad)} ردیف نامعتبر`}
function delE(id){if(!confirm('آزمون حذف شود؟'))return;D.exams=D.exams.filter(x=>x.id!==id);U.ex=null;save();draw()}
/* ---------- charts ---------- */
const CT=[['trend','روند کلاس‌ها'],['cmp','مقایسه کلاس‌ها در یک آزمون'],['subj','میانگین دروس'],['dist','توزیع تراز'],['sav','🏫 میانگین دروس یک آزمون مدرسه'],['sstu','🏫 نمره‌ی دانش‌آموزان در یک درس'],['sdist','🏫 توزیع نمره‌ها در یک درس']];
function cht(){const E=insE(),ex=E.find(e=>e.id===U.ex)||E[E.length-1];U.ex=ex?.id;let h='';const se:any=ensureSch().exams.find(e=>e.id===U.sx)||sexams().slice(-1)[0];
 if(U.ct==='trend')h=line(E.map(e=>e.date.slice(5)),(U.cls==='all'?CL:[U.cls]).map((c,i)=>({name:c,c:CC[CL.indexOf(c)],v:E.map(e=>avg(ofc(c).map(s=>lv(s.id,e))))})));
 else if(U.ct==='cmp')h=bars(CL.map((c,i)=>({l:c,v:avg(ofc(c).map(s=>lv(s.id,ex)))||0,c:CC[i]})));
 else if(U.ct==='subj'){const m={};ofc(U.cls).forEach(s=>Object.entries(ex?.res[s.id]?.subj||{}).forEach(([k,v])=>(m[k]=m[k]||[]).push(v)));h=bars(Object.entries(m).map(([l,a])=>({l,v:avg(a)})),v=>n(v)+'٪')}
 else if(U.ct==='dist'){const b={};ofc(U.cls).forEach(s=>{const v=lv(s.id,ex);if(v!=null){const k=Math.floor(v/1000)*1000;b[k]=(b[k]||0)+1}});h=bars(Object.keys(b).sort().map(k=>({l:`${n(+k)} تا ${n(+k+999)}`,v:b[k]})),v=>n(v)+' نفر')}
 else if(!se)h='<p class="m">هنوز آزمون مدرسه‌ای ثبت نشده است.</p>';
 else{const ss=D.students.filter(x=>x.cls===se.cls),ls=se.lessons.find(l=>l.name===U.sl)||se.lessons[0],col=l=>ss.map(x=>se.sc[x.id]?.[l.name]).filter(x=>x!=null);
  if(U.ct==='sav')h=`<p class="m">${esc(se.title)} — ${se.cls} (${n(ss.length)} نفر)</p>`+bars(se.lessons.map(l=>({l:l.name,v:avg(col(l))||0})),n1);
  else if(!ls)h='';
  else if(U.ct==='sstu')h=`<p class="m">${esc(se.title)} — ${se.cls} — ${esc(ls.name)}</p>`+bars(ss.filter(x=>se.sc[x.id]?.[ls.name]!=null).map(x=>({l:x.name,v:se.sc[x.id][ls.name]})).sort((a,b)=>b.v-a.v),n1);
  else{const st=ls.max/10,b:any={};col(ls).forEach(v=>{const k=Math.min(9,Math.floor(v/st));b[k]=(b[k]||0)+1});h=`<p class="m">${esc(se.title)} — ${se.cls} — ${esc(ls.name)}</p>`+bars(Object.keys(b).sort((p,q)=>+p-+q).map(k=>({l:`${n1(+k*st)} تا ${n1((+k+1)*st)}`,v:b[k]})),v=>n(v)+' نفر')}}
 return chips()+`<div class="tb"><select onchange="U.ct=this.value;draw()">${CT.map(([k,t])=>`<option value="${k}" ${U.ct===k?'selected':''}>${t}</option>`).join('')}</select>${['cmp','subj','dist'].includes(U.ct)?`<select onchange="U.ex=this.value;draw()">${E.map(e=>`<option value="${e.id}" ${e.id===U.ex?'selected':''}>${esc(e.title)}</option>`).join('')}</select>`:''}${['sav','sstu','sdist'].includes(U.ct)?`<select onchange="U.sx=this.value;draw()">${sexams().map(e=>`<option value="${e.id}" ${e.id===se?.id?'selected':''}>${esc(e.title)} (${e.cls})</option>`).join('')}</select>`:''}${['sstu','sdist'].includes(U.ct)&&se?`<select onchange="U.sl=this.value;draw()">${se.lessons.map(l=>`<option ${l.name===(U.sl&&se.lessons.some(z=>z.name===U.sl)?U.sl:se.lessons[0]?.name)?'selected':''}>${esc(l.name)}</option>`).join('')}</select>`:''}<button class="btn" onclick="window.print()">چاپ</button></div><div class="c">${h}</div>`}
/* ---------- export & tools ---------- */
function csvOf(rows){return '\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')}
function saveFile(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
const dlf=(name,rows)=>saveFile(name,new Blob([csvOf(rows)],{type:'text/csv'}));
function exp(){return `<div class="g2"><div class="c"><h3>خروجی CSV (برای اکسل)</h3><div class="tb" style="flex-direction:column;align-items:stretch">
 <button class="btn" onclick="x1()">لیست دانش‌آموزان با آخرین وضعیت</button><button class="btn" onclick="x2()">ماتریس تراز همه‌ی آزمون‌ها</button><button class="btn" onclick="x3()">نمرات مدرسه</button><button class="btn" onclick="x4()">دروس هر آزمون (درصد)</button></div></div>
 <div class="c"><h3>پشتیبان‌گیری و داده</h3><div class="tb"><button class="btn" onclick="bk()">پشتیبان JSON</button><label class="btn">بازیابی از پشتیبان<input type="file" accept=".json" hidden onchange="restoreB(this)"></label><button class="btn" onclick="reset()">بازنشانی به داده‌ی نمونه</button><button class="btn" style="color:var(--bad)" onclick="wipe()">پاک‌کردن همه</button></div><p class="m">${W.__REMOTE?'داده‌ها روی سرور ذخیره می‌شوند و از هر دستگاهی با ورود مدیر در دسترس‌اند.':'داده‌ها فقط در همین مرورگر ذخیره می‌شوند؛ برای انتقال به دستگاه دیگر از پشتیبان JSON استفاده کنید.'}</p></div>${W.__REMOTE?`<div class="c"><h3>نسخه‌های خودکار سرور</h3><p class="m">هر روز یک نسخه از وضعیت ابتدای آن روز ذخیره می‌شود و فقط دو روز اخیر می‌ماند. اگر اشتباهی پیش آمد، از اینجا برگردید.</p><div class="tb"><button class="btn" onclick="snaps()">نمایش نسخه‌ها</button></div><div id="snl"></div></div>`:''}</div>`}
const x1=()=>dlf('students.csv',[['نام','کلاس','تراز ماز','رتبه ماز','تراز قلم‌چی','رتبه قلم‌چی','یادداشت','تلفن والدین'],...D.students.map(s=>{const a=lr(s.id,'ماز'),b=lr(s.id,'قلم‌چی');return [s.name,s.cls,a.l,a.rk,b.l,b.rk,s.note,s.phone||'']})]);
const x2=()=>dlf('exam-levels.csv',[['نام','کلاس',...exs().map(e=>e.inst+' '+e.title)],...D.students.map(s=>[s.name,s.cls,...exs().map(e=>lv(s.id,e))])]);
const x3=()=>{const ex=sexams(),cols:string[]=[];ex.forEach(e=>e.lessons.forEach(l=>cols.push(e.title+' | '+l.name)));dlf('school-exams.csv',[['نام','کلاس',...cols],...D.students.map(s=>[s.name,s.cls,...ex.flatMap(e=>e.lessons.map(l=>e.cls===s.cls?(e.sc[s.id]?.[l.name]??''):''))])])};
const x4=()=>dlf('exam-subjects.csv',[['آزمون','تاریخ','نام','کلاس','درس','درصد'],...exs().flatMap(e=>D.students.flatMap(s=>Object.entries(e.res[s.id]?.subj||{}).map(([k,v])=>[e.title,e.date,s.name,s.cls,k,v])))]);
const bk=()=>saveFile('school-backup.json',new Blob([JSON.stringify(D)],{type:'application/json'}));
async function restoreB(inp){const f=inp.files[0];inp.value='';if(!f)return;try{const o=JSON.parse(await f.text());if(!Array.isArray(o.students)||!Array.isArray(o.exams))throw 0;if(!confirm('همه‌ی داده‌های فعلی این برنامه با فایل پشتیبان جایگزین شود؟'))return;D=o;save();go('home');toast('بازیابی شد')}catch(e){alert('این فایل پشتیبان معتبر نیست.')}}
let SNAPS:any[]=[];
async function snaps(){const el=$('#snl');if(!el)return;el.innerHTML='<p class="m">در حال دریافت…</p>';try{SNAPS=await snapList()}catch(e){el.innerHTML='<p class="m">دریافت نسخه‌ها ناموفق بود.</p>';return}
 el.innerHTML=SNAPS.length?SNAPS.map((s,i)=>`<div class="tb" style="align-items:center;margin-top:8px"><b>${iso2j(s.key.slice(9))}</b><span class="m">${n(s.data.students?.length||0)} دانش‌آموز · ${n(s.data.exams?.length||0)} آزمون</span><button class="btn" onclick="snapRestore(${i})">بازگردانی</button></div>`).join(''):'<p class="m">هنوز نسخه‌ای ساخته نشده است (فردا اولین نسخه ساخته می‌شود).</p>'}
function snapRestore(i){const s=SNAPS[i];if(!s||!confirm('همه‌ی داده‌های فعلی با نسخه‌ی '+iso2j(s.key.slice(9))+' جایگزین شود؟ (پیشنهاد: اول یک پشتیبان JSON بگیرید)'))return;D=s.data;save();go('home');toast('بازگردانی شد')}
const reset=()=>{if(confirm('همه‌ی داده‌ها پاک و داده‌ی نمونه ساخته شود؟')){D=gen();save();go('home')}};
const wipe=()=>{if(confirm('همه‌ی داده‌ها پاک شود؟')){D={students:[],exams:[],grades:{}};save();go('home')}};

/* ---------- scanner ---------- */
const CFG:ExamSettings={sections:SUBJ.map((name,i)=>({id:'u'+i,name,color:'#888',n:0,parts:[]}))};
interface FI{id:number;file:File;st:'busy'|'ok'|'err';err?:string;x?:ImportedExam;sigs:string[];sid:string;done?:boolean;eid?:string;hits?:any[];auto?:boolean}
let FILES:FI[]=[];let FID=0;
async function pick(inp){const fs=Array.from(inp.files||[]) as File[];inp.value='';for(const f of fs){const it:FI={id:++FID,file:f,st:'busy',sigs:[],sid:''};FILES.push(it);}draw();
 for(const it of FILES.filter(f=>f.st==='busy')){try{const r=await importReport(it.file,CFG,D.students.map((s:any)=>s.name));it.x=r.exam;it.sigs=r.sigs;it.st='ok';matchFile(it)}catch(e){it.st='err';it.err=e&&e.message==='layout'?'ساختار کارنامه شناخته نشد (فقط کارنامه‌ی تحلیلی ماز یا PDF قلم‌چی)':'فایل خوانده نشد'}draw()}}
const nzf=(t:string)=>normQ(String(t)).replace(/[\s_\-.()]+/g,' ').trim();
/** who is this sheet? name from the PDF text + from the file name, matched fuzzily against the roster (order-free, typo-tolerant) */
function matchFile(it:FI){const det=it.x?.detected,cands=[det?.name,det?.alt].filter(Boolean) as string[];it.hits=matchStudents(cands,D.students.map((s:any)=>({id:s.id,name:s.name}))).slice(0,4);const c=confident(it.hits);if(c){it.sid=c.id;it.auto=true}}
function detHtml(f:FI){const x=f.x!,det=x.detected,top=f.hits||[],dup=FILES.some(q=>q!==f&&q.sid&&q.sid===f.sid&&q.x&&q.x.institute===x.institute&&q.x.date===x.date);
 return `<div class="m" style="margin:2px 0 8px">${det?.name?`نام روی کارنامه: <b>${esc(det.name)}</b>`:det?.alt?`نام از روی نام فایل: <b>${esc(det.alt)}</b>`:'نام در فایل پیدا نشد؛ دانش‌آموز را انتخاب کنید'}${f.auto&&top[0]?` <span class="tag" style="background:#10b98122">✓ تطبیق خودکار ${n(top[0].score*100)}٪</span>`:top.length?` <span class="tag r">تطبیق مطمئن نیست</span>`:''}${dup?' <span class="tag r">این دانش‌آموز برای همین آزمون در لیست دوباره آمده</span>':''}</div>${det?.crop?`<img class="ncrop" src="${det.crop}" alt="نام روی کارنامه">`:''}${top.length>(f.auto?1:0)?`<div class="chips">${top.map(h=>`<button class="${f.sid===h.id?'on':''}" onclick="sfs(${f.id},'${h.id}');draw()">${esc(h.name)} · ${n(h.score*100)}٪</button>`).join('')}</div>`:''}`}
function guessSid(fn:string){const f=nzf(fn.replace(/\.[^.]+$/,'')),m=D.students.filter((s:any)=>{const t=nzf(s.name).split(' ').filter(Boolean);return t.length>0&&t.every((w:string)=>f.includes(w))});return m.length===1?m[0].id:''}
function scn(){const E=exs();
 return `<div class="c scn"><h3>📄 اسکن کارنامه‌ی ماز و قلم‌چی</h3><p class="m">PDF یا عکس کارنامه‌ها را یک‌جا انتخاب کنید (هر تعداد). مؤسسه، تاریخ و اعداد خودکار خوانده می‌شود. اسم دانش‌آموز از روی خود کارنامه (قلم‌چی) و نام فایل خوانده و با فهرست شما تطبیق داده می‌شود (حتی اگر نام و نام‌خانوادگی جابه‌جا یا غلط باشد). برای ماز، عکس نام کارنامه هم نشان داده می‌شود. اگر تطبیق مطمئن نبود، یکی از پیشنهادها را بزنید.</p>
 <input type="file" id="fi" multiple accept="application/pdf,image/*" onchange="pick(this)"></div>
 ${FILES.map(f=>fcard(f)).join('')}
 ${FILES.some(f=>f.st==='ok'&&!f.done)?`<div class="tb" style="margin-top:10px"><button class="btn p" onclick="commitAll()">ثبت همه‌ی آماده‌ها</button><button class="btn" onclick="FILES=[];draw()">پاک‌کردن لیست</button></div>`:FILES.length?`<div class="tb" style="margin-top:10px"><button class="btn" onclick="FILES=[];draw()">پاک‌کردن لیست</button></div>`:''}`}
function fcard(f:FI){
 if(f.st==='busy')return `<div class="c fc" style="margin-top:10px">⏳ در حال خواندن ${esc(f.file.name)}…</div>`;
 if(f.st==='err')return `<div class="c fc" style="margin-top:10px;border-color:var(--bad)"><b>${esc(f.file.name)}</b><div class="dn">${f.err}</div><button class="btn" onclick="rmf(${f.id})">حذف</button></div>`;
 const x=f.x!;
 if(f.done)return `<div class="c fc" style="margin-top:10px;border-color:var(--ok)"><div class="tb" style="margin:0"><span style="flex:1">✅ <b>${esc(D.students.find(s=>s.id===f.sid)?.name||'')}</b> · ${esc(x.title)} · تراز ${n(x.level)}</span><button class="btn" onclick="X_open('${f.sid}','${f.eid||''}')">دیدن کارنامه</button></div></div>`;
 const free=D.students;
 return `<div class="c fc" style="margin-top:10px"><div class="tb"><b>${esc(f.file.name)}</b><span class="tag">${esc(x.institute)}</span><button class="btn" style="margin-inline-start:auto" onclick="rmf(${f.id})">حذف</button></div>
 ${detHtml(f)}<div class="tb"><select onchange="sfs(${f.id},this.value)"><option value="">انتخاب دانش‌آموز…</option>${['تجربی ۳۲۱','تجربی ۳۲۲','ریاضی ۳۱۱'].map(c=>`<optgroup label="${c}">${free.filter(s=>s.cls===c).map(s=>`<option value="${s.id}" ${f.sid===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('')}</select>
 <input value="${esc(x.title)}" onchange="FILES.find(q=>q.id==${f.id}).x.title=this.value" placeholder="عنوان"><input value="${x.date}" style="width:110px" onchange="FILES.find(q=>q.id==${f.id}).x.date=this.value.trim()" placeholder="1405/07/10">
 <label class="m">تراز کل <input type="number" value="${x.level??''}" style="width:80px" onchange="FILES.find(q=>q.id==${f.id}).x.level=this.value===''?null:+this.value"></label>
 <label class="m">رتبه <input type="number" value="${x.countryRank??''}" style="width:90px" onchange="FILES.find(q=>q.id==${f.id}).x.countryRank=this.value===''?null:+this.value"></label></div>
 <div class="tw"><table><thead><tr><th>درس</th><th>درست</th><th>غلط</th><th>نزده</th><th>تراز</th></tr></thead><tbody>${x.rows.map((r,i)=>`<tr style="cursor:default"><td><select onchange="FILES.find(q=>q.id==${f.id}).x.rows[${i}].sectionName=this.value">${[...new Set([...SUBJ,r.sectionName])].map(k=>`<option ${k===r.sectionName?'selected':''}>${esc(k)}</option>`).join('')}</select>${r.recognised?'':' <span class="tag r">تأیید کنید</span>'}${r.label&&r.label!==r.sectionName?` <span class="m">${esc(r.label)}</span>`:''}</td>
 <td><input type="number" value="${r.c}" onchange="er(${f.id},${i},'c',this.value)"></td><td><input type="number" value="${r.w}" onchange="er(${f.id},${i},'w',this.value)"></td><td><input type="number" value="${r.n-r.c-r.w}" onchange="er(${f.id},${i},'b',this.value)"></td><td>${n(r.level)}</td></tr>`).join('')}</tbody></table></div>
 ${x.warnings.map(w=>`<div class="w">⚠ ${esc(w)}</div>`).join('')}${(x.extraNotes||[]).map(w=>`<div class="m">${esc(w)}</div>`).join('')}
 <div class="tb" style="margin-top:8px"><button class="btn p" onclick="commit1(${f.id})">ثبت</button></div></div>`}
const rmf=id=>{FILES=FILES.filter(f=>f.id!==id);draw()};
const sfs=(id,v)=>{FILES.find(f=>f.id===id).sid=v};
function er(id,i,k,v){const r=FILES.find(f=>f.id===id).x.rows[i];const b=r.n-r.c-r.w;v=Math.max(0,+v||0);if(k==='c')r.c=v;else if(k==='w')r.w=v;r.n=r.c+r.w+(k==='b'?v:b)}
function commit(f:FI):string|null{
 const x=f.x!;if(!f.sid)return 'دانش‌آموز انتخاب نشده';
 if(!/^\d{4}\/\d{2}\/\d{2}$/.test(x.date))return 'تاریخ را به شکل 1405/07/10 بنویسید';
 if(x.level==null)return 'تراز کل خوانده نشد؛ دستی وارد کنید';
 let e=D.exams.find(q=>q.inst===x.institute&&q.date===x.date);
 if(!e){e={id:'e'+Date.now().toString(36)+f.id,title:x.title,inst:x.institute,date:x.date,res:{}};D.exams.push(e)}
 const subj={},raw={},slv={};
 x.rows.forEach((r,i)=>{const k=r.sectionName;const a=raw[k]||[0,0,0];raw[k]=[a[0]+r.c,a[1]+r.w,a[2]+(r.n-r.c-r.w)];slv[k]=slv[k]==null&&!(k in subj)?r.level:null;if(r.level==null)delete slv[k];if(!r.recognised&&f.sigs[i])rememberHeading(f.sigs[i],k);subj[k]=0});
 Object.keys(raw).forEach(k=>{const[c,w,b]=raw[k],t=c+w+b;subj[k]=t?Math.round((3*c-w)/(3*t)*1000)/10:0});
 e.res[f.sid]={level:x.level,rank:x.countryRank,subj,raw,slv};f.done=true;f.eid=e.id;U.ex=e.id;return null}
function commit1(id){const f=FILES.find(q=>q.id===id)!;const m=commit(f);if(m)alert(m);else save();draw()}
function commitAll(){const bad:string[]=[];FILES.filter(f=>f.st==='ok'&&!f.done).forEach(f=>{const m=commit(f);if(m)bad.push(f.file.name+': '+m)});save();draw();if(bad.length)alert('این‌ها ثبت نشدند:\n'+bad.join('\n'))}

/* ================= معافیت ================= */
const DAYN=['شنبه','یکشنبه','سه‌شنبه','چهارشنبه'],DOFF=[0,1,3,4],GL=['A','B','C','D'],GC=['#6366f1','#10b981','#f59e0b','#ec4899'],DAY=86400000;
const mid=(d:Date)=>{const x=new Date(d);x.setHours(12,0,0,0);return x};
function ensureEx(){
 if(D.ex){if(!D.ex.g2){D.ex.g2={};D.ex.gmode={};D.ex.g2c={};D.ex.dual={};CL.forEach(c=>{if(c.startsWith('تجربی'))D.ex.dual[c]=true})}return D.ex}
 const t=mid(new Date()),sat=new Date(t.getTime()-((t.getDay()+1)%7)*DAY);
 const E=D.ex={anchor:sat.toISOString().slice(0,10),per:4,tt:{},g:{},g2:{},gmode:{},g2c:{},dual:{},fixed:{},skip:{},pw:{}};CL.forEach(c=>{if(c.startsWith('تجربی'))E.dual[c]=true});
 const subs=['ریاضی','فیزیک','شیمی','زیست','ادبیات','عربی','دین و زندگی','زبان'];
 CL.forEach((c,ci)=>{{const L8=c.startsWith('ریاضی')?['ریاضی','هندسه','فیزیک','شیمی','ادبیات','عربی','دین و زندگی','زبان']:subs;E.tt[c]=[0,1,2,3].map(d=>Array.from({length:4},(_,p)=>L8[((d%2)*4+p+ci*3)%8]))}autoDiv(c,'n',true)});
 CL.forEach(c=>D.students.filter(x=>x.cls===c).slice(0,3).forEach(x=>E.skip[x.id]=['دین و زندگی','زبان']));
 const r1=D.students.find(x=>x.cls==='ریاضی ۳۱۱');if(r1)E.fixed['ریاضی ۳۱۱|1-2']=D.students.filter(x=>x.cls==='ریاضی ۳۱۱').slice(0,4).map(x=>x.id);
 const p1=D.students.find(x=>x.cls==='تجربی ۳۲۱');if(p1){E.pw['0']={};const k=pickKeys('تجربی ۳۲۱',p1.id,0);if(k.length)E.pw['0'][p1.id]=k}
 save();return E}
const wd=(w:number)=>new Date(ensureEx().anchor+'T12:00:00').getTime()+w*7*DAY;
const dateOf=(w:number,d:number)=>new Date(wd(w)+DOFF[d]*DAY);
const jd=(x:Date)=>x.toLocaleDateString('fa-IR',{day:'numeric',month:'long'});
const wk0=()=>Math.floor((mid(new Date()).getTime()-wd(0))/(7*DAY));
const letter=(d:number,w:number)=>GL[(((d+w+(D.ex?.rot||0))%4)+4)%4];
const nm=(id:string)=>D.students.find(s=>s.id===id)?.name||'';
const names=(ids:string[],m=6)=>ids.slice(0,m).map(nm).join('، ')+(ids.length>m?` و ${n(ids.length-m)} نفر دیگر`:'');
/* ---- گروه‌بندی چهارتایی / دوتایی (برای کلاس‌هایی که dual هستند؛ نوع هر هفته جداگانه انتخاب می‌شود) ---- */
const G2=['A','B'];
const isDual=(cl:string)=>!!(ensureEx().dual||{})[cl];
const gmode=(cl:string,w:number):number=>isDual(cl)&&(((ensureEx().gmode||{})[cl]||{})[w])===2?2:4;
const g2cfg=(cl:string,w:number)=>(((ensureEx().g2c||{})[cl]||{})[w])||{};
function letterC(cl:string,d:number,w:number):string{if(gmode(cl,w)!==2)return letter(d,w);const c:any=g2cfg(cl,w),i=c.pat==='pair'?Math.floor(d/2):d%2,off=c.first==='A'?0:c.first==='B'?1:(((w%2)+2)%2);return G2[(i+off)%2]}
const grp=(cl:string,w:number,sid:string):string=>gmode(cl,w)===2?((ensureEx().g2||{})[sid]||''):(ensureEx().g[sid]||'');
const lets=(cl:string,w:number)=>gmode(cl,w)===2?G2:GL;
const members=(cl:string,L:string,w:number=U.w)=>D.students.filter(s=>s.cls===cl&&grp(cl,w,s.id)===L).map(s=>s.id);
function tt(cl:string){const E=ensureEx();if(!E.tt[cl])E.tt[cl]=[0,1,2,3].map(()=>[]);E.tt[cl].forEach(r=>{while(r.length<E.per)r.push('')});return E.tt[cl]}
const subj=(cl:string,d:number,p:number)=>tt(cl)[d][p]||'—';
const sameCells=(cl:string,d:number,p:number):string[]=>{const E=ensureEx(),sb=(tt(cl)[d][p]||'').trim();if(!sb||E.pair===false)return [cl+'|'+d+'-'+p];const o:string[]=[];for(let d2=0;d2<4;d2++)for(let p2=0;p2<E.per;p2++)if((tt(cl)[d2][p2]||'').trim()===sb)o.push(cl+'|'+d2+'-'+p2);return o};
const fx=(cl:string,d:number,p:number):string[]=>{const F=ensureEx().fixed,u=new Set<string>();sameCells(cl,d,p).forEach(k=>(F[k]||[]).forEach((id:string)=>u.add(id)));return [...u].filter(id=>nm(id))};
const pgIn=(cl:string,w:number,d:number,p:number)=>{const m=ensureEx().pw[w]||{};return Object.keys(m).filter(id=>m[id].includes(d+'-'+p)&&D.students.find(s=>s.id===id&&s.cls===cl))};
function status(sid:string,cl:string,w:number,d:number,p:number){if(grp(cl,w,sid)&&grp(cl,w,sid)===letterC(cl,d,w))return 'g';if(fx(cl,d,p).includes(sid))return 'f';if(((ensureEx().pw[w]||{})[sid]||[]).includes(d+'-'+p))return 'p';return null}
const seg=(k:string,o:string[][])=>`<div class="seg">${o.map(([v,t])=>`<button class="${U[k]===v?'on':''}" onclick="U.${k}='${v}';draw()">${t}</button>`).join('')}</div>`;
const wstep=(k:number)=>{U.w=k===0?wk0():U.w+k;draw()};
const rotBar=()=>`<div class="tb"><span class="m">گروهِ روز شنبه در این هفته:</span><div class="seg" style="margin:0">${GL.map(L=>`<button class="${letter(0,U.w)===L?'on':''}" onclick="setRot('${L}')">گروه ${L}</button>`).join('')}</div><span class="m">هفته‌های بعد خودکار می‌چرخد</span></div>`;
function setRot(L:string){const E=ensureEx(),i=GL.indexOf(L);E.rot=(((i-U.w)%4)+4)%4;save();draw();toast('ترتیب تنظیم شد: '+[0,1,2,3].map(d=>letter(d,U.w)).join(' ← ')+'')}
const wnav=()=>`<div class="tb"><button class="btn" onclick="wstep(-1)">▶</button><b>${jd(dateOf(U.w,0))} تا ${jd(dateOf(U.w,3))}</b><button class="btn" onclick="wstep(1)">◀</button>${U.w!==wk0()?`<button class="btn" onclick="wstep(0)">هفته‌ی جاری</button>`:'<span class="tag">هفته‌ی جاری</span>'}</div>`;
const exmx=()=>seg('es',[['g','📋 گزارش آزمون'],['r','ثبت آزمون ماز/قلم‌چی'],['s','اسکن کارنامه'],['h','آزمون‌های مدرسه']])+({g:repg,r:exm,s:scn,h:schp} as any)[U.es]();
const hue=(v:number)=>`background:hsl(${Math.max(0,Math.min(120,v*1.3))} 60% 45% / .25)`;
function repg(){const AX=exs().slice().reverse();if(!AX.length)return '<div class="c m">هنوز آزمونی ثبت نشده است.</div>';
 if(!U.rx||!D.exams.find(e=>e.id===U.rx))U.rx=AX[0].id;const e=D.exams.find(x=>x.id===U.rx),cl=U.rc;
 const ss=D.students.filter(s=>s.cls===cl).sort(byNum),got=ss.filter(s=>e.res[s.id]),miss=ss.filter(s=>!e.res[s.id]);
 const subs=[...new Set(got.flatMap(s=>Object.keys(e.res[s.id].subj||{})))] as string[];
 const same=insE(e.inst),ix=same.findIndex(x=>x.id===e.id),pv=ix>0?same[ix-1]:null;
 const R=got.map(s=>{const r=e.res[s.id],pl=pv?.res[s.id]?.level;return{s,r,d:pl!=null?r.level-pl:null}}),k=U.rs;
 R.sort((a,b)=>k==='level'?b.r.level-a.r.level:k==='rank'?(a.r.rank||1e9)-(b.r.rank||1e9):k==='name'?a.s.name.localeCompare(b.s.name,'fa'):byNum(a.s,b.s));
 const lvs=got.map(s=>e.res[s.id].level),top=got.length?got.reduce((a,s)=>e.res[s.id].level>e.res[a.id].level?s:a,got[0]):null,bins:any={};lvs.forEach(v=>{const b=Math.floor(v/1000)*1000;bins[b]=(bins[b]||0)+1});
 const th=(kk:string,t:string)=>`<th style="cursor:pointer" onclick="U.rs='${kk}';draw()">${t}${U.rs===kk?' ▾':''}</th>`;
 return `<div class="seg">${CL.map(c=>`<button class="${cl===c?'on':''}" onclick="U.rc='${c}';draw()">${c}</button>`).join('')}</div>
 <div class="tb"><select onchange="U.rx=this.value;draw()">${AX.map(x=>`<option value="${x.id}" ${x.id===e.id?'selected':''}>${esc(x.title)} · ${x.inst} · ${esc(x.date)} (${n(Object.keys(x.res).length)} نفر)</option>`).join('')}</select><button class="btn" onclick="repCsv()">CSV این گزارش</button></div>
 <div class="g"><div class="c k"><b>${n(got.length)} / ${n(ss.length)}</b><span>شرکت‌کننده</span></div><div class="c k"><b>${n(avg(lvs))}</b><span>میانگین تراز کلاس</span></div><div class="c k"><b>${n(lvs.length?Math.max(...lvs):null)}</b><span>بالاترین ${top?'· '+esc(top.name):''}</span></div><div class="c k"><b>${n(lvs.length?Math.min(...lvs):null)}</b><span>پایین‌ترین</span></div></div>
 <div class="g2" style="margin-top:10px"><div class="c"><h3>میانگین درصد دروس کلاس</h3>${bars(subs.map(kk=>({l:kk,v:avg(got.map(s=>e.res[s.id].subj?.[kk]))||0})),v=>n(v)+'٪')}</div><div class="c"><h3>توزیع تراز</h3>${bars(Object.keys(bins).sort((p,q)=>+p-+q).map(b=>({l:`${n(+b)} تا ${n(+b+999)}`,v:bins[b]})),v=>n(v)+' نفر')}</div></div>
 <div class="c tw" style="margin-top:10px"><table><thead><tr>${th('num','شماره')}${th('name','نام')}${th('level','تراز')}<th>تغییر</th>${th('rank','رتبه')}${subs.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${R.map(({s,r,d})=>`<tr onclick="rd('${e.id}','${s.id}')"><td>${n(s.num)}</td><td>${esc(s.name)}</td><td><b>${n(r.level)}</b></td><td>${dl(d)}</td><td>${n(r.rank)}</td>${subs.map(x=>{const v=r.subj?.[x];return `<td style="${v==null?'':hue(v)}">${v==null?'—':n(v)+'٪'}</td>`}).join('')}</tr>`).join('')||'<tr><td>نتیجه‌ای برای این کلاس ثبت نشده</td></tr>'}</tbody></table></div>
 ${miss.length?`<p class="m">بدون نتیجه: ${miss.map(s=>esc(n(s.num)+'. '+s.name)).join('، ')}</p>`:''}`}
function repCsv(){const e=D.exams.find(x=>x.id===U.rx),ss=D.students.filter(s=>s.cls===U.rc&&e.res[s.id]).sort(byNum),subs=[...new Set(ss.flatMap(s=>Object.keys(e.res[s.id].subj||{})))] as string[];dlf(`${e.title}-${U.rc}.csv`,[['شماره','نام','تراز','رتبه',...subs],...ss.map(s=>[s.num,s.name,e.res[s.id].level,e.res[s.id].rank,...subs.map(k=>e.res[s.id].subj?.[k]??'')])])}
function rd(eid:string,sid:string){const e=D.exams.find(x=>x.id===eid),s=D.students.find(x=>x.id===sid),r=e.res[sid];if(!r)return;
 const mates=D.students.filter(x=>x.cls===s.cls&&e.res[x.id]).sort(byNum),rc=1+mates.filter(x=>e.res[x.id].level>r.level).length,ix=mates.findIndex(x=>x.id===sid);
 const same=exs().filter(x=>x.inst===e.inst&&x.res[sid]),pi=same.findIndex(x=>x.id===eid),pl=pi>0?same[pi-1].res[sid].level:null,keys=Object.keys(r.subj||{});
 $('#mb').innerHTML=`<div class="tb"><button class="btn" ${ix>0?`onclick="rd('${eid}','${mates[ix-1].id}')"`:'disabled'}>▶ قبلی</button><h3 style="margin:0;flex:1;text-align:center">${esc(s.name)} <span class="tag">شماره ${n(s.num)}</span></h3><button class="btn" ${ix<mates.length-1?`onclick="rd('${eid}','${mates[ix+1].id}')"`:'disabled'}>بعدی ◀</button></div>
 <p class="m" style="text-align:center">${esc(e.title)} · ${e.inst} · ${esc(e.date)} · ${s.cls}</p>
 <div class="g"><div class="c k"><b>${n(r.level)}</b><span>تراز ${pl!=null?dl(r.level-pl):''}</span></div><div class="c k"><b>${n(r.rank)}</b><span>رتبه‌ی کشوری</span></div><div class="c k"><b>${n(rc)} از ${n(mates.length)}</b><span>رتبه در کلاس</span></div></div>
 <div class="g2" style="margin-top:10px"><div class="c tw"><h3>دروس</h3><table><thead><tr><th>درس</th><th>درصد</th><th>درست/غلط/نزده</th><th>تراز درس</th><th>میانگین کلاس</th></tr></thead><tbody>${keys.map(k=>{const v=r.subj[k],ca=avg(mates.map(x=>e.res[x.id].subj?.[k])),w=r.raw?.[k];return `<tr style="cursor:default"><td>${esc(k)}</td><td style="${hue(v)}"><b>${n(v)}٪</b></td><td>${w?`${n(w[0])} / ${n(w[1])} / ${n(w[2])}`:'—'}</td><td>${n(r.slv?.[k])}</td><td>${n(ca)}٪ ${dl(ca==null?null:v-ca)}</td></tr>`}).join('')}</tbody></table></div>
 <div class="c"><h3>روند تراز ${e.inst}</h3>${same.length>1?line(same.map(x=>x.date.slice(5)),[{name:s.name,c:'var(--ac)',v:same.map(x=>x.res[sid].level)}]):'<p class="m">برای نمودار حداقل دو آزمون لازم است</p>'}</div></div>
 <div class="tb" style="margin-top:10px"><button class="btn" onclick="op('${sid}')">پروفایل کامل</button><button class="btn" onclick="cm()">بستن</button></div>`;$('#md').classList.add('on')}

const ana=()=>seg('as',[['o','نمای کلی'],['c','نمودارها']])+(U.as==='c'&&['sav','sstu','sdist'].includes(U.ct)?'':insSeg())+(U.as==='c'?cht():dash());

/* ---- home ---- */
function home(){const E=ensureEx(),off=Math.round((mid(new Date()).getTime()-wd(0))/DAY),w=Math.floor(off/7),o=((off%7)+7)%7;
 let di=DOFF.indexOf(o),ww=w,lab='امروز';
 if(di<0)for(let k=1;k<8;k++){const i=DOFF.indexOf((o+k)%7);if(i>=0){di=i;ww=w+Math.floor((o+k)/7);lab='روز مدرسه‌ی بعد — '+DAYN[i]+' '+jd(dateOf(ww,i));break}}
 const cards=CL.map((c,i)=>{const L=letterC(c,di,ww),gm=members(c,L,ww),m=E.pw[ww]||{};
  const fxs=new Set<string>();for(let p=0;p<E.per;p++)fx(c,di,p).forEach(x=>fxs.add(x));
  const pgs=Object.keys(m).filter(id=>nm(id)&&D.students.find(s=>s.id===id&&s.cls===c)&&m[id].some(k=>k.startsWith(di+'-')));
  return `<div class="c hc" style="--gc:${GC[GL.indexOf(L)]}" onclick="U.xc='${c}';U.w=${ww};U.xs='cal';go('ex')"><div class="hl">${L}</div><div><b>${c}</b><div class="m">گروه ${L}${gmode(c,ww)===2?' (گروه‌بندی دوتایی)':''} معاف است · ${n(gm.length)} نفر</div><div class="m">${esc(names(gm,5))||'گروه‌بندی انجام نشده'}</div>${fxs.size?`<span class="tag">معلم: ${n(fxs.size)}</span>`:''}${pgs.length?`<span class="tag">پیشرفت: ${esc(names(pgs,3))}</span>`:''}</div></div>`}).join('');
 const tl=(i:string,t:string,d:string,a:string)=>`<div class="c tl" onclick="${a}"><span>${i}</span><b>${t}</b><small>${d}</small></div>`;
 const hrN=new Date().getHours(),gr=hrN<12?'صبح بخیر':hrN<17?'ظهر بخیر':hrN<20?'عصر بخیر':'شب بخیر',ti=DOFF.indexOf(o);
 const strip=[0,1,2,3].map(d=>{const Ls=[...new Set(CL.map(c=>letterC(c,d,w)))],L=Ls.join('·');return `<button class="wd ${d===ti?'now':''}" style="--gc:${GC[GL.indexOf(Ls[0])]}" onclick="U.w=${w};U.xs='cal';go('ex')"><small>${DAYN[d]}</small><b>${L}</b><span>${jd(dateOf(w,d))}</span></button>`}).join('');
 return `${SV.badge()}<div class="homehero"><div><small>${gr} 👋</small><h2>${lab}</h2></div><div class="strip">${strip}</div></div><div class="g2">${cards}</div>
 <div class="g tiles">${tl('📅','معافیت و تقویم','گروه‌ها، معلم، پیشرفت',"U.xs='cal';go('ex')")}${tl('👥','دانش‌آموزان','پروفایل و نمرات',"go('stu')")}${tl('🚫','حضور و غیاب','غیبت‌ها و وضعیت امروز',"go('day')")}${tl('📝','آزمون‌ها','کارنامه، نتایج، دانش‌آموزان',"xgo('in')")}${tl('📢','اطلاعیه‌ها','آزمون، جلسه، مهلت…',"go('ann')")}</div>`}

/* ---- exemption page ---- */
const EXN:any={g:'معافیت گروه',f:'معافیت معلم',p:'معافیت پیشرفت'},EXC:any={g:'#10b981',f:'#f59e0b',p:'#ec4899'};
const xini=(t:string)=>{const w=t.trim().split(/[\s\u200c]+/).filter(Boolean);return w.length>1?w[0][0]+'\u200c'+w[w.length-1][0]:(w[0]||'').slice(0,2)};
const fdn=(d:Date)=>d.toLocaleDateString('fa-IR',{day:'numeric'}),fmn=(d:Date)=>d.toLocaleDateString('fa-IR',{month:'long'});
function xpg(){ensureEx();const cl=U.xc,w=U.w,E=D.ex,ss=D.students.filter((s:any)=>s.cls===cl),t0=mid(new Date()).getTime();let ti=-1;for(let d=0;d<4;d++)if(mid(dateOf(w,d)).getTime()===t0)ti=d;
 if(U.xd==null||U.xd>3||U.xd<0)U.xd=ti>=0?ti:0;
 const tset=new Set<string>();for(let d=0;d<4;d++)for(let p=0;p<E.per;p++)fx(cl,d,p).forEach((id:string)=>tset.add(id));
 const pgN=ss.filter((s:any)=>(E.pw[w]||{})[s.id]).length,ung=ss.filter((s:any)=>!grp(cl,w,s.id)).length,Ld=letterC(cl,U.xd,w),gN=members(cl,Ld,w).length;
 const k=(ic:string,b:any,t:string,col:string,hot?:boolean)=>`<div class="dykp ${hot?'hot':''}" style="--kc:${col}"><span>${ic}</span><b>${b}</b><small>${t}</small></div>`;
 const hero=`<div class="exhero"><div style="flex:1;min-width:0"><small>مدیریت معافیت‌ها</small><h2>${cl}</h2><small>${jd(dateOf(w,0))} تا ${jd(dateOf(w,3))}${w===wk0()?' · هفته‌ی جاری':''}</small></div><div class="exwn"><button onclick="wstep(-1)" title="هفته‌ی قبل">▶</button><button onclick="wstep(1)" title="هفته‌ی بعد">◀</button>${w!==wk0()?'<button onclick="wstep(0)">امروز</button>':''}</div></div>`;
 const tabs=[['cal','📅 تقویم'],['grp','👥 گروه‌ها'],['tt','🗓 برنامه و معلم'],['prg','🚀 پیشرفت']];
 return hero+`<div class="seg">${CL.map((c:string)=>`<button class="${cl===c?'on':''}" onclick="U.xc='${c}';U.sv='';draw()">${c}</button>`).join('')}</div>
 <div class="dykps">${k('👥',n(gN),`گروه ${Ld}${gmode(cl,w)===2?' (۲گروهی)':''} · ${DAYN[U.xd]}`,GC[GL.indexOf(Ld)])}${k('🎓',n(tset.size),'معاف از معلم این هفته','#f59e0b')}${k('🚀',n(pgN),'معافیت پیشرفت این هفته','#ec4899')}${k('⚠',n(ung),'بدون گروه','#dc2626',ung>0)}</div>
 <div class="seg xtabs">${tabs.map(([v,t])=>`<button class="${U.xs===v?'on':''}" onclick="U.xs='${v}';draw()">${t}</button>`).join('')}</div>`+({cal:xcal,grp:xgrp,tt:xtt,prg:xprog} as any)[U.xs]()}
function weekGrid(cl:string,w:number,sv:string,E:any){let g=`<div class="cal"><div></div>`,cnt=0;
 for(let d=0;d<4;d++){const L=letterC(cl,d,w);g+=`<div class="ch${mid(dateOf(w,d)).getTime()===mid(new Date()).getTime()?' tdy':''}" style="--gc:${GC[GL.indexOf(L)]}"><b>${DAYN[d]}</b><span>${jd(dateOf(w,d))}</span><i>${L}</i></div>`}
 for(let p=0;p<E.per;p++){g+=`<div class="cp">${n(p+1)}</div>`;for(let d=0;d<4;d++){const L=letterC(cl,d,w),c=GC[GL.indexOf(L)];
  if(sv){const st=status(sv,cl,w,d,p);if(st)cnt++;g+=`<div class="cell ${st?'x'+st:''}" style="--gc:${c}" onclick="cellm(${d},${p})"><b>${esc(subj(cl,d,p))}</b><em>${st?EXN[st]:'حضور'}</em></div>`}
  else{const f=fx(cl,d,p),pg=pgIn(cl,w,d,p);g+=`<div class="cell" style="--gc:${c}" onclick="cellm(${d},${p})"><b>${esc(subj(cl,d,p))}</b><em>گروه ${L} · ${n(members(cl,L,w).length)} نفر</em>${f.length?`<span class="tag">👤 معلم ${n(f.length)}</span>`:''}${pg.length?`<span class="tag">🚀 ${esc(pg.slice(0,2).map(nm).join('، '))}${pg.length>2?'…':''}</span>`:''}</div>`}}}
 return {g:g+'</div>',cnt}}
function xcal(){const cl=U.xc,w=U.w,E=ensureEx(),ss=D.students.filter((s:any)=>s.cls===cl),sv=ss.find((s:any)=>s.id===U.sv)?U.sv:'',d=U.xd,t0=mid(new Date()).getTime();
 const strip=`<div class="dyds" style="margin:10px 0 12px">${[0,1,2,3].map(x=>{const L=letterC(cl,x,w),dt=dateOf(w,x);return `<button class="dyd ${x===d?'on':''} ${mid(dt).getTime()===t0?'td':''}" onclick="U.xd=${x};draw()"><small>${DAYN[x]}</small><b>${fdn(dt)}</b><span>${fmn(dt)}</span><i style="background:${GC[GL.indexOf(L)]}">${L}</i></button>`}).join('')}</div>`;
 const L=letterC(cl,d,w),gm=members(cl,L,w),gc=GC[GL.indexOf(L)];
 const banner=sv?`<div class="exday" style="--gc:${gc}"><div class="exg">${L}</div><div style="flex:1"><b>${esc(nm(sv))}</b><div class="m">${grp(cl,w,sv)===L?`✅ گروه ${L} است؛ ${DAYN[d]} <b>کل روز معاف</b> است.`:`گروه ${grp(cl,w,sv)||'—'} است؛ ${DAYN[d]} نوبت گروه ${L} است.`}</div></div></div>`
  :`<div class="exday" style="--gc:${gc}"><div class="exg">${L}</div><div style="flex:1;min-width:0"><b>گروه ${L} در ${DAYN[d]} معاف است</b> <span class="m">${n(gm.length)} نفر · کل روز</span><div class="exnames">${gm.map((id:string)=>`<span class="tag">${esc(nm(id))}</span>`).join('')||'<span class="m">هنوز گروهی تعیین نشده (تب گروه‌ها)</span>'}</div></div></div>`;
 const tl=Array.from({length:E.per},(_,p)=>{const sb=subj(cl,d,p);
  if(sv){const st=status(sv,cl,w,d,p);return `<div class="exp" style="--ec:${st?EXC[st]:'var(--bd)'}" onclick="cellm(${d},${p})"><span class="no">${n(p+1)}</span><div style="flex:1"><b>${esc(sb)}</b><div class="m">${st?EXN[st]:'حضور در کلاس'}</div></div>${st?`<span class="tag" style="background:${EXC[st]};color:#fff;border-color:${EXC[st]}">معاف</span>`:''}</div>`}
  const f=fx(cl,d,p),pg=pgIn(cl,w,d,p);
  return `<div class="exp" style="--ec:${gc}" onclick="cellm(${d},${p})"><span class="no">${n(p+1)}</span><div style="flex:1;min-width:0"><b>${esc(sb)}</b><div class="m">گروه ${L} معاف · ${n(gm.length)} نفر</div>${f.length?`<div class="exl f">🎓 معلم: ${esc(names(f,5))}</div>`:''}${pg.length?`<div class="exl p">🚀 پیشرفت: ${esc(names(pg,4))}</div>`:''}</div><span class="m">✎ ویرایش</span></div>`}).join('');
 const W=weekGrid(cl,w,sv,E),pool=ss.filter((x:any)=>!grp(cl,w,x.id));
 return modeCard(cl,w)+`<div class="tb"><select onchange="U.sv=this.value;draw()" style="min-width:170px"><option value="">👥 نمای کل کلاس</option>${ss.map((x:any)=>`<option value="${x.id}" ${x.id===sv?'selected':''}>${esc(x.name)}</option>`).join('')}</select><button class="btn p" onclick="xpng()">📤 تصویر برای ارسال</button><button class="btn" onclick="window.print()">چاپ</button>${sv?`<span class="m">${n(W.cnt)} ساعت معافیت این هفته</span>`:''}</div>
 ${strip}${banner}<div class="extl">${tl}</div><p class="m" style="margin:6px 2px">روی هر ساعت بزنید تا معافیت معلم و پیشرفت همان ساعت را ویرایش کنید.</p>
 <details class="c" style="margin-top:12px"><summary style="cursor:pointer"><b>🗓 نمای کل هفته</b> <span class="m">همه‌ی روزها و ساعت‌ها در یک نگاه</span></summary>${W.g}</details>
 <div class="g" style="margin-top:12px">${lets(cl,w).map((G:string)=>`<div class="c" style="border-top:4px solid ${GC[GL.indexOf(G)]}"><b>گروه ${G}</b> <span class="m">${n(members(cl,G,w).length)} نفر</span><div class="m">معاف: ${[0,1,2,3].filter(x=>letterC(cl,x,w)===G).map(x=>DAYN[x]).join('، ')}</div><div class="m">${esc(names(members(cl,G,w),4))}</div></div>`).join('')}</div>
 ${pool.length?`<p class="dn">${n(pool.length)} نفر هنوز گروه ندارند (تب گروه‌ها).</p>`:''}
 ${gmode(cl,w)===2?'':`<details class="c" style="margin-top:10px"><summary style="cursor:pointer"><b>⚙ چرخش گروه‌ها</b></summary>${rotBar()}</details>`}`}
function cellm(d:number,p:number){const cl=U.xc,w=U.w,L=letterC(cl,d,w),key=d+'-'+p,fl=fx(cl,d,p),gm=members(cl,L,w),pg=pgIn(cl,w,d,p),all=D.students.filter((s:any)=>s.cls===cl).sort(byNum),gc=GC[GL.indexOf(L)];U.cmd=[d,p];
 $('#mb').innerHTML=`<div class="tb"><div class="exday" style="--gc:${gc};flex:1;margin:0"><div class="exg">${n(p+1)}</div><div style="flex:1"><b style="font-size:17px">${esc(subj(cl,d,p))}</b><div class="m">${DAYN[d]} ${jd(dateOf(w,d))} · ساعت ${n(p+1)}</div></div></div><button class="btn" onclick="cm()">بستن</button></div>
 <div class="c exsec" style="--sc:${gc}"><h3>👥 معافیت گروه ${L} <span class="m">${n(gm.length)} نفر</span></h3><div>${gm.map((id:string)=>`<span class="tag">${esc(nm(id))}</span>`).join('')||'<span class="m">گروهی تعیین نشده</span>'}</div></div>
 <div class="c exsec" style="--sc:#f59e0b"><h3>🎓 معافیت معلم — هر هفته</h3>${sameCells(cl,d,p).length>1?`<p class="m" style="margin:0 0 8px">این درس ${n(sameCells(cl,d,p).length)} جلسه در هفته دارد؛ انتخاب‌ها برای همه‌ی جلسه‌ها اعمال می‌شود.</p>`:''}<div class="chk">${all.map((s:any)=>`<label><input type="checkbox" ${fl.includes(s.id)?'checked':''} onchange="tgFx('${cl}','${key}','${s.id}',this.checked)"> ${esc(s.name)}</label>`).join('')}</div></div>
 <div class="c exsec" style="--sc:#ec4899"><h3>🚀 معافیت پیشرفت — فقط این هفته</h3>${pg.map((id:string)=>`<div class="row" style="cursor:default"><span>${esc(nm(id))}</span><button class="btn" onclick="rmPw('${id}','${key}')">حذف</button></div>`).join('')}<select onchange="addPw(this.value,'${key}')"><option value="">＋ افزودن دانش‌آموز…</option>${all.filter((s:any)=>!status(s.id,cl,w,d,p)).map((s:any)=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>`;$('#md').classList.add('on')}
function tgFx(cl:string,key:string,id:string,on:boolean){const E=ensureEx(),[d,p]=key.split('-').map(Number),ks=sameCells(cl,d,p);if(!ks.includes(cl+'|'+key))ks.push(cl+'|'+key);ks.forEach(k=>{const a=(E.fixed[k]||[]).filter((x:string)=>x!==id);if(on)a.push(id);E.fixed[k]=a});save();cellm(d,p)}
function addPw(id:string,key:string){if(!id)return;const E=ensureEx(),m=(E.pw[U.w]=E.pw[U.w]||{}),a=(m[id]=m[id]||[]);if(a.length>=2&&!confirm('این دانش‌آموز قبلاً ۲ ساعت معافیت پیشرفت دارد؛ باز هم اضافه شود؟'))return;a.push(key);save();cellm(U.cmd[0],U.cmd[1])}
function rmPw(id:string,key:string){const m=ensureEx().pw[U.w]||{};m[id]=(m[id]||[]).filter(k=>k!==key);if(!m[id].length)delete m[id];save();cellm(U.cmd[0],U.cmd[1])}
/* groups */
const grow=(s:any)=>`<div class="row" style="cursor:default"><span>${s.num?n(s.num)+'. ':''}${esc(s.name)}</span><select onchange="setG('${s.id}',this.value)">${['','A','B','C','D'].map(L=>`<option value="${L}" ${(ensureEx().g[s.id]||'')===L?'selected':''}>${L||'بدون گروه'}</option>`).join('')}</select></div>`;
function defRng(cl:string){const ss=D.students.filter(s=>s.cls===cl).sort(byNum),k=Math.floor(ss.length/4),r:any={};GL.forEach((L,i)=>{r[L]=k?[ss[i*k].num,ss[(i+1)*k-1].num]:[null,null]});return r}
const rngOf=(cl:string)=>{const E=ensureEx();E.rng=E.rng||{};return E.rng[cl]||(E.rng[cl]=defRng(cl))};
function applyRng(cl:string,quiet?:boolean){const E=ensureEx(),r=rngOf(cl);D.students.filter(s=>s.cls===cl).forEach(s=>{delete E.g[s.id];GL.forEach(L=>{const[a,b]=r[L];if(a!=null&&b!=null&&s.num>=a&&s.num<=b)E.g[s.id]=L})});if(!quiet){save();draw()}}
const setRng=(cl:string,L:string,i:number,v:string)=>{rngOf(cl)[L][i]=+v||null;save()};
function xgrp4(cl:string){const E=ensureEx(),ss=snap().filter((s:any)=>s.cls===cl).sort(byNum),pool=ss.filter((s:any)=>!E.g[s.id]),r=rngOf(cl),tot=ss.length||1;
 const mrow=(s:any)=>`<div class="exm"><span class="av">${s.num?n(s.num):'·'}</span><span style="flex:1;min-width:0">${esc(s.name)}</span><select onchange="setG('${s.id}',this.value)" title="جابه‌جایی به گروه دیگر">${['','A','B','C','D'].map(L=>`<option value="${L}" ${(E.g[s.id]||'')===L?'selected':''}>${L||'بدون گروه'}</option>`).join('')}</select></div>`;
 const bar=`<div class="exbar">${GL.map((L,i)=>{const c=ss.filter((s:any)=>E.g[s.id]===L).length;return c?`<span style="flex:${c};background:${GC[i]}" title="گروه ${L}: ${c} نفر">${L} · ${n(c)}</span>`:''}).join('')}${pool.length?`<span style="flex:${pool.length};background:#94a3b8">؟ · ${n(pool.length)}</span>`:''}</div>`;
 return `<div class="c"><b>توزیع دانش‌آموزان ${cl} در گروه‌ها</b>${bar}<p class="m" style="margin:6px 0 0">هر روز مدرسه یک گروه کل روز معاف است. چرخش هفتگی: ABCD ← BCDA ← CDAB ← DABC. برای جابه‌جایی هر نفر، منوی کنار نامش را عوض کنید.</p></div>
 <details class="c" style="margin-top:10px"><summary style="cursor:pointer"><b>⚙ تقسیم خودکار و تنظیم بازه‌ها</b></summary>
  <p class="m">هر گروه یک بازه از شماره‌ها می‌گیرد (مثلاً ۱ تا ۱۰ ← A، ۱۱ تا ۲۰ ← B). بازه‌ها را تغییر بدهید و «اعمال» بزنید؛ شماره‌ای که در هیچ بازه‌ای نباشد «بدون گروه» می‌ماند.</p>
  ${GL.map((L,i)=>`<div class="tb"><b style="color:${GC[i]};width:60px">گروه ${L}</b>از شماره <input type="number" min="1" style="width:70px" value="${r[L][0]??''}" onchange="setRng('${cl}','${L}',0,this.value)"> تا <input type="number" min="1" style="width:70px" value="${r[L][1]??''}" onchange="setRng('${cl}','${L}',1,this.value)"></div>`).join('')}
  <div class="tb"><button class="btn p" onclick="applyRng('${cl}')">اعمال بازه‌ها</button><button class="btn" onclick="autoDiv('${cl}','n')">بازه‌های پیشنهادی (${n(Math.floor(ss.length/4))} نفر برای هر گروه)</button></div>
  <div class="tb"><span class="m">ترتیب‌های دیگر:</span><select onchange="U.gm=this.value">${[['a','الفبایی'],['l','بر اساس تراز'],['r','تصادفی'],['b','متوازن (مارپیچ)']].map(([v,t])=>`<option value="${v}" ${U.gm===v?'selected':''}>${t}</option>`).join('')}</select><button class="btn" onclick="autoDiv('${cl}',U.gm)">تقسیم با این ترتیب</button></div></details>
 <div class="g2" style="margin-top:12px">${GL.map((L,i)=>{const m=ss.filter((s:any)=>E.g[s.id]===L);return `<div class="exgc" style="--gc:${GC[i]}"><div class="exgh"><i>${L}</i><b>گروه ${L}</b><span>${n(m.length)} نفر</span></div>${m.map(mrow).join('')||'<p class="m" style="padding:8px">خالی</p>'}</div>`}).join('')}${pool.length?`<div class="exgc" style="--gc:#94a3b8"><div class="exgh"><i>؟</i><b>بدون گروه</b><span>${n(pool.length)} نفر</span></div>${pool.map(mrow).join('')}</div>`:''}</div>`}
const setG=(id:string,L:string,m:number=4)=>{const E=ensureEx(),st=m===2?(E.g2=E.g2||{}):E.g;if(L)st[id]=L;else delete st[id];save();draw()};

/* ---- انتخاب نوع گروه‌بندی هر هفته (کلاس‌های دوگانه) ---- */
const seg2=(opts:string[][],cur:string,fn:string)=>`<div class="seg" style="margin:0">${opts.map(([v,t])=>`<button class="${cur===v?'on':''}" onclick="${fn.replace('@',v)}">${t}</button>`).join('')}</div>`;
function setGMode(cl:string,w:number,m:number){const E=ensureEx();(E.gmode[cl]=E.gmode[cl]||{})[w]=m;save();draw()}
function setG2c(cl:string,w:number,k:string,v:string){const E=ensureEx();((E.g2c[cl]=E.g2c[cl]||{})[w]=E.g2c[cl][w]||{})[k]=v;save();draw()}
function setDual(cl:string,v:boolean){ensureEx().dual[cl]=v;save();draw()}
function gmodeAll(w:number,m:number,span:number=1){const E=ensureEx();CL.filter(isDual).forEach(c=>{for(let k=0;k<span;k++)(E.gmode[c]=E.gmode[c]||{})[w+k]=m});save();draw()}
function gmodeAlt(w:number,span:number){const E=ensureEx();CL.filter(isDual).forEach(c=>{for(let k=0;k<span;k++)(E.gmode[c]=E.gmode[c]||{})[w+k]=k%2?2:4});save();draw()}
function modeCard(cl:string,w:number){if(!isDual(cl))return '';const m=gmode(cl,w),c:any=g2cfg(cl,w);
 return `<div class="c exmode"><div class="tb" style="margin:0 0 8px"><b>🔀 نوع گروه‌بندی این هفته</b><span class="m">${cl}</span><span style="flex:1"></span>${seg2([['4','۴ گروهی (A B C D)'],['2','۲ گروهی (A B)']],String(m),`setGMode('${cl}',${w},+'@')`)}</div>
 ${m===2?`<div class="tb" style="margin:0 0 8px"><span class="m">الگوی روزها:</span>${seg2([['alt','یک‌درمیان (A B A B)'],['pair','دوبه‌دو (A A B B)']],c.pat==='pair'?'pair':'alt',`setG2c('${cl}',${w},'pat','@')`)}<span class="m">شروع با:</span>${seg2([['auto','خودکار'],['A','A'],['B','B']],c.first||'auto',`setG2c('${cl}',${w},'first','@')`)}</div>`:''}
 <div class="exprev">${[0,1,2,3].map(d=>{const L=letterC(cl,d,w);return `<span style="--gc:${GC[GL.indexOf(L)]}"><small>${DAYN[d]}</small><b>${L}</b></span>`}).join('')}</div></div>`}
function planner(){const dc=CL.filter(isDual);if(!dc.length)return '';const E=ensureEx(),w0=wk0()-1,rows=[];
 for(let w=w0;w<w0+10;w++){rows.push(`<tr class="${w===U.w?'sel':''}"><td style="white-space:nowrap"><b>${jd(dateOf(w,0))}</b> <span class="m">تا ${jd(dateOf(w,3))}</span>${w===wk0()?' <span class="tag">این هفته</span>':''}</td>${dc.map(c=>{const m=gmode(c,w);return `<td>${seg2([['4','۴'],['2','۲']],String(m),`setGMode('${c}',${w},+'@')`)}<div class="m" style="font-size:11px;text-align:center">${[0,1,2,3].map(d=>letterC(c,d,w)).join(' ')}</div></td>`}).join('')}<td><button class="btn" onclick="U.w=${w};draw()">دیدن</button></td></tr>`)}
 return `<details class="c" style="margin-top:10px" open><summary style="cursor:pointer"><b>🗓 برنامه‌ریزی نوع گروه‌بندی هفته‌ها</b> <span class="m">برای هر هفته و هر کلاس انتخاب کنید</span></summary>
 <div class="tb" style="margin-top:8px"><span class="m">میان‌بر (۸ هفته از این هفته):</span><button class="btn" onclick="gmodeAll(wk0(),4,8)">همه ۴گروهی</button><button class="btn" onclick="gmodeAll(wk0(),2,8)">همه ۲گروهی</button><button class="btn" onclick="gmodeAlt(wk0(),8)">یک‌هفته ۴گروهی، یک‌هفته ۲گروهی</button></div>
 <div class="tw"><table class="explan"><thead><tr><th>هفته</th>${dc.map(c=>`<th style="text-align:center">${c}</th>`).join('')}<th></th></tr></thead><tbody>${rows.join('')}</tbody></table></div></details>`}
function xgrp(){const cl=U.xc,dual=isDual(cl),cm=gmode(cl,U.w),em=dual?(U.gv?+U.gv:cm):4;
 const ctl=dual?`${modeCard(cl,U.w)}${planner()}<div class="c" style="margin-top:10px"><div class="tb" style="margin:0"><b>✏️ ویرایش اعضای:</b>${seg2([['4','گروه‌بندی چهارتایی'],['2','گروه‌بندی دوتایی']],String(em),`U.gv=+'@';draw()`)}${em!==cm?`<span class="dn">⚠ این هفته ${cm===2?'دوتایی':'چهارتایی'} است؛ شما گروه‌بندی ${em===2?'دوتایی':'چهارتایی'} را ویرایش می‌کنید.</span>`:''}</div><label class="m" style="display:block;margin-top:8px"><input type="checkbox" checked onchange="setDual('${cl}',this.checked)"> این کلاس گروه‌بندی دوتایی هم دارد (برای برداشتن تیک بزنید؛ داده‌ها حفظ می‌شود)</label></div>`
  :`<details class="c" style="margin-bottom:10px"><summary style="cursor:pointer" class="m">⚙ این کلاس هم گروه‌بندی دوتایی دارد؟</summary><label style="display:block;margin-top:8px"><input type="checkbox" onchange="setDual('${cl}',this.checked)"> بله، برای این کلاس هم می‌خواهم هر هفته بین گروه‌بندی چهارتایی و دوتایی انتخاب کنم</label></details>`;
 return ctl+(em===2?xgrp2(cl):xgrp4(cl))}
function autoDiv2(cl:string,mode:string){const E=ensureEx();E.g2=E.g2||{};const ss=snap().filter((s:any)=>s.cls===cl);ss.forEach((s:any)=>delete E.g2[s.id]);
 if(mode==='q')ss.forEach((s:any)=>{const g=E.g[s.id];if(g==='A'||g==='B')E.g2[s.id]='A';else if(g==='C'||g==='D')E.g2[s.id]='B'});
 else{const a=[...ss];if(mode==='h')a.sort(byNum);else if(mode==='a')a.sort((x:any,y:any)=>x.name.localeCompare(y.name,'fa'));else if(mode==='l')a.sort((x:any,y:any)=>(y.l||0)-(x.l||0));else a.sort(()=>Math.random()-.5);
  const half=Math.ceil(a.length/2);a.forEach((s:any,i:number)=>{E.g2[s.id]=mode==='l'?[0,1,1,0][i%4]?'B':'A':i<half?'A':'B'})}
 save();draw()}
function xgrp2(cl:string){const E=ensureEx();E.g2=E.g2||{};const ss=snap().filter((s:any)=>s.cls===cl).sort(byNum),pool=ss.filter((s:any)=>!E.g2[s.id]);
 const mrow=(s:any)=>`<div class="exm"><span class="av">${s.num?n(s.num):'·'}</span><span style="flex:1;min-width:0">${esc(s.name)}</span><select onchange="setG('${s.id}',this.value,2)">${['','A','B'].map(L=>`<option value="${L}" ${(E.g2[s.id]||'')===L?'selected':''}>${L||'بدون گروه'}</option>`).join('')}</select></div>`;
 const bar=`<div class="exbar">${G2.map(L=>{const c=ss.filter((s:any)=>E.g2[s.id]===L).length;return c?`<span style="flex:${c};background:${GC[GL.indexOf(L)]}">${L} · ${n(c)}</span>`:''}).join('')}${pool.length?`<span style="flex:${pool.length};background:#94a3b8">؟ · ${n(pool.length)}</span>`:''}</div>`;
 return `<div class="c" style="margin-top:10px"><b>گروه‌بندی دوتایی ${cl}</b>${bar}<p class="m" style="margin:6px 0 8px">دو گروه A و B؛ هر گروه در هفته‌هایی که «۲ گروهی» انتخاب شده، دو روز از چهار روز مدرسه معاف است. این گروه‌بندی کاملاً جدا از گروه‌های چهارتایی نگهداری می‌شود.</p>
 <div class="tb"><span class="m">تقسیم خودکار:</span><button class="btn p" onclick="autoDiv2('${cl}','q')">از روی چهارتایی (A+B ← A ، C+D ← B)</button><button class="btn" onclick="autoDiv2('${cl}','h')">نصف‌نصف بر اساس شماره</button><button class="btn" onclick="autoDiv2('${cl}','a')">الفبایی</button><button class="btn" onclick="autoDiv2('${cl}','l')">متوازن بر اساس تراز</button><button class="btn" onclick="autoDiv2('${cl}','r')">تصادفی</button></div></div>
 <div class="g2" style="margin-top:12px">${G2.map(L=>{const m=ss.filter((s:any)=>E.g2[s.id]===L);return `<div class="exgc" style="--gc:${GC[GL.indexOf(L)]}"><div class="exgh"><i>${L}</i><b>گروه ${L} (دوتایی)</b><span>${n(m.length)} نفر</span></div>${m.map(mrow).join('')||'<p class="m" style="padding:8px">خالی</p>'}</div>`}).join('')}${pool.length?`<div class="exgc" style="--gc:#94a3b8"><div class="exgh"><i>؟</i><b>بدون گروه</b><span>${n(pool.length)} نفر</span></div>${pool.map(mrow).join('')}</div>`:''}</div>`}
function autoDiv(cl:string,mode:string,quiet?:boolean){const E=D.ex;
 if(mode==='n'||mode==='i'){E.rng=E.rng||{};E.rng[cl]=defRng(cl);applyRng(cl,true);if(!quiet){save();draw()}return}
 const ss=snap().filter(s=>s.cls===cl);ss.forEach(s=>delete E.g[s.id]);
 if(mode==='a')ss.sort((a,b)=>a.name.localeCompare(b.name,'fa'));else if(mode==='r')ss.sort(()=>Math.random()-.5);else ss.sort((a,b)=>(b.l||0)-(a.l||0));
 const m=Math.floor(ss.length/4),k=m*4;
 for(let i=0;i<k;i++){let c=Math.floor(i/m);if(mode==='b'){c=i%4;if(Math.floor(i/4)%2)c=3-c}E.g[ss[i].id]=GL[c]}
 if(!quiet){save();draw()}}
/* timetable */
function xtt(){const cl=U.xc,E=ensureEx(),T=tt(cl),subs=[...new Set(SUBJ.concat(Object.values(E.tt).flat(2) as string[]))].filter(Boolean);
 let h=`<datalist id="sj">${subs.map(x=>`<option value="${esc(x)}">`).join('')}</datalist>
 <div class="c"><div class="tb" style="margin:0 0 8px"><b>⚙ تنظیمات برنامه</b><span style="flex:1"></span><span class="m">تعداد ساعت در روز:</span><button class="btn" onclick="per(-1)">−</button><b>${n(E.per)}</b><button class="btn" onclick="per(1)">＋</button></div>
 <label class="exopt"><input type="checkbox" ${E.pair!==false?'checked':''} onchange="setPair(this.checked)"> <span><b>درس‌های دو جلسه‌ای:</b> دانش‌آموزان معاف از کلاس یک معلم، در همه‌ی ساعت‌هایی که همان درس نوشته شده معاف باشند.</span></label>
 <p class="m" style="margin:8px 0 0">درس هر ساعت را بنویسید. دکمه‌ی 👤 برای معلمی است که می‌گوید «هر کس نمی‌خواهد، شرکت نکند»؛ دانش‌آموزان معاف آن ساعت را از آنجا انتخاب می‌کنید.</p></div>
 <div class="xttg">`;
 for(let d=0;d<4;d++){const L=letterC(cl,d,U.w);h+=`<div class="c xttd" style="--gc:${GC[GL.indexOf(L)]}"><div class="xtth"><b>${DAYN[d]}</b></div>`;
  for(let p=0;p<E.per;p++)h+=`<div class="xttr"><span class="no">${n(p+1)}</span><input list="sj" value="${esc(T[d][p]||'')}" placeholder="درس…" onchange="setT('${cl}',${d},${p},this.value)"><button class="btn" onclick="cellm(${d},${p})" title="معافیت معلم این ساعت">👤${n(fx(cl,d,p).length)}</button></div>`;
  h+='</div>'}
 return h+'</div>'}
const setT=(cl:string,d:number,p:number,v:string)=>{tt(cl)[d][p]=v.trim();save()};
const setPair=(v:boolean)=>{ensureEx().pair=v;save()};
const per=(k:number)=>{const E=ensureEx();E.per=Math.max(3,Math.min(8,E.per+k));save();draw()};
/* progress */
function pickKeys(cl:string,sid:string,w:number){const E=ensureEx(),sk=E.skip[sid]||[],out:string[]=[],used=new Set<string>(),cand:any[]=[];
 for(let d=0;d<4;d++)for(let p=0;p<E.per;p++){const s=subj(cl,d,p);if(sk.includes(s)&&!status(sid,cl,w,d,p))cand.push([d,p,s])}
 for(const[d,p,s]of cand)if(out.length<2&&!used.has(s)){used.add(s);out.push(d+'-'+p)}
 for(const[d,p]of cand){const k=d+'-'+p;if(out.length<2&&!out.includes(k))out.push(k)}
 return out}
function xprog(){const cl=U.xc,w=U.w,E=ensureEx(),ss=snap().filter((s:any)=>s.cls===cl),T=tt(cl),subs=[...new Set(T.flat().filter(Boolean))] as string[],pw=E.pw[w]||{};
 const sug=new Set(ss.filter((s:any)=>s.d>0).sort((a:any,b:any)=>b.d-a.d).slice(0,3).map((s:any)=>s.id));
 const cards=[...ss].sort((a:any,b:any)=>(sug.has(b.id)?1:0)-(sug.has(a.id)?1:0)||(b.l||0)-(a.l||0)).map((s:any)=>`<div class="exstu ${pw[s.id]?'has':''}"><div class="tb" style="margin:0 0 8px;flex-wrap:nowrap"><div class="av">${esc(xini(s.name))}</div><div style="flex:1;min-width:0"><b>${esc(s.name)}</b>${sug.has(s.id)?' <span class="tag" style="background:#8b5cf6;color:#fff;border-color:#8b5cf6">⭐ پیشنهاد</span>':''}<div class="m">تراز ${n(s.l)} ${dl(s.d)}</div></div></div>
  <div class="m" style="margin-bottom:4px">درس‌های دلخواه برای معافیت:</div><div class="chips" style="margin:0 0 10px">${subs.map(k=>`<button class="${(E.skip[s.id]||[]).includes(k)?'on':''}" onclick="tgSkip('${s.id}','${esc(k)}')">${esc(k)}</button>`).join('')||'<span class="m">اول برنامه‌ی کلاسی را وارد کنید</span>'}</div>
  <div class="tb" style="margin:0">${pw[s.id]?`${pw[s.id].map((k:string)=>{const[d,p]=k.split('-');return `<span class="tag" style="background:#ec4899;color:#fff;border-color:#ec4899">${DAYN[+d]} ساعت ${n(+p+1)} ${esc(subj(cl,+d,+p))}</span>`}).join('')}<span style="flex:1"></span><button class="btn" onclick="revoke('${s.id}')">لغو</button>`:`<span class="m" style="flex:1">این هفته معافیت پیشرفت ندارد</span><button class="btn p" onclick="grant('${s.id}')">🚀 اعطا</button>`}</div></div>`).join('');
 return `<div class="c"><b>🚀 معافیت پیشرفت</b><p class="m" style="margin:6px 0 0">۱) درس‌هایی را که هر دانش‌آموز نمی‌خواهد در آن‌ها حاضر شود انتخاب کنید (فقط درس‌های برنامه‌ی همین کلاس). ۲) «اعطا» دو ساعت از همان درس‌ها را که این هفته معاف نیست خودکار تعیین می‌کند؛ بعداً در تقویم قابل تغییر است. ⭐ یعنی بیشترین پیشرفت تراز.</p></div>
 <div style="margin-top:10px">${insSeg()}</div><div class="exsg">${cards}</div>`}
function tgSkip(id:string,k:string){const E=ensureEx(),a=E.skip[id]||[];E.skip[id]=a.includes(k)?a.filter(x=>x!==k):[...a,k];save();draw()}
function grant(id:string){const s=D.students.find(x=>x.id===id),keys=pickKeys(s.cls,id,U.w);
 if(!keys.length){alert('هیچ کلاسی مناسب نیست: یا درس دلخواه انتخاب نشده، یا همه‌ی ساعت‌های آن درس در این هفته به‌خاطر معافیت گروه/معلم از قبل معاف است.');return}
 if(keys.length<2)alert('فقط یک ساعت مناسب پیدا شد (ساعت‌هایی که از قبل معاف است حساب نمی‌شود). درس دلخواه بیشتری انتخاب کنید.');
 const E=ensureEx();(E.pw[U.w]=E.pw[U.w]||{})[id]=keys;save();draw()}
function revoke(id:string){const m=ensureEx().pw[U.w]||{};delete m[id];save();draw()}
/* export image */
let FB:string|null=null;
async function fontB64(){if(FB)return FB;const b=new Uint8Array(await (await fetch(fontUrl)).arrayBuffer());let t='';for(let i=0;i<b.length;i+=8192)t+=String.fromCharCode(...b.subarray(i,i+8192));return FB=btoa(t)}
function svgOf(cl:string,w:number,sv:string,font:string){const E=ensureEx(),W=940,pad=16,lw=46,cw=(W-2*pad-lw)/4,rh=84,top=100,leg=sv?0:lets(cl,w).length*26+14,H=top+E.per*rh+leg+pad,X=(d:number)=>W-pad-lw-(d+1)*cw;
 const stn:any={g:'معافیت گروه',f:'معافیت معلم',p:'معافیت پیشرفت'},col:any={g:'#10b981',f:'#f59e0b',p:'#ec4899'};
 const T=(x:number,y:number,t:string,sz=14,c='#1b1d2a',wt=400)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${sz}" fill="${c}" font-weight="${wt}">${esc(t)}</text>`;
 let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" direction="rtl"><style>@font-face{font-family:V;src:url(data:font/woff2;base64,${font})}text{font-family:V,Tahoma,sans-serif}</style><rect width="100%" height="100%" fill="#f4f5fa"/>`;
 s+=T(W/2,34,`برنامه‌ی هفتگی ${cl}${sv?' — '+nm(sv):''}`,22,'#1b1d2a',800)+T(W/2,60,`${jd(dateOf(w,0))} تا ${jd(dateOf(w,3))}`,14,'#6b6f85');
 for(let d=0;d<4;d++){const L=letterC(cl,d,w),c=GC[GL.indexOf(L)];s+=`<rect x="${X(d)+3}" y="72" width="${cw-6}" height="40" rx="10" fill="${c}"/>`+T(X(d)+cw/2,90,DAYN[d]+' · '+jd(dateOf(w,d)),14,'#fff',800)+T(X(d)+cw/2,106,'گروه '+L,11,'#fff')}
 for(let p=0;p<E.per;p++){const y=top+16+p*rh;s+=T(W-pad-lw/2,y+rh/2,String(p+1).replace(/\d/g,x=>'۰۱۲۳۴۵۶۷۸۹'[+x]),16,'#6b6f85',800);
  for(let d=0;d<4;d++){const L=letterC(cl,d,w),c=GC[GL.indexOf(L)],st=sv?status(sv,cl,w,d,p):null,f=fx(cl,d,p),pg=pgIn(cl,w,d,p);
   s+=`<rect x="${X(d)+3}" y="${y}" width="${cw-6}" height="${rh-8}" rx="10" fill="${st?col[st]+'33':'#fff'}" stroke="${st?col[st]:'#e3e5ef'}" stroke-width="${st?2:1}"/>`+T(X(d)+cw/2,y+26,subj(cl,d,p),16,'#1b1d2a',800);
   if(sv)s+=T(X(d)+cw/2,y+52,st?stn[st]:'حضور',13,st?col[st]:'#6b6f85',st?800:400);
   else{let k=0;if(f.length)s+=T(X(d)+cw/2,y+46+13*k++,'معلم: '+names(f,2),11,'#b45309');if(pg.length)s+=T(X(d)+cw/2,y+46+13*k++,'پیشرفت: '+names(pg,2),11,'#be185d')}}}
 if(!sv)lets(cl,w).forEach((L:string,i:number)=>{const y=top+16+E.per*rh+10+i*26,t=members(cl,L,w);s+=`<circle cx="${W-pad-10}" cy="${y-4}" r="9" fill="${GC[GL.indexOf(L)]}"/>`+T(W-pad-10,y,L,11,'#fff',800)+`<text x="${W-pad-28}" y="${y}" text-anchor="start" direction="rtl" font-size="13" fill="#1b1d2a" style="unicode-bidi:plaintext">${esc(names(t,9))}</text>`});
 return s+'</svg>'}
async function xpng(){const sv=U.sv&&D.students.find(s=>s.id===U.sv&&s.cls===U.xc)?U.sv:'',svg=svgOf(U.xc,U.w,sv,await fontB64());
 const img=new Image();img.onload=()=>{const k=2,cv=document.createElement('canvas');cv.width=img.width*k;cv.height=img.height*k;const c=cv.getContext('2d');c.scale(k,k);c.drawImage(img,0,0);cv.toBlob(b=>saveFile(`${U.xc}-${sv?nm(sv)+'-':''}هفته.png`,b),'image/png')};
 img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
const SV=mkServer({get D(){return D},annActive:()=>annActive(),toast,letterC,bg:()=>bgDraw(),sexams,save,draw:()=>draw(),esc,n,saveFile,ensureEx,tt,status,letter,dateOf,wk0,commit:(f:any)=>commit(f),CFG,U});
const EX=mkExams({get D(){return D},U,save,draw:()=>draw(),bg:()=>bgDraw(),esc,n,n1,avg,line,hue,spark,CL,byNum,today,SV,scn,schp:()=>schp(),FILES:()=>FILES,dlf:(...a:any[])=>(dlf as any)(...a),toast});
const AT2=mkAttend({get D(){return D},U,letterC,bg:()=>bgDraw(),esc,n,save,draw:()=>draw(),toast,dateOf,wk0,mid,DAYN,GL,GC,CL,letter,status,subj,byNum,SV,dlf:(...a:any[])=>(dlf as any)(...a),bars,op,sf});
AP=SV.autoPub;
Object.assign(W,SV.h,EX.h,AT2.h);
SV.init();
/* ---------- آزمون‌های مدرسه (فقط نمره‌ی هر درس؛ بدون معدل) ---------- */
function mkSch(t:string,date:string,c:string){const ls=[...new Set(tt(c).flat().filter(Boolean))].map((name:string)=>({name,max:20}));const id='h'+Date.now().toString(36);ensureSch().exams.push({id,title:t,date,cls:c,lessons:ls,sc:{}});U.sx=id;save()}
function schp(){const S=ensureSch(),E=sexams().reverse();if(!U.sx||!S.exams.find(e=>e.id===U.sx))U.sx=E[0]?.id;const e=S.exams.find(x=>x.id===U.sx);
 return `<div class="g2"><div class="c"><h3>آزمون‌های مدرسه</h3>${E.map(x=>`<div class="row" onclick="U.sx='${x.id}';draw()" style="${x.id===U.sx?'font-weight:800;color:var(--ac)':''}"><span>${esc(x.title)} <span class="tag">${x.cls}</span></span><span class="m">${esc(x.date)}</span></div>`).join('')||'<p class="m">آزمونی نیست</p>'}</div>
 <div class="c"><h3>آزمون مدرسه‌ی جدید</h3><div class="tb"><input id="ht" placeholder="مثلاً میان‌ترم ۲"><input id="hd" value="${today()}" style="width:110px"><select id="hc">${CL.map(c=>`<option ${c===U.xc?'selected':''}>${c}</option>`).join('')}</select></div><button class="btn p" onclick="newSch()">ایجاد؛ درس‌ها از برنامه‌ی کلاس پر می‌شود</button><p class="m">نمره‌ی آزمون مدرسه فقط برای دیدن عملکرد و نمودار است.</p></div></div>${e?schGrid(e):''}`}
function schGrid(e){const ss=D.students.filter(s=>s.cls===e.cls),mean=(f)=>{const v=ss.map(f).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
 return `<div class="c" style="margin-top:10px"><div class="tb"><h3 style="margin:0;flex:1">${esc(e.title)} <span class="tag">${e.cls}</span> <span class="m">${esc(e.date)}</span></h3><button class="btn" onclick="schCsv('${e.id}')">CSV</button><button class="btn" style="color:var(--bad)" onclick="schDel('${e.id}')">حذف</button></div>
 <div class="tb"><input id="hl" list="hls" placeholder="افزودن درس…" style="width:150px"><datalist id="hls">${[...new Set(tt(e.cls).flat().filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join('')}</datalist><button class="btn" onclick="schLA('${e.id}')">+ درس</button><span class="m">حداکثر نمره‌ی هر درس را زیر نامش تنظیم کنید.</span></div>
 <div class="tw"><table><thead><tr><th>دانش‌آموز</th>${e.lessons.map((l,i)=>`<th>${esc(l.name)} <button class="btn" style="padding:0 6px" onclick="schLR('${e.id}',${i})">✕</button><div class="m">حداکثر <input type="number" value="${l.max}" style="width:52px" onchange="schL('${e.id}',${i},this.value)"></div></th>`).join('')}</tr></thead>
 <tbody>${ss.map(s=>`<tr style="cursor:default"><td>${esc(s.name)}</td>${e.lessons.map(l=>`<td><input type="number" step="0.25" min="0" max="${l.max}" style="width:64px" value="${e.sc[s.id]?.[l.name]??''}" onchange="schS('${e.id}','${s.id}','${esc(l.name)}',this.value)"></td>`).join('')}</tr>`).join('')}</tbody>
 <tfoot><tr><th>میانگین کلاس</th>${e.lessons.map((l,i)=>`<th id="fm_${i}">${n1(mean(s=>e.sc[s.id]?.[l.name]))}</th>`).join('')}</tr></tfoot></table></div></div>`}
function newSch(){const t=$('#ht').value.trim();if(!t)return;mkSch(t,$('#hd').value.trim(),$('#hc').value);draw()}
const schE=id=>ensureSch().exams.find(e=>e.id===id);
function schS(eid,sid,ln,v){const e=schE(eid),l=e.lessons.find(x=>x.name===ln);e.sc[sid]=e.sc[sid]||{};if(v==='')delete e.sc[sid][ln];else e.sc[sid][ln]=Math.max(0,Math.min(l.max,+v||0));save();
 const ss=D.students.filter(s=>s.cls===e.cls);e.lessons.forEach((l,i)=>{const x=ss.map(s=>e.sc[s.id]?.[l.name]).filter(z=>z!=null),f=document.getElementById('fm_'+i);if(f)f.textContent=n1(x.length?x.reduce((p,q)=>p+q,0)/x.length:null)})}
function schL(eid,i,v){const l=schE(eid).lessons[i];l.max=Math.max(1,+v||l.max);save();draw()}
function schLA(eid){const nmv=$('#hl').value.trim(),e=schE(eid);if(!nmv||e.lessons.some(l=>l.name===nmv))return;e.lessons.push({name:nmv,max:20});save();draw()}
function schLR(eid,i){const e=schE(eid);if(!confirm('درس «'+e.lessons[i].name+'» با همه‌ی نمره‌هایش حذف شود؟'))return;const nmv=e.lessons[i].name;e.lessons.splice(i,1);Object.values(e.sc).forEach((o:any)=>delete o[nmv]);save();draw()}
function schDel(eid){if(!confirm('این آزمون حذف شود؟'))return;D.sch.exams=D.sch.exams.filter(e=>e.id!==eid);U.sx=null;save();draw()}
function schCsv(eid){const e=schE(eid);dlf(e.title+'.csv',[['نام',...e.lessons.map(l=>l.name)],...D.students.filter(s=>s.cls===e.cls).map(s=>[s.name,...e.lessons.map(l=>e.sc[s.id]?.[l.name]??'')])])}
/* ---------- اطلاعیه‌ها ---------- */
const annActive=()=>(D.ann||[]).filter(a=>daysLeft(a.exp)>=0).sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)||(a.exp<b.exp?-1:1));
function annKeep(){U.ad={st:$('#ast').value,t:$('#at').value,b:$('#ab').value,c:$('#ac2').value,ev:$('#aev').value,exp:$('#aexp').value,pin:$('#apin').checked}}
function annPage(){D.ann=D.ann||[];U.at=U.at||'exam';const AD=U.ad||{},act=annActive(),old=D.ann.filter(a=>daysLeft(a.exp)<0);
 return `<div class="g2"><div class="c"><h3>اطلاعیه‌ی جدید</h3>
 <div class="tb">${Object.entries(ANN).map(([k,t]:any)=>`<button class="btn" style="${U.at===k?`background:${t.c};color:#fff;border-color:transparent`:''}" onclick="annType('${k}')">${t.i} ${t.t}</button>`).join('')}</div>
 <div class="tb" style="flex-direction:column;align-items:stretch"><input id="at" value="${esc(AD.t||'')}" placeholder="عنوان (مثلاً آزمون ماز ۲۴ آبان)"><textarea id="ab" placeholder="توضیح (اختیاری): ساعت، محل، منابع…">${esc(AD.b||'')}</textarea>
 <div class="tb"><label class="m">برای <select id="ac2"><option value="all">همه‌ی کلاس‌ها</option>${CL.map(c=>`<option ${AD.c===c?'selected':''}>${c}</option>`).join('')}</select></label><label class="m">تاریخ رویداد <input id="aev" class="dp" readonly dir="ltr" placeholder="📅 انتخاب تاریخ" value="${esc(AD.ev||'')}" onclick="openJP('aev',{cb:v=>{const e=document.getElementById('aexp');if(v&&!e.value)e.value=v}})"></label></div>
 <div class="tb"><label class="m">نمایش از <input id="ast" class="dp" readonly dir="ltr" placeholder="از همین حالا" value="${esc(AD.st||'')}" onclick="openJP('ast')"></label><button class="btn" onclick="annOnly()" title="فقط در روز رویداد نمایش داده شود">فقط روز رویداد</button></div>
 <div class="tb"><label class="m">نمایش تا <input id="aexp" class="dp" readonly dir="ltr" placeholder="📅 انتخاب تاریخ" value="${esc(AD.exp||'')}" onclick="openJP('aexp')"></label>${[1,3,7,14].map(d=>`<button class="btn" onclick="annExp(${d})">${n(d)} روز</button>`).join('')}</div>
 <label><input type="checkbox" id="apin" ${AD.pin?'checked':''}> سنجاق (بالای فهرست)</label><button class="btn p" onclick="annNew()">انتشار اطلاعیه</button>
 <p class="m" style="margin:0">اطلاعیه فقط بین «نمایش از» و «نمایش تا» در پنل دانش‌آموز دیده می‌شود (خالی = از همین حالا تا تاریخ رویداد یا ۷ روز). بعد از آن خودکار حذف می‌شود. «فقط روز رویداد» آن را فقط همان یک روز نشان می‌دهد.</p></div></div>
 <div><h3 style="margin:4px 0 10px">فعال (${n(act.length)})</h3>${act.map(a=>annHtml(a,`<div class="tb" style="margin:8px 0 0"><button class="btn" onclick="annDel('${a.id}')">حذف</button></div>`)).join('')||'<div class="c m">اطلاعیه‌ی فعالی نیست.</div>'}
 ${old.length?`<details class="c"><summary style="cursor:pointer">منقضی‌شده (${n(old.length)})</summary>${old.map(a=>annHtml(a)).join('')}<button class="btn" onclick="annClean()">پاک‌کردن منقضی‌ها</button></details>`:''}</div></div>`}
function annOnly(){const v=$('#aev').value;if(!v){alert('اول تاریخ رویداد را انتخاب کنید.');return}$('#ast').value=v;$('#aexp').value=v}
const annType=(k:string)=>{annKeep();U.at=k;draw()};
function annExp(d:number){const t=new Date();t.setDate(t.getDate()+d);const iso=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;$('#aexp').value=iso2j(iso)}
function annSync(){return SV.h.annSync().then(()=>toast('برای دانش‌آموزان منتشر شد ✓')).catch(()=>toast('ذخیره شد. برای نمایش به دانش‌آموزان، در تب «سرور» وارد شوید؛ بعد از ورود خودکار منتشر می‌شود.'))}
function annNew(){const t=$('#at').value.trim();if(!t){alert('عنوان را بنویسید.');return}
 const evT=$('#aev').value.trim(),evI=evT?j2iso(evT):null,expT=$('#aexp').value.trim();if(evT&&!evI){alert('تاریخ رویداد را به شکل 1405/08/24 بنویسید.');return}
 let exp=expT?j2iso(expT):(evI||(()=>{const d=new Date();d.setDate(d.getDate()+7);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`})());
 if(!exp){alert('تاریخ «نمایش تا» را به شکل 1405/08/24 بنویسید.');return}if(daysLeft(exp)<0){alert('این تاریخ گذشته است.');return}
 const stT=$('#ast').value.trim(),st=stT?j2iso(stT):null;if(stT&&!st){alert('تاریخ «نمایش از» معتبر نیست.');return}if(st&&st>exp){alert('«نمایش از» نباید بعد از «نمایش تا» باشد.');return}
 D.ann=D.ann||[];D.ann.push({id:'n'+Date.now().toString(36),type:U.at,title:t,body:$('#ab').value.trim(),cls:$('#ac2').value,ev:evT,starts:st,exp,pin:$('#apin').checked});U.ad=null;save();draw();annSync()}
function annDel(id:string){if(!confirm('این اطلاعیه حذف شود؟'))return;D.ann=D.ann.filter(a=>a.id!==id);save();draw();annSync()}
function annClean(){D.ann=D.ann.filter(a=>daysLeft(a.exp)>=0);save();draw()}
/* ---------- جستجوی سریع (Ctrl+K) ---------- */
let PI=0,PL:any[]=[];
const normQ=(t:string)=>t.replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/ي/g,'ی').replace(/ك/g,'ک').toLowerCase();
const ACTS:any[]=[['خانه',()=>go('home')],['تقویم معافیت',()=>{U.xs='cal';go('ex')}],['گروه‌ها',()=>{U.xs='grp';go('ex')}],['برنامه کلاسی',()=>{U.xs='tt';go('ex')}],['معافیت پیشرفت',()=>{U.xs='prg';go('ex')}],['نتایج هر آزمون',()=>W.xgo('ex')],['نتایج هر دانش‌آموز',()=>W.xgo('st')],['دریافت و اسکن کارنامه',()=>W.xgo('in')],['مدیریت آزمون‌ها',()=>W.xgo('mg')],['آزمون‌های مدرسه',()=>W.xgo('sch')],['اطلاعیه‌ها',()=>go('ann')],['وقت مشاوره',()=>go('con')],['سرور و انتشار',()=>go('srv')],['ابزار و خروجی',()=>go('exp')]];
function palRender(q:string){q=normQ(q.trim());
 const st=D.students.filter(x=>!q||normQ(x.name).includes(q)||String(x.num)===q).sort(byNum).slice(0,q?8:4).map(x=>({t:x.name,s:`${x.cls} · شماره ${n(x.num)}`,i:'👤',f:()=>op(x.id)}));
 const pg=ACTS.filter(([t])=>!q||normQ(t).includes(q)).slice(0,q?6:8).map(([t,f])=>({t,s:'برو به',i:'↗',f}));
 PL=[...st,...pg];PI=0;
 $('#pr').innerHTML=PL.map((x,i)=>`<div class="pi ${i===0?'on':''}" onmouseenter="palHi(${i})" onclick="palGo(${i})"><i>${x.i}</i><div><b>${esc(x.t)}</b><small>${esc(x.s)}</small></div></div>`).join('')||'<p class="m" style="padding:14px">چیزی پیدا نشد</p>'}
const palHi=(i:number)=>{PI=i;document.querySelectorAll('#pr .pi').forEach((e:any,k:number)=>e.classList.toggle('on',k===i))};
function openPal(){$('#pal').classList.add('on');$('#pq').value='';palRender('');setTimeout(()=>$('#pq').focus(),30)}
const closePal=()=>$('#pal').classList.remove('on');
function palGo(i:number){const x=PL[i];if(!x)return;closePal();x.f()}
if(typeof document.addEventListener==='function'){
 document.addEventListener('keydown',(e:any)=>{
  if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault();openPal();return}
  if(!$('#pal').classList.contains('on'))return;
  if(e.key==='Escape')closePal();else if(e.key==='ArrowDown'){e.preventDefault();palHi(Math.min(PL.length-1,PI+1))}else if(e.key==='ArrowUp'){e.preventDefault();palHi(Math.max(0,PI-1))}else if(e.key==='Enter')palGo(PI)});
 $('#pq').addEventListener('input',(e:any)=>palRender(e.target.value));
 $('#pal').addEventListener('click',(e:any)=>{if(e.target.id==='pal')closePal()});
 $('#md').addEventListener('click',(e:any)=>{if(e.target.id==='md')cm()});
}
initUi();
initPwa();

Object.assign(W,{setGMode,setG2c,setDual,gmodeAll,gmodeAlt,autoDiv2,wk0,snaps,snapRestore,annOnly,setRot,annType,annExp,annNew,annDel,annClean,restoreB,openPal,palGo,palHi,toast,stuNav,addNote,delNote,rd,repCsv,repg,setNum,renum,sf,applyRng,setRng,setPair,schp,newSch,schS,schL,schLA,schLR,schDel,schCsv,cellm,tgFx,addPw,rmPw,setG,autoDiv,setT,per,grant,revoke,tgSkip,wstep,xpng,home,U,D,go,draw,op,cm,sg,sn,delS,addS,sr,addE,paste,delE,x1,x2,x3,x4,bk,reset,wipe,pick,rmf,sfs,er,commit1,commitAll,get FILES(){return FILES},set FILES(v){FILES=v}});
draw();
}
