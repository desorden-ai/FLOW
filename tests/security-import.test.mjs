import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker, {handleApiPost,handleAdminApi} from '../src/worker.js';
const client={name:'Marta Prueba',phone:'600001111',address:'Calle 1',city:'Ciudad',block:'BLK-TEST',sas:[]};
const env={APPS_SCRIPT_URL:'https://script.example/exec'};
const req=(body,auth=true)=>new Request('https://cita.example/api/admin',{method:'POST',headers:auth?{Authorization:'Bearer fixture-admin-password'}:{},body:JSON.stringify(body)});

test('import transport rejects unauthenticated, malformed, oversized and invalid field payloads',async()=>{
  const saved=globalThis.fetch;globalThis.fetch=()=>{throw new Error('must not call upstream');};
  try {
    assert.equal((await handleAdminApi(req({action:'importClients',clients:[client]},false),env)).status,401);
    for(const clients of [null,{},[],Array(101).fill(client),[null],[{...client,phone:'x'.repeat(41)}],[{...client,sas:['x'.repeat(41)]}],[{...client,name:{}}]]) {
      assert.equal((await handleAdminApi(req({action:'importClients',clients}),env)).status,400);
    }
    assert.equal((await handleAdminApi(req({action:'snapshot',extra:'x'.repeat(262145)}),env)).status,400);
  } finally {globalThis.fetch=saved;}
});
test('100-client import is one sanitized upstream operation and counts contain no private fields',async()=>{
  const saved=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,init)=>{
    calls++; assert.equal(url,env.APPS_SCRIPT_URL); assert.equal(init.method,'POST');
    const body=JSON.parse(init.body);assert.equal(body.mode,'importClients');assert.equal(body.clients.length,100);
    assert.deepEqual(body.clients[0],client);
    return Response.json({ok:true,blocks:[],appointments:[],import:{received:100,created:98,duplicates:1,invalid:1,token:'private'},secret:'private'});
  };
  try{
    const response=await handleAdminApi(req({action:'importClients',clients:Array(100).fill({...client,token:'ignored'})}),env);
    const data=await response.json();assert.equal(response.status,200);assert.equal(calls,1);
    assert.deepEqual(data.import,{received:100,created:98,duplicates:1,invalid:1});assert.equal(JSON.stringify(data).includes('private'),false);
  }finally{globalThis.fetch=saved;}
});
test('regeneration/update/archive/password keep authenticated existing transport with only allowed fields',async()=>{
  const saved=globalThis.fetch;let body;
  globalThis.fetch=async(_url,init)=>{body=JSON.parse(init.body);return Response.json({ok:true,blocks:[],appointments:[]});};
  try{
    for(const action of ['regenerateBookingToken','updateClient','archiveClient','changePassword']){
      const response=await handleAdminApi(req({action,clientId:'CLI-fixture1',client,newKey:'new-fixture-password',token:'attacker',block:'attacker'}),env);
      assert.equal(response.status,200);assert.equal(body.mode,action);assert.equal(body.token,undefined);assert.equal(body.block,undefined);
      if(action==='regenerateBookingToken') assert.deepEqual(Object.keys(body).sort(),['action','adminKey','clientId','mode']);
    }
  }finally{globalThis.fetch=saved;}
});
test('public errors and thrown upstream exceptions cannot reflect credentials or PII',async()=>{
  const saved=globalThis.fetch;
  const request=()=>new Request('https://cita.example/api',{method:'POST',body:JSON.stringify({action:'availability',token:'a'.repeat(64)})});
  try{
    globalThis.fetch=async()=>Response.json({ok:false,error:'private full name token'});
    assert.deepEqual(await(await handleApiPost(request(),env)).json(),{ok:false,error:'UPSTREAM_ERROR'});
    globalThis.fetch=async()=>{throw new Error('private full name token');};
    assert.deepEqual(await(await handleApiPost(request(),env)).json(),{ok:false,error:'PROXY_ERROR'});
    for(const token of ['x','a'.repeat(32),'g'.repeat(64),'a'.repeat(65)]){
      assert.equal((await handleApiPost(new Request('https://cita.example/api',{method:'POST',body:JSON.stringify({action:'availability',token})}),env)).status,400);
    }
  }finally{globalThis.fetch=saved;}
});
test('security headers wrap public/admin HTML, CSS, JS, API errors and contact redirects',async()=>{
  const received=[];
  const bindings={ASSETS:{fetch:async request=>{received.push(new URL(request.url));return new Response('asset');}},WHATSAPP_TARGET:'34600111222'};
  for(const path of ['/','/admin/','/admin','/styles.css','/app.js','/api','/contact?lang=ca']){
    const response=await worker.fetch(new Request('https://cita.example'+path),bindings);
    for(const [key,value] of [['Referrer-Policy','no-referrer'],['X-Content-Type-Options','nosniff']]) assert.equal(response.headers.get(key),value);
    assert.match(response.headers.get('Cache-Control'),/no-store/);
    assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
    assert.match(response.headers.get('Permissions-Policy'),/camera=\(\)/);
    assert.match(response.headers.get('Strict-Transport-Security'),/max-age=31536000/);
  }
  assert.deepEqual(received.map(url=>url.pathname),['/','/admin/index.html','/admin/index.html','/styles.css','/app.js']);
  await worker.fetch(new Request('https://cita.example/?c=legacy'),bindings);
  assert.equal(received.at(-1).search,'');
  for(const lang of ['ca','es']){
    const response=await worker.fetch(new Request('https://cita.example/contact?lang='+lang+'&token=must-ignore'),bindings);
    const url=new URL(response.headers.get('Location'));
    const message=url.searchParams.get('text');
    assert.match(message,lang==='ca'?/No puc en cap/:/No puedo en ninguna/);
    assert.doesNotMatch(message,/must-ignore|clientId|cita.desorden|Calle/);
  }
});
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../web/admin/import.js',import.meta.url),'utf8'),context);
const parser=context.CitaImport;
const blocks=[{block:'BLK-TEST',clients:[client]}];
test('TSV aliases, canonical duplicates, unknown columns and invalid destination preview',()=>{
  const text=' Nombre Cliente \tMÓVIL\tCALLE\tLOCALIDAD\tORDEN\tGRUPO\tDesconocida\nMarta Prueba\t600 001 111\tCalle 1\tCiudad\tSA-1\tBLK-TEST\tx\nJoan Nou\t\tCalle 2\tCiudad\tSA-2;SA-2,SA-3\t\tx\nJoan  Nou\t\tCalle 2\tCiudad\t\tBLK-TEST\tx\nSin dirección\t\t\tCiudad\t\tBLK-TEST\tx\nBloque malo\t\tCalle 2\tCiudad\t\tNO-EXISTE\tx';
  const rows=parser.preview(text,blocks,'BLK-TEST');
  assert.deepEqual(Array.from(rows,row=>row.status),['DUPLICATE','VALID','DUPLICATE','INVALID','INVALID']);
  assert.deepEqual(Array.from(rows[1].client.sas),['SA-2','SA-3']);
  assert.equal(rows[1].client.phone,'');assert.equal(rows[1].client.Desconocida,undefined);
});
test('CSV handles BOM, quoted commas/newlines, escaped quotes and semicolon exports',()=>{
  const text='\uFEFFCLIENTE,DIRECCION,POBLACION,SA\r\n"Joan, Pau","Calle ""A"", 1",Ciudad,"SA-1\nSA-2"';
  const rows=parser.preview(text,blocks,'BLK-TEST');assert.equal(rows[0].status,'VALID');
  assert.equal(rows[0].client.name,'Joan, Pau');assert.equal(rows[0].client.address,'Calle "A", 1');assert.equal(rows[0].client.sas.length,2);
  assert.equal(parser.preview('CLIENTE;CALLE;MUNICIPIO\nJoan;Calle 2;Ciudad',blocks,'BLK-TEST')[0].status,'VALID');
  assert.throws(()=>parser.parse('CLIENTE,CALLE\n"unterminated'),/comillas/);
  assert.throws(()=>parser.preview('CLIENTE,NOMBRE\nx,y',blocks,'BLK-TEST'),/repetidas/);
  assert.throws(()=>parser.preview('CLIENTE,CALLE,POBLACION\n'+Array(101).fill('a,b,c').join('\n'),blocks,'BLK-TEST'),/100/);
});
