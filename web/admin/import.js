// Pure parsing/preview helpers shared by the dialog and dependency-free tests.
globalThis.CitaImport = (() => {
  const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
  const aliases = {
    name:['CLIENTE','NOMBRE','NOMBRE CLIENTE'], phone:['TELEFONO','TELEF','TEL','MOVIL'],
    address:['DIRECCION','CALLE','DOMICILIO'], city:['POBLACION','MUNICIPIO','LOCALIDAD'],
    sas:['SA','SAS','AVISO','SERVICIO','ORDEN'], block:['BLOQUE','GRUPO'],
  };
  const headerKey = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  function parse(text) {
    if (typeof text !== 'string' || text.length > 262144) throw new Error('El archivo supera el límite de 256 KB.');
    text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const counts = { '\t':0, ',':0, ';':0 };
    let quoted = false;
    for (let i=0;i<text.length;i++) {
      if (text[i] === '"') { if (quoted && text[i+1] === '"') i++; else quoted = !quoted; }
      else if (!quoted) { if (text[i] === '\n') break; if (text[i] in counts) counts[text[i]]++; }
    }
    const delimiter = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
    const rows=[]; let row=[], cell='', inQuotes=false, closed=false;
    for (let i=0;i<text.length;i++) {
      const char=text[i];
      if (inQuotes) {
        if (char === '"') { if (text[i+1] === '"') { cell+='"'; i++; } else { inQuotes=false; closed=true; } }
        else cell+=char;
      } else if (char === delimiter || char === '\n') {
        row.push(cell); cell=''; closed=false;
        if (char === '\n') { rows.push(row); row=[]; }
      } else if (char === '"' && !cell && !closed) inQuotes=true;
      else { if (closed || char === '"') throw new Error('CSV no válido: revisa las comillas.'); cell+=char; }
    }
    if (inQuotes) throw new Error('CSV no válido: faltan comillas de cierre.');
    row.push(cell); rows.push(row);
    return rows.filter(row=>row.some(value=>clean(value)));
  }
  function identity(client) {
    return [clean(client.name).toLowerCase(), String(client.phone || '').replace(/\D/g,''), clean(client.address).toLowerCase(), clean(client.city).toLowerCase()].join('|');
  }
  function preview(text, blocks, fallback) {
    const table=parse(text);
    if (!table.length) return [];
    const fields=table[0].map(value=>Object.keys(aliases).find(key=>aliases[key].includes(headerKey(value))));
    const mapped=fields.filter(Boolean);
    if (new Set(mapped).size !== mapped.length) throw new Error('Hay columnas repetidas para el mismo campo.');
    if (table.length-1 > 100) throw new Error('Máximo 100 clientes por lote. Divide la tabla.');
    const known = new Set(blocks.map(block=>block.block));
    const seen = new Set(blocks.flatMap(block=>block.clients || []).filter(client=>client.status !== 'ARCHIVADO').map(identity));
    return table.slice(1).map((row,index)=>{
      const client={ name:'', phone:'', address:'', city:'', sas:[], block:'' };
      fields.forEach((key,i)=>{ if (key) client[key]= key === 'sas' ? [...new Set(String(row[i] || '').split(/[,;\n]/).map(clean).filter(Boolean))] : clean(row[i]); });
      client.block ||= fallback;
      let status='VALID', reason='';
      if (row.length !== fields.length || !client.name || !client.address || !client.city) { status='INVALID'; reason='Faltan datos obligatorios o columnas.'; }
      else if (!known.has(client.block)) { status='INVALID'; reason='Bloque desconocido.'; }
      else if (client.name.length>160 || client.phone.length>40 || client.address.length>220 || client.city.length>120 || client.sas.length>8 || client.sas.some(sa=>sa.length>40)) { status='INVALID'; reason='Se supera la longitud o el número de SAs permitido.'; }
      else if (seen.has(identity(client))) { status='DUPLICATE'; reason='La visita ya existe en el panel o en este lote.'; }
      if (status === 'VALID') seen.add(identity(client));
      return { row:index+2, client, status, reason };
    });
  }
  return { parse, identity, preview };
})();
