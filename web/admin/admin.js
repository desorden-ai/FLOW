const API_URL='/api/admin';
const STORAGE_KEY='desorden_cita_admin_key';
const $=(s)=>document.querySelector(s);
const loginEl=$('#login'),appEl=$('#app'),formEl=$('#loginForm'),passwordEl=$('#password'),loginErrorEl=$('#loginError'),statusEl=$('#status');
const blocksEl=$('#blocks'),appointmentsEl=$('#appointments');
let adminKey=sessionStorage.getItem(STORAGE_KEY)||'';

function setStatus(text,error=false){statusEl.hidden=!text;statusEl.textContent=text||'';statusEl.dataset.error=error?'1':'0'}
function fmtDate(v){if(!v)return'';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
async function callApi(action,payload={}){const r=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${adminKey}`},body:JSON.stringify({action,...payload}),cache:'no-store'});let data={};try{data=await r.json()}catch{}if(r.status===401)throw new Error('UNAUTHORIZED');if(!r.ok||!data.ok)throw new Error(data.error||`HTTP_${r.status}`);return data}
function showLogin(message=''){appEl.hidden=true;loginEl.hidden=false;loginErrorEl.hidden=!message;loginErrorEl.textContent=message}
function showApp(){loginEl.hidden=true;appEl.hidden=false}

function renderSummary(s){$('#kpiVisits').textContent=s.visits;$('#kpiConfirmed').textContent=s.confirmed;$('#kpiPending').textContent=s.pending;$('#kpiFree').textContent=s.freeSlots;$('#updated').textContent=`Actualizado ${new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit'}).format(new Date())}`}

function blockCard(block){const article=document.createElement('article');article.className='block';
 const head=document.createElement('div');head.className='block-head';
 const left=document.createElement('div');const h=document.createElement('h3');h.textContent=block.label||block.block;const meta=document.createElement('div');meta.className='block-meta';meta.textContent=`${block.visits} visita${block.visits===1?'':'s'} · ${block.pending} pendiente${block.pending===1?'':'s'} · ${block.free} libre${block.free===1?'':'s'} · ${block.reserved} reservada${block.reserved===1?'':'s'}`;left.append(h,meta);
 const badge=document.createElement('span');badge.className='badge'+(block.date1&&block.date2?'':' off');badge.textContent=block.date1&&block.date2?'ACTIVO':'SIN CONFIGURAR';head.append(left,badge);
 const form=document.createElement('form');form.className='availability-form';form.dataset.block=block.block;
 const dateField=(label,value)=>{const l=document.createElement('label');l.className='field';const s=document.createElement('span');s.textContent=label;const i=document.createElement('input');i.type='date';i.value=value||'';l.append(s,i);return l};
 form.append(dateField('Fecha 1',block.date1),dateField('Fecha 2',block.date2));
 const times=document.createElement('div');times.className='times';(block.times||['09:00','10:30','12:00','15:30']).forEach((time,index)=>{const l=document.createElement('label');l.className='field';const s=document.createElement('span');s.textContent=`Hora ${index+1}`;const i=document.createElement('input');i.type='time';i.step='300';i.value=time||'';l.append(s,i);times.append(l)});form.append(times);
 const save=document.createElement('button');save.className='save';save.type='submit';save.textContent='Guardar disponibilidad';form.append(save);
 form.addEventListener('submit',async e=>{e.preventDefault();const inputs=[...form.querySelectorAll('input')];const [date1,date2,...timeInputs]=inputs;save.disabled=true;save.textContent='Guardando…';setStatus('');try{await callApi('updateAvailability',{block:block.block,date1:date1.value,date2:date2.value,times:timeInputs.map(i=>i.value)});setStatus(`Disponibilidad de ${block.label||block.block} actualizada.`);await loadDashboard()}catch(err){setStatus(err.message==='UNAUTHORIZED'?'La sesión ha caducado.':`No se pudo guardar: ${err.message}`,true);if(err.message==='UNAUTHORIZED'){sessionStorage.removeItem(STORAGE_KEY);adminKey='';showLogin('Vuelve a introducir la clave.')}}finally{save.disabled=false;save.textContent='Guardar disponibilidad'}});
 article.append(head,form);return article}

function renderBlocks(blocks){blocksEl.replaceChildren();blocks.forEach(b=>blocksEl.append(blockCard(b)))}
function renderAppointments(items){appointmentsEl.replaceChildren();if(!items.length){const e=document.createElement('div');e.className='empty';e.textContent='Todavía no hay citas confirmadas.';appointmentsEl.append(e);return}items.forEach(a=>{const row=document.createElement('article');row.className='appointment';const vals=[['date',fmtDate(a.date)],['time',a.time],['client',a.name],['city',a.city],['address',a.address],['sa',a.sas.join(' · ')]];vals.forEach(([cls,text])=>{const el=cls==='client'?document.createElement('strong'):document.createElement('span');el.className=cls;el.textContent=text||'—';row.append(el)});appointmentsEl.append(row)})}
async function loadDashboard(){setStatus('');const data=await callApi('snapshot');showApp();renderSummary(data.summary);renderBlocks(data.blocks);renderAppointments(data.appointments)}

formEl.addEventListener('submit',async e=>{e.preventDefault();adminKey=passwordEl.value.trim();loginErrorEl.hidden=true;try{await loadDashboard();sessionStorage.setItem(STORAGE_KEY,adminKey);passwordEl.value=''}catch(err){adminKey='';sessionStorage.removeItem(STORAGE_KEY);showLogin(err.message==='UNAUTHORIZED'?'Clave incorrecta.':'No se pudo cargar el panel.')}});
$('#refresh').addEventListener('click',()=>loadDashboard().catch(err=>setStatus(`No se pudo actualizar: ${err.message}`,true)));
$('#logout').addEventListener('click',()=>{adminKey='';sessionStorage.removeItem(STORAGE_KEY);showLogin()});

if(adminKey){loadDashboard().catch(()=>{adminKey='';sessionStorage.removeItem(STORAGE_KEY);showLogin('Vuelve a introducir la clave.')})}else{showLogin()}
