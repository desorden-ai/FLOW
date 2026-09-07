import test from 'node:test';
import assert from 'node:assert/strict';
import {scriptHarness,KEY,TOKEN} from './helpers/apps-script.mjs';
const input={name:'Joan Nou',phone:'600000002',address:'Calle 2',city:'Ciudad',block:'BLK-TEST',sas:['SA-3','SA-4']};
const plain=value=>JSON.parse(JSON.stringify(value));
// Normalize cross-realm Date objects to ms timestamps for stable deepStrictEqual.
// VM-created Dates share the same timestamp but fail === / deepStrictEqual across realms.
// structuredClone may also serialize them as ISO strings; handle both forms.
const toTimestamp=value=>{if(value&&typeof value==='object'&&typeof value.getTime==='function')return value.getTime();if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)){const t=Date.parse(value);if(!Number.isNaN(t))return t;}return value;};
const normalizeDates=value=>Array.isArray(value)?value.map(normalizeDates):toTimestamp(value);
const normalizeRows=rows=>rows.map(row=>Array.isArray(row)?row.map(normalizeDates):row);

test('Apps Script public POST is minimal; GET disabled; malformed tokens never read Sheets',()=>{
  const h=scriptHarness(),c=h.context;
  assert.equal(c.getClientByToken_('bad'),null); assert.equal(h.events.length,0);
  assert.equal(c.book_('bad','SLT-0001').error,'INVALID_TOKEN'); assert.equal(h.events.length,0);
  assert.equal(JSON.parse(c.doGet({parameter:{action:'availability',token:TOKEN}}).text).error,'METHOD_NOT_ALLOWED');
  const data=JSON.parse(c.doPost({postData:{contents:JSON.stringify({action:'availability',token:TOKEN})}}).text);
  assert.deepEqual(data,{ok:true,client:{firstName:'Marta'},booking:null,slots:[{slotId:'SLT-0001',date:'2026-09-10',time:'9:00'}]});
});
test('booking enforces token-derived block and preserves the confirmed visit across all SA rows',()=>{
  const h=scriptHarness(),c=h.context;
  assert.equal(c.book_(TOKEN,'SLT-0002').error,'INVALID_SLOT');
  assert.equal(c.book_(TOKEN,'SLT-0001').ok,true);
  const before=structuredClone(h.sheets.cita.rows);
  assert.equal(c.book_(TOKEN,'SLT-0001').error,'ALREADY_BOOKED');
  assert.deepEqual(normalizeRows(h.sheets.cita.rows),normalizeRows(before));
  assert.ok(before.slice(1).every(row=>row[h.headers.ESTADO_CITA]==='CONFIRMADO'));
  assert.equal(h.locked,false);
});
test('taken slots cannot be overwritten and shared tokens cannot resolve two client IDs',()=>{
  const h=scriptHarness(); h.sheets.FRANJAS.rows[1][4]='CONFIRMADO';
  assert.equal(h.context.book_(TOKEN,'SLT-0001').error,'SLOT_TAKEN');
  h.sheets.cita.rows[2][h.headers.CLIENTE_ID]='CLI-other';
  assert.equal(h.context.getClientByToken_(TOKEN),null);
});
test('batch revalidates active and intra-batch duplicates under one lock, writes one batch and synchronizes once',()=>{
  const h=scriptHarness();
  const existing={...input,name:h.base.CLIENTE,phone:h.base.TELEFONO,address:h.base.DIRECCION};
  const result=h.context.adminImportClients_({adminKey:KEY,clients:[input,input,existing,{...input,name:''},{...input,block:'BLK-MISSING'}]});
  assert.deepEqual(plain(result.import),{received:5,created:1,duplicates:2,invalid:2});
  assert.equal(h.syncs,1);
  assert.equal(h.events.filter(e=>e.type==='lock').length,1);
  assert.equal(h.events.find(e=>e.type==='read').locked,true);
  assert.equal(h.events.filter(e=>e.type==='write'&&e.sheet==='cita'&&e.r>=4).length,1);
  assert.equal(h.sheets.cita.rows.length,5);
  const rows=h.sheets.cita.rows.slice(3);
  assert.equal(rows[0][h.headers.TOKEN],rows[1][h.headers.TOKEN]);
  assert.match(rows[0][h.headers.URL_CITA],/^https:\/\/cita.desorden.cat\/#c=[a-f0-9]{64}$/);
});
test('batch maximum, auth and invalid field lengths are enforced directly by Apps Script',()=>{
  const h=scriptHarness();
  assert.throws(()=>h.context.adminImportClients_({adminKey:'wrong',clients:[input]}),/UNAUTHORIZED/);
  assert.equal(h.context.adminImportClients_({adminKey:KEY,clients:Array(101).fill(input)}).error,'INVALID_BATCH');
  const result=h.context.adminImportClients_({adminKey:KEY,clients:[{...input,phone:'x'.repeat(41)},{...input,sas:['x'.repeat(41)]}]});
  assert.equal(result.import.invalid,2); assert.equal(result.import.created,0); assert.equal(h.syncs,0);
  const hundred=scriptHarness();
  const accepted=hundred.context.adminImportClients_({adminKey:KEY,clients:Array.from({length:100},(_,i)=>({...input,name:'Cliente '+i,sas:[]}))});
  assert.equal(accepted.import.created,100); assert.equal(hundred.syncs,1);
});
test('create/update/archive preserve existing SAs and archived history stays separate from reimport',()=>{
  const h=scriptHarness(),c=h.context;
  assert.equal(c.adminCreateClient_({adminKey:KEY,client:{...input,sas:[]}}).ok,true);
  assert.equal(h.sheets.cita.rows.length,4);
  const id=h.sheets.cita.rows[3][h.headers.CLIENTE_ID];
  assert.equal(c.adminUpdateClient_({adminKey:KEY,clientId:id,client:{...input,name:'Joan Editat',sas:['DO-NOT-USE']}}).ok,true);
  assert.equal(h.sheets.cita.rows[3][h.headers.SA],'');
  assert.equal(c.adminArchiveClient_({adminKey:KEY,clientId:id}).ok,true);
  const archived=structuredClone(h.sheets.cita.rows[3]);
  const oldToken=archived[h.headers.TOKEN];
  assert.equal(c.getClientByToken_(oldToken),null);
  assert.equal(c.adminCreateClient_({adminKey:KEY,client:{...input,name:'Joan Editat',sas:[]}}).ok,true);
  assert.deepEqual(h.sheets.cita.rows[3],archived);
  assert.notEqual(h.sheets.cita.rows[4][h.headers.CLIENTE_ID],id);
  assert.notEqual(h.sheets.cita.rows[4][h.headers.TOKEN],oldToken);
});
test('archive and block move reread confirmation only after acquiring the lock',()=>{
  for(const action of ['adminArchiveClient_','adminUpdateClient_']){
    const h=scriptHarness();
    h.onLock(()=>{h.sheets.cita.rows[1][h.headers.ESTADO_CITA]='CONFIRMADO';});
    const result=h.context[action]({adminKey:KEY,clientId:'CLI-fixture1',client:{...input,block:'BLK-OTHER'}});
    assert.match(result.error,/CLIENT_CONFIRMED/);
    assert.equal(h.sheets.cita.rows[1][h.headers.BLOQUE],'BLK-TEST');
    assert.equal(h.events.some(e=>e.type==='write'),false);
  }
});
test('regeneration revokes old token on every SA row and preserves confirmed booking and history',()=>{
  const h=scriptHarness(),c=h.context;
  c.book_(TOKEN,'SLT-0001');
  const before=structuredClone(h.sheets.cita.rows);
  const slots=structuredClone(h.sheets.FRANJAS.rows);
  const result=c.adminRegenerateBookingToken_({adminKey:KEY,clientId:'CLI-fixture1'});
  assert.equal(result.ok,true); assert.equal(c.getClientByToken_(TOKEN),null);
  const next=h.sheets.cita.rows[1][h.headers.TOKEN];
  assert.notEqual(next,TOKEN); assert.equal(c.getClientByToken_(next).bookingStatus,'CONFIRMADO');
  h.sheets.cita.rows.slice(1).forEach((row,index)=>{
    assert.equal(row[h.headers.TOKEN],next);
    row.forEach((value,col)=>{if (![h.headers.TOKEN,h.headers.URL_CITA].includes(col)) assert.deepEqual(normalizeDates(value),normalizeDates(before[index+1][col]));});
  });
  assert.deepEqual(normalizeRows(h.sheets.FRANJAS.rows),normalizeRows(slots)); assert.equal(h.syncs,0);
});
test('availability edits preserve confirmed slots and appointments',()=>{
  const h=scriptHarness(),c=h.context; c.book_(TOKEN,'SLT-0001');
  const before=structuredClone(h.sheets.FRANJAS.rows[1]);
  c.adminUpdateAvailability_({adminKey:KEY,block:'BLK-TEST',days:[{date:'2026-09-12',times:['10:00']}]});
  assert.ok(h.sheets.FRANJAS.rows.some(row=>JSON.stringify(row)===JSON.stringify(before)));
  assert.equal(c.availability_(TOKEN).booking.status,'CONFIRMADO');
});
test('doPost routes private operations, rejects invalid auth and never reflects exceptions',()=>{
  const h=scriptHarness(),c=h.context;
  const post=payload=>JSON.parse(c.doPost({postData:{contents:JSON.stringify(payload)}}).text);
  assert.equal(post({action:'adminSnapshot',adminKey:'bad'}).error,'UNAUTHORIZED');
  assert.equal(post({action:'adminSnapshot',adminKey:KEY}).ok,true);
  assert.equal(post({action:'adminUpdateAvailability',mode:'changePassword',adminKey:KEY,newKey:'new-fixture-password'}).ok,true);
  assert.equal(post({action:'adminSnapshot',adminKey:KEY}).error,'UNAUTHORIZED');
  assert.equal(post({action:'adminSnapshot',adminKey:'new-fixture-password'}).ok,true);
  c.availability_=()=>{throw new Error('private token address');};
  assert.deepEqual(post({action:'availability',token:TOKEN}),{ok:false,error:'SERVER_ERROR'});
});
test('spreadsheet formula input is stored as literal text and technical failures are explicit',()=>{
  const h=scriptHarness();
  h.context.adminCreateClient_({adminKey:KEY,client:{...input,name:'=1+1',sas:[]}});
  assert.equal(h.sheets.cita.rows[3][h.headers.CLIENTE],"'=1+1");
  assert.equal(h.sheets.cita.getDataRange().getDisplayValues()[3][h.headers.CLIENTE],'=1+1');
  h.context.syncClientMetadata=()=>{throw new Error('technical failure');};
  assert.throws(()=>h.context.adminImportClients_({adminKey:KEY,clients:[input]}),/technical failure/);
  assert.equal(h.locked,false);
});
