import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

export const KEY = 'fixture-admin-key-only';
export const TOKEN = 'a'.repeat(64);
export function scriptHarness() {
  const events = [];
  let locked = false;
  let onLock;
  class Sheet {
    constructor(name, rows) { this.name=name; this.rows=rows; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return this.rows[0].length; }
    setFrozenRows() {}
    getDataRange() { return this.getRange(1,1,this.rows.length,this.getLastColumn()); }
    getRange(r,c,n=1,m=1) {
      const sheet=this;
      const range = {
        getDisplayValues() {
          events.push({type:'read', sheet:sheet.name, locked});
          return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>String(sheet.rows[r-1+i]?.[c-1+j] ?? '').replace(/^'(?==)/,'')));
        },
        getValues() { return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>sheet.rows[r-1+i]?.[c-1+j] ?? '')); },
        setValues(rows) {
          assert.equal(locked,true,'writes must hold the booking lock');
          events.push({type:'write',sheet:sheet.name,r,c,n,m});
          rows.forEach((row,i)=>row.forEach((value,j)=>{ sheet.rows[r-1+i] ||= []; sheet.rows[r-1+i][c-1+j]=value; }));
          return proxy;
        },
        setValue(value) { return this.setValues([[value]]); },
        clearContent() { return this.setValues(Array.from({length:n},()=>Array(m).fill(''))); },
      };
      const proxy = new Proxy(range,{get(target,key){ return key in target ? target[key] : ()=>proxy; }});
      return proxy;
    }
  }
  const properties = new Map([['ADMIN_PASSWORD_SHA256',createHash('sha256').update(KEY).digest('hex')]]);
  const sheets={};
  const spreadsheet={getSheetByName:name=>sheets[name]};
  const context=vm.createContext({
    console:{error(){throw new Error('Unexpected log');}},
    Utilities:{getUuid:randomUUID, DigestAlgorithm:{SHA_256:'sha256'}, Charset:{UTF_8:'utf8'}, computeDigest:(_alg,value)=>[...createHash('sha256').update(value).digest()]},
    PropertiesService:{getScriptProperties:()=>({getProperty:key=>properties.get(key)||null,setProperty:(key,value)=>properties.set(key,value)})},
    SpreadsheetApp:{getActiveSpreadsheet:()=>spreadsheet,flush(){}},
    LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false);locked=true;events.push({type:'lock'});if(onLock){const fn=onLock;onLock=null;fn();}},hasLock:()=>locked,releaseLock(){locked=false;events.push({type:'unlock'});}})},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
  });
  for(const file of ['Code.gs','Admin.gs']) vm.runInContext(fs.readFileSync(new URL('../../apps-script/'+file,import.meta.url),'utf8'),context);
  const headers=vm.runInContext('ORIGINAL_CLIENT_HEADERS.concat(BOOKING_HEADERS)',context);
  const slotHeaders=vm.runInContext('SLOT_HEADERS.slice()',context);
  const row=(data)=>Array.from(headers,key=>data[key]??'');
  const base={CLIENTE:'Marta Apellido',TELEFONO:'600000001',DIRECCION:'Calle Prueba 1',POBLACION:'Ciudad',CLIENTE_ID:'CLI-fixture1',BLOQUE:'BLK-TEST',TOKEN,URL_CITA:'https://cita.desorden.cat/#c='+TOKEN,ESTADO_CITA:'PENDIENTE'};
  sheets.cita=new Sheet('cita',[Array.from(headers),row({...base,SA:'SA-1'}),row({...base,SA:'SA-2'})]);
  sheets.FRANJAS=new Sheet('FRANJAS',[Array.from(slotHeaders),['SLT-0001','BLK-TEST','2026-09-10','9:00','LIBRE','',''],['SLT-0002','BLK-OTHER','2026-09-10','10:00','LIBRE','','']]);
  let syncs=0;
  const sync=context.syncClientMetadata;
  context.syncClientMetadata=()=>{syncs++;return sync();};
  return {context,sheets,headers:Object.fromEntries(Array.from(headers,(name,i)=>[name,i])),events,row,base,get syncs(){return syncs;},onLock(fn){onLock=fn;},get locked(){return locked;}};
}
