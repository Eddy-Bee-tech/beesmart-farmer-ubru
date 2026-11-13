const DB='beesmart-web-v1', STORE='records';let db, owner=null, farms=[],apiaries=[],hives=[],activities=[],money=[];
const $=s=>document.querySelector(s), today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}, id=()=>crypto.randomUUID(), baht=n=>'฿'+Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function openDB(){return new Promise((res,rej)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function all(){return new Promise((res,rej)=>{let r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function put(v){return new Promise((res,rej)=>{let r=db.transaction(STORE,'readwrite').objectStore(STORE).put(v);r.onsuccess=()=>res(v);r.onerror=()=>rej(r.error)})}
function del(key){return new Promise((res,rej)=>{let r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function refresh(){let a=await all();owner=a.find(x=>x.type==='owner')||null;farms=a.filter(x=>x.type==='farm');apiaries=a.filter(x=>x.type==='apiary');hives=a.filter(x=>x.type==='hive');activities=a.filter(x=>['inspection','feeding','harvest'].includes(x.type)).sort((x,y)=>y.date.localeCompare(x.date));money=a.filter(x=>x.type==='income'||x.type==='expense').sort((x,y)=>y.date.localeCompare(x.date));render()}
function toast(t){let e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
function render(){let has=!!owner;$('#welcome').classList.toggle('hidden',has);$('#app').classList.toggle('hidden',!has);$('#nav').classList.toggle('hidden',!has);if(!has)return;$('#greeting').textContent='สวัสดี '+owner.name+' · ข้อมูลอยู่ในอุปกรณ์นี้';$('#k-hives').innerHTML=hives.filter(x=>x.status!=='inactive').length+' <small>รัง</small>';$('#k-farms').textContent=farms.length;$('#k-apiaries').textContent=apiaries.length;$('#k-inspections').textContent=activities.filter(x=>x.type==='inspection').length;$('#k-income').textContent=baht(money.filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0));$('#k-expense').textContent=baht(money.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amount,0));$('#farmsList').innerHTML=cards(farms,x=>`🌿 ${esc(x.name)}`,x=>`${esc(x.province||'ไม่ระบุจังหวัด')} · ${apiaries.filter(a=>a.farmId===x.id).length} จุดเลี้ยง`,'ยังไม่มีข้อมูลฟาร์ม');$('#apiariesList').innerHTML=cards(apiaries,x=>`📍 ${esc(x.name)}`,x=>farms.find(f=>f.id===x.farmId)?.name||'ไม่พบฟาร์ม','ยังไม่มีจุดเลี้ยง');$('#hivesList').innerHTML=hiveCards(hives);$('#activityList').innerHTML=activityCards(activities.slice(0,100));$('#moneyList').innerHTML=cards(money,x=>`${x.type==='income'?'รายรับ':'รายจ่าย'} · ${esc(x.description)}`,x=>`${esc(x.date)} · ${esc(farms.find(f=>f.id===x.farmId)?.name||'')} · ${baht(x.amount)}`,'ยังไม่มีรายการบัญชี');$('#ownerInfo').innerHTML=`<b>${esc(owner.name)}</b><p class="muted">${esc(owner.org||'')} ${esc(owner.phone||'')}</p>`}
function cards(arr,title,sub,empty){return arr.length?arr.map(x=>`<article class="item"><strong>${title(x)}</strong><p>${sub(x)}</p></article>`).join(''):`<div class="empty">${empty}</div>`}
function compareHiveCode(a,b){const codeCmp=String(a.code||'').localeCompare(String(b.code||''),'en',{numeric:true,sensitivity:'base'});if(codeCmp!==0)return codeCmp;const apiCmp=String(apiaries.find(x=>x.id===a.apiaryId)?.name||'').localeCompare(String(apiaries.find(x=>x.id===b.apiaryId)?.name||''),'th',{numeric:true,sensitivity:'base'});return apiCmp||String(a.id).localeCompare(String(b.id));}
function sortedHives(arr){return [...arr].sort(compareHiveCode)}
function hiveCards(arr){
 if(!arr.length)return '<div class="empty">ยังไม่มีข้อมูลรังผึ้ง</div>';
 const active=arr.filter(h=>h.status!=='deleted');
 const counts=new Map();active.forEach(h=>{const k=(h.apiaryId||'')+'|'+String(h.code||'').trim().toUpperCase();counts.set(k,(counts.get(k)||0)+1)});
 const conflicts=active.filter(h=>(counts.get((h.apiaryId||'')+'|'+String(h.code||'').trim().toUpperCase())||0)>1);
 const warning=conflicts.length?`<div class="duplicate-warning"><b>พบรหัสรังซ้ำ ${conflicts.length} รายการ</b><p>ข้อมูลเดิมยังคงอยู่เพื่อรักษาประวัติกิจกรรม กรุณาเลือก “แก้ไข” ในรังที่ต้องการเปลี่ยนรหัส ระบบจะแนะนำรหัสที่ยังไม่ซ้ำ</p></div>`:'';
 return warning+sortedHives(arr).map(x=>{const api=apiaries.find(a=>a.id===x.apiaryId),farm=farms.find(f=>f.id===api?.farmId),removed=x.status==='deleted',dup=!removed&&(counts.get((x.apiaryId||'')+'|'+String(x.code||'').trim().toUpperCase())||0)>1;
 return `<article class="item ${dup?'item-duplicate':''}"><strong>🐝 รัง ${esc(x.code)} ${dup?'<span class="duplicate-tag">รหัสซ้ำ</span>':''}</strong><p>${esc(api?.name||'ไม่พบจุดเลี้ยง')} · ${esc(farm?.name||'')} · ${esc(x.species||'ไม่ระบุชนิดผึ้ง')} · ${removed?'เก็บเข้าคลัง':x.status==='inactive'?'ปิดใช้งาน':'ใช้งาน'}</p><div class="card-actions"><button type="button" data-hive-edit="${esc(x.id)}">แก้ไข</button><button type="button" class="danger" data-hive-delete="${esc(x.id)}">${removed?'ลบถาวร':'ลบ'}</button></div></article>`}).join('');
}
function apiaryCode(apiaryId,rows=apiaries){
 const apiary=rows.find(x=>x.id===apiaryId&&x.type!=='hive');
 const prefix=String(apiary?.name||'').trim().toUpperCase().replace(/\s+/g,'');
 return prefix||'B01';
}
function nextHiveCode(apiaryId,excludeId=''){
 const prefix=apiaryCode(apiaryId),used=new Set(hives.filter(h=>h.apiaryId===apiaryId&&h.id!==excludeId&&h.status!=='deleted').map(h=>String(h.code||'').trim().toUpperCase()));
 let n=1;while(used.has(prefix+String(n)))n++;
 return prefix+String(n);
}
function nextHiveCodeFromRows(rows,apiaryId,excludeId=''){
 const prefix=apiaryCode(apiaryId,rows),used=new Set(rows.filter(h=>h.type==='hive'&&h.apiaryId===apiaryId&&h.id!==excludeId&&h.status!=='deleted').map(h=>String(h.code||'').trim().toUpperCase()));
 let n=1;while(used.has(prefix+String(n)))n++;
 return prefix+String(n);
}
function saveHiveRecord(record){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),req=store.getAll();let failure=null,saved=null;
  req.onsuccess=()=>{const rows=req.result||[];let code=String(record.code||'').trim().toUpperCase();
   // Empty code means generate the next available code for the selected apiary at save time.
   if(!code)code=nextHiveCodeFromRows(rows,record.apiaryId,record.id);
   const duplicate=rows.find(r=>r.type==='hive'&&r.status!=='deleted'&&r.apiaryId===record.apiaryId&&r.id!==record.id&&String(r.code||'').trim().toUpperCase()===code);
   if(duplicate){failure=new Error('รหัสรัง '+code+' มีอยู่แล้วในจุดเลี้ยงนี้ แนะนำรหัส '+nextHiveCodeFromRows(rows,record.apiaryId,record.id));tx.abort();return;}
   saved={...record,code};store.put(saved);
  };
  tx.oncomplete=()=>resolve(saved||{...record,code:String(record.code||'').trim().toUpperCase()});
  tx.onerror=()=>reject(failure||tx.error||new Error('บันทึกไม่สำเร็จ'));
  tx.onabort=()=>reject(failure||tx.error||new Error('ยกเลิกการบันทึก'));
 });
}
async function editHive(hiveId){
 const h=hives.find(x=>x.id===hiveId);if(!h)return;
 const apiOpts=options(apiaries,x=>x.name);
 const fields=[field('จุดเลี้ยง','apiaryId',{select:apiOpts}),field('รหัสรัง','code',{required:true,value:h.code}),field('ชนิดผึ้ง','species',{select:['ผึ้งพันธุ์บัคฟาสต์','ผึ้งพันธุ์ยุโรป','ผึ้งพันธุ์เอเชีย','ชันโรง'].map(x=>({value:x,label:x}))}),field('วันที่เริ่มเลี้ยง','startDate',{type:'date',value:h.startDate||today()})];
 await modal('แก้ไขข้อมูลรัง',fields,async f=>{f.code=String(f.code||'').trim();if(!f.code)throw Error('กรุณาระบุรหัสรัง');await saveHiveRecord({...h,...f,status:h.status==='deleted'?'active':h.status||'active'});});
 const apiInput=$('#dlgFields [name="apiaryId"]'),codeInput=$('#dlgFields [name="code"]');
 if(apiInput&&codeInput){apiInput.value=h.apiaryId;apiInput.addEventListener('change',()=>{codeInput.value=nextHiveCode(apiInput.value,h.id);});}
}
async function deleteHive(hiveId){
 const h=hives.find(x=>x.id===hiveId);if(!h)return;
 const related=activities.some(x=>x.hiveId===hiveId);
 const message=related?`รัง ${h.code} มีประวัติกิจกรรม ระบบจะเก็บรังเข้าคลังและคงประวัติไว้ ต้องการดำเนินการหรือไม่?`:`ต้องการลบรัง ${h.code} หรือไม่?`;
 if(!confirm(message))return;
 if(related)await put({...h,status:'deleted',deletedAt:new Date().toISOString()});else await del(hiveId);
 await refresh();toast(related?'เก็บรังเข้าคลังและรักษาประวัติแล้ว':'ลบรังแล้ว');
}

function activityCards(arr){
 if(!arr.length)return '<div class="empty">ยังไม่มีบันทึกกิจกรรม</div>';
 return arr.map(x=>`<article class="item"><strong>${typeName(x.type)} · ${esc(x.hiveCode||'')}</strong><p>${esc(x.date)} · ${esc(x.detail||'')}${x.quantity!==undefined&&x.quantity!==''?` · ${esc(x.quantity)} ${esc(x.unit||'')}`:''}${x.estimatedValue!==undefined?` · มูลค่าประมาณ ${baht(x.estimatedValue)}`:''}${x.note?` · ${esc(x.note)}`:''}</p><div class="card-actions"><button type="button" data-activity-edit="${esc(x.id)}">แก้ไข</button><button type="button" class="danger" data-activity-delete="${esc(x.id)}">ลบ</button></div></article>`).join('');
}
function activityFingerprint(x){
 const qty=x.quantity===undefined||x.quantity===''?'':(Number.isFinite(Number(x.quantity))?String(Number(x.quantity)):String(x.quantity).trim());
 return JSON.stringify([x.type,x.hiveId,x.date,String(x.detail||'').trim().replace(/\\s+/g,' ').toLowerCase(),qty,String(x.unit||'').trim().toLowerCase(),String(x.note||'').trim().replace(/\\s+/g,' ').toLowerCase(),x.type==='harvest'?(x.unitPrice===''||x.unitPrice===undefined?'':String(Number(x.unitPrice))):'']);
}
function saveActivityRecord(record){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),req=store.getAll();let duplicateFound=false;
  req.onsuccess=()=>{const rows=req.result||[],fp=activityFingerprint(record);const duplicate=rows.find(r=>['inspection','feeding','harvest'].includes(r.type)&&r.id!==record.id&&activityFingerprint(r)===fp);
   if(duplicate){duplicateFound=true;tx.abort();return;}store.put(record);
  };
  tx.oncomplete=()=>resolve(record);tx.onerror=()=>reject(tx.error||new Error('บันทึกไม่สำเร็จ'));tx.onabort=()=>reject(duplicateFound?new Error('DUPLICATE_ACTIVITY'):tx.error||new Error('ยกเลิกการบันทึก'));
 });
}
async function deleteActivity(activityId){const a=activities.find(x=>x.id===activityId);if(!a)return;if(!confirm(`ยืนยันลบรายการ${typeName(a.type)} รัง ${a.hiveCode||''} วันที่ ${a.date}? การลบนี้จะไม่กระทบข้อมูลรังหรือรายการอื่น`))return;await del(activityId);await refresh();toast('ลบรายการกิจกรรมแล้ว')}
async function editActivity(activityId){const old=activities.find(x=>x.id===activityId);if(!old)return;const hiveOptions=options(sortedHives(hives.filter(h=>h.status!=='deleted')),h=>{const ap=apiaries.find(a=>a.id===h.apiaryId);return `${h.code} · ${ap?.name||''}`});
 const fields=[field('รังผึ้ง','hiveId',{required:true,select:hiveOptions,value:old.hiveId}),field('วันที่','date',{type:'date',required:true,value:old.date})];
 if(old.type==='inspection')fields.push(field('ความแข็งแรงของรัง','detail',{required:true,value:old.detail}));
 if(old.type==='feeding')fields.push(field('ชนิดอาหาร','detail',{required:true,value:old.detail}),field('ปริมาณ','quantity',{type:'number',step:'0.01',min:0.01,required:true,value:old.quantity}),field('หน่วย','unit',{required:true,select:[{value:'กรัม',label:'กรัม'},{value:'กิโลกรัม',label:'กิโลกรัม'},{value:'มิลลิลิตร',label:'มิลลิลิตร'},{value:'ลิตร',label:'ลิตร'}],value:old.unit}));
 if(old.type==='harvest')fields.push(field('ผลิตภัณฑ์','detail',{required:true,value:old.detail}),field('ปริมาณ','quantity',{type:'number',step:'0.01',min:0.01,required:true,value:old.quantity}),field('หน่วย','unit',{required:true,select:[{value:'กิโลกรัม',label:'กิโลกรัม'},{value:'กรัม',label:'กรัม'},{value:'ลิตร',label:'ลิตร'},{value:'มิลลิลิตร',label:'มิลลิลิตร'},{value:'ชิ้น',label:'ชิ้น'}],value:old.unit}),field('ราคาต่อหน่วย (บาท) — ไม่บังคับ','unitPrice',{type:'number',step:'0.01',min:0,value:old.unitPrice??''}));
 fields.push(field('หมายเหตุ','note',{value:old.note||''}));
 return modal('แก้ไข'+typeName(old.type),fields,async f=>{const q=f.quantity===''?undefined:Number(f.quantity);if(old.type!=='inspection'&&(!Number.isFinite(q)||q<=0))throw Error('กรุณากรอกปริมาณมากกว่า 0');const hive=hives.find(h=>h.id===f.hiveId);const updated={...old,...f,hiveCode:hive?.code||old.hiveCode,date:f.date||old.date};if(old.type==='inspection')updated.quantity='';else updated.quantity=q;if(old.type==='harvest'){if(f.unitPrice===''){delete updated.unitPrice;delete updated.estimatedValue}else{const price=Number(f.unitPrice);if(!Number.isFinite(price)||price<0)throw Error('ราคาต่อหน่วยไม่ถูกต้อง');updated.unitPrice=price;updated.estimatedValue=Math.round(q*price*100)/100}}try{await saveActivityRecord(updated)}catch(err){if(err.message==='DUPLICATE_ACTIVITY'){if(!confirm('การแก้ไขนี้จะทำให้ข้อมูลตรงกับกิจกรรมอื่นที่มีอยู่ ต้องการบันทึกเป็นอีกรายการหรือไม่?'))throw Error('ยกเลิกการแก้ไขที่อาจซ้ำแล้ว');await put({...updated,duplicateConfirmedAt:new Date().toISOString()})}else throw err}});
}
function typeName(t){return ({inspection:'ตรวจรัง',feeding:'ให้อาหาร',harvest:'เก็บเกี่ยว'})[t]||t}
function showTab(tab){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));$('#view-'+tab).classList.remove('hidden');document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));window.scrollTo(0,0)}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
$('#ownerForm').onsubmit=async e=>{e.preventDefault();let f=new FormData(e.target);await put({id:id(),type:'owner',name:f.get('name').trim(),org:f.get('org'),phone:f.get('phone')});await refresh();toast('บันทึกโปรไฟล์แล้ว')};
function field(label,name,opts={}){let req=opts.required?'required':'';let help=opts.help?`<small class="field-help">${esc(opts.help)}</small>`:'';let placeholder=opts.placeholder?`placeholder="${esc(opts.placeholder)}"`:'';if(opts.select)return `<label>${label}<select name="${name}" ${req}>${opts.select.map((o,i)=>`<option value="${esc(o.value)}" ${String(o.value)===String(opts.value??opts.select[0]?.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select>${help}</label>`;return `<label>${label}<input name="${name}" type="${opts.type||'text'}" ${req} ${placeholder} ${opts.step?`step="${opts.step}"`:''} ${opts.min!==undefined?`min="${opts.min}"`:''} ${opts.max!==undefined?`max="${opts.max}"`:''} ${opts.value!==undefined?`value="${esc(opts.value)}"`:''} ${opts.inputmode?`inputmode="${opts.inputmode}"`:''}>${help}</label>`}
async function modal(title,fields,save){$('#dlgTitle').textContent=title;$('#dlgFields').innerHTML=fields.join('');let d=$('#dlg');d.showModal();const dateInput=$('#dlgFields [name="date"]');if(dateInput&&!dateInput.value)dateInput.value=today();const qty=$('#dlgFields [name="quantity"]'),price=$('#dlgFields [name="unitPrice"]'),estimate=$('#estimatedValue');const updateEstimate=()=>{if(qty&&price&&estimate){let q=Number(qty.value),p=Number(price.value);estimate.textContent=qty.value&&price.value&&q>0&&p>=0?'มูลค่าประมาณ '+baht(q*p):'กรอกปริมาณและราคาต่อหน่วยเพื่อคำนวณ';}};qty?.addEventListener('input',updateEstimate);price?.addEventListener('input',updateEstimate);$('#dlgForm').onsubmit=async e=>{e.preventDefault();const btn=$('#saveDlg');if(btn.disabled)return;btn.disabled=true;btn.textContent='กำลังบันทึก…';let f=Object.fromEntries(new FormData(e.target));try{await save(f);d.close();await refresh();toast('บันทึกข้อมูลแล้ว')}catch(err){toast(err.message||'บันทึกไม่สำเร็จ')}finally{btn.disabled=false;btn.textContent='บันทึก'}}}
function options(arr,label){return arr.map(x=>({value:x.id,label:label(x)}))}
async function action(a){if(a==='farm')return modal('เพิ่มฟาร์ม',[field('ชื่อฟาร์ม','name',{required:true}),field('จังหวัด','province'),field('อำเภอ','district'),field('หมายเหตุ','notes')],async f=>put({id:id(),type:'farm',...f,createdAt:new Date().toISOString()}));if(a==='apiary'){if(!farms.length)return toast('กรุณาเพิ่มฟาร์มก่อน');return modal('เพิ่มจุดเลี้ยง',[field('ฟาร์ม','farmId',{select:options(farms,x=>x.name)}),field('ชื่อจุดเลี้ยง','name',{required:true}),field('รายละเอียดตำแหน่ง','location')],async f=>put({id:id(),type:'apiary',...f}))}if(a==='hive'){
 if(!apiaries.length)return toast('กรุณาเพิ่มจุดเลี้ยงก่อน');
 const apiOpts=options(apiaries,x=>x.name),initialApiary=apiaries[0].id;
 await modal('เพิ่มรังผึ้ง',[field('จุดเลี้ยง','apiaryId',{select:apiOpts}),field('รหัสรัง (สร้างอัตโนมัติ)','code',{value:nextHiveCode(initialApiary),help:'รหัสรังใช้รหัสจุดเลี้ยงนำหน้า เช่น จุดเลี้ยง B01 จะได้รัง B011, B012, B013 ตามลำดับ สามารถแก้ไขได้แต่ห้ามซ้ำในจุดเลี้ยงเดียวกัน'}),field('ชนิดผึ้ง','species',{select:['ผึ้งพันธุ์บัคฟาสต์','ผึ้งพันธุ์ยุโรป','ผึ้งพันธุ์เอเชีย','ชันโรง'].map(x=>({value:x,label:x}))}),field('วันที่เริ่มเลี้ยง','startDate',{type:'date',value:today()})],async f=>{
  f.code=String(f.code||'').trim();
  await saveHiveRecord({id:id(),type:'hive',...f,status:'active',createdAt:new Date().toISOString()});
 });
 const apiInput=$('#dlgFields [name="apiaryId"]'),codeInput=$('#dlgFields [name="code"]');
 if(apiInput&&codeInput){
  // Always derive the suggested code from the currently selected apiary; do not reuse a prior modal value.
  apiInput.value=initialApiary;
  codeInput.value=nextHiveCode(apiInput.value);
  codeInput.setAttribute('autocomplete','off');
  codeInput.setAttribute('autocapitalize','characters');
  apiInput.addEventListener('change',()=>{codeInput.value=nextHiveCode(apiInput.value);});
 }
 return;
}if(['inspection','feeding','harvest'].includes(a)){hives=hives.filter(h=>h.status!=='deleted');if(!hives.length)return toast('กรุณาเพิ่มรังก่อน');let fields=[field('รังผึ้ง','hiveId',{required:true,select:options(sortedHives(hives),x=>{let ap=apiaries.find(y=>y.id===x.apiaryId),farm=farms.find(y=>y.id===ap?.farmId);return `${x.code} · ${ap?.name||'ไม่ทราบจุดเลี้ยง'} · ${farm?.name||'ไม่ทราบฟาร์ม'}`}),help:'เลือกรหัสรังและตรวจสอบชื่อจุดเลี้ยงให้ถูกต้อง'}),field('วันที่','date',{type:'date',required:true,help:'ระบบใส่วันที่ปัจจุบันให้อัตโนมัติ สามารถเปลี่ยนย้อนหลังได้'})];if(a==='inspection')fields.push(field('ความแข็งแรงของรัง','detail',{required:true,placeholder:'เช่น แข็งแรง / ปานกลาง / อ่อนแอ'}));if(a==='feeding')fields.push(field('ชนิดอาหาร','detail',{required:true,placeholder:'เช่น น้ำเชื่อม, อาหารโปรตีน, อาหารเสริมผึ้ง'}),field('ปริมาณ','quantity',{type:'number',step:'0.01',min:0.01,required:true,placeholder:'เช่น 500'}),field('หน่วย','unit',{required:true,select:[{value:'กรัม',label:'กรัม'},{value:'กิโลกรัม',label:'กิโลกรัม'},{value:'มิลลิลิตร',label:'มิลลิลิตร'},{value:'ลิตร',label:'ลิตร'}]}));if(a==='harvest')fields.push(field('ผลิตภัณฑ์','detail',{required:true,placeholder:'เช่น น้ำผึ้ง, ไขผึ้ง, เกสรผึ้ง'}),field('ปริมาณ','quantity',{type:'number',step:'0.01',min:0.01,required:true}),field('หน่วย','unit',{required:true,select:[{value:'กิโลกรัม',label:'กิโลกรัม'},{value:'กรัม',label:'กรัม'},{value:'ลิตร',label:'ลิตร'},{value:'มิลลิลิตร',label:'มิลลิลิตร'},{value:'ชิ้น',label:'ชิ้น'}]}),field('ราคาต่อหน่วย (บาท) — ไม่บังคับ','unitPrice',{type:'number',step:'0.01',min:0}));fields.push(field('หมายเหตุ','note',{placeholder:'รายละเอียดเพิ่มเติม (ถ้ามี)'}));return modal('บันทึก'+typeName(a),fields,async f=>{let q=a==='inspection'?undefined:Number(f.quantity);if(a!=='inspection'&&(!Number.isFinite(q)||q<=0))throw Error('กรุณากรอกปริมาณเป็นตัวเลขที่มากกว่า 0');let extra={};if(a==='harvest'&&f.unitPrice!==''){let price=Number(f.unitPrice);if(!Number.isFinite(price)||price<0)throw Error('ราคาต่อหน่วยต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');extra.unitPrice=price;extra.estimatedValue=Math.round(q*price*100)/100;}const record={id:id(),type:a,...f,...extra,date:f.date||today(),hiveCode:hives.find(h=>h.id===f.hiveId)?.code,quantity:q,createdAt:new Date().toISOString()};try{await saveActivityRecord(record)}catch(err){if(err.message==='DUPLICATE_ACTIVITY'){if(!confirm('พบกิจกรรมที่มีรายละเอียดเหมือนรายการเดิมทุกช่อง หากเป็นการกดซ้ำโดยไม่ตั้งใจให้เลือก Cancel หากเป็นกิจกรรมจริงคนละรอบจึงเลือก OK เพื่อบันทึกเพิ่ม'))throw Error('ยกเลิกการบันทึกรายการซ้ำแล้ว');await put({...record,duplicateConfirmedAt:new Date().toISOString()})}else throw err}})}if(a==='income'||a==='expense'){if(!farms.length)return toast('กรุณาเพิ่มฟาร์มก่อน');return modal(a==='income'?'บันทึกรายรับ':'บันทึกรายจ่าย',[field('ฟาร์ม','farmId',{select:options(farms,x=>x.name)}),field('วันที่','date',{type:'date'}),field('รายละเอียด','description',{required:true}),field('จำนวนเงิน (บาท)','amount',{type:'number',step:'0.01',min:0,required:true})],async f=>{let n=Number(f.amount);if(!Number.isFinite(n)||n<0)throw Error('จำนวนเงินไม่ถูกต้อง');await put({id:id(),type:a,...f,date:f.date||today(),amount:Math.round(n*100)/100})})}if(a==='edit-owner')return modal('แก้ไขโปรไฟล์',[field('ชื่อเจ้าของฟาร์ม','name',{required:true}),field('หน่วยงาน','org'),field('โทรศัพท์','phone')],async f=>put({...owner,...f}))}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
$('#activityList').addEventListener('click',e=>{const edit=e.target.closest('[data-activity-edit]'),remove=e.target.closest('[data-activity-delete]');if(edit)editActivity(edit.dataset.activityEdit);if(remove)deleteActivity(remove.dataset.activityDelete)});
$('#hivesList').addEventListener('click',e=>{const edit=e.target.closest('[data-hive-edit]'),remove=e.target.closest('[data-hive-delete]');if(edit)editHive(edit.dataset.hiveEdit);if(remove)deleteHive(remove.dataset.hiveDelete)});
$('#closeDlg').onclick=$('#cancelDlg').onclick=()=>$('#dlg').close();
$('#exportBtn').onclick=async()=>{let data={app:'BeeSmart Farmer Web',version:1,exportedAt:new Date().toISOString(),records:await all()};let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='BeeSmart-Backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('ส่งออกข้อมูลสำรองแล้ว')};
$('#importFile').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{let data=JSON.parse(await file.text());if(data.app!=='BeeSmart Farmer Web'||data.version!==1||!Array.isArray(data.records))throw Error('รูปแบบไฟล์ไม่ถูกต้อง');if(!data.records.every(r=>r&&typeof r.id==='string'&&typeof r.type==='string'))throw Error('ข้อมูลในไฟล์ไม่ครบหรือไม่ถูกต้อง');if(!confirm('นำเข้าข้อมูล '+data.records.length+' รายการ? ข้อมูลที่มี ID ซ้ำจะถูกเขียนทับ'))return;await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);for(const r of data.records)store.put(r);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('นำเข้าข้อมูลไม่สำเร็จ'))});await refresh();toast('นำเข้าข้อมูลแล้ว')}catch(err){alert(err.message||'อ่านไฟล์ไม่สำเร็จ')}e.target.value=''};
$('#clearBtn').onclick=async()=>{if(confirm('ต้องการล้างข้อมูล BeeSmart ทั้งหมดจากเบราว์เซอร์นี้หรือไม่? แนะนำให้ส่งออกข้อมูลสำรองก่อน')){await new Promise((res,rej)=>{let r=db.transaction(STORE,'readwrite').objectStore(STORE).clear();r.onsuccess=res;r.onerror=()=>rej(r.error)});await refresh();toast('ล้างข้อมูลแล้ว')}};
(async()=>{try{db=await openDB();await refresh();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});}catch(e){alert('เปิดฐานข้อมูลในเครื่องไม่สำเร็จ: '+e.message)}})();
