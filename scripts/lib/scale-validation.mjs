// Comprueba data/scales.json recalculando cada nota desde la afinación y el traste, sin fiarse de las etiquetas.
const tuning = { 1:64, 2:59, 3:55, 4:50, 5:45, 6:40 };
const expectedScales = {
  major:{ formula:[0,2,4,5,7,9,11], degrees:['1','2','3','4','5','6','7'], minor:false },
  'major-pentatonic':{ formula:[0,2,4,7,9], degrees:['1','2','3','5','6'], minor:false },
  'minor-pentatonic':{ formula:[0,3,5,7,10], degrees:['1','b3','4','5','b7'], minor:true },
  'natural-minor':{ formula:[0,2,3,5,7,8,10], degrees:['1','2','b3','4','5','b6','b7'], minor:true }
};
// Convención acordada: patrón 1 = forma E y se numera subiendo por el mástil.
export const CAGED_SEQUENCE = ['E','D','C','A','G'];
// Cuerdas con tónica en cada forma CAGED (las del acorde abierto que le da nombre).
const rootStrings = { E:[6,4,1], D:[4,2], C:[5,2], A:[5,3], G:[6,3,1] };
// Cada pentatónica debe estar contenida en la forma homónima de su escala de siete notas.
const parentScale = { 'major-pentatonic':'major', 'minor-pentatonic':'natural-minor' };
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const mod12 = n => ((n%12)+12)%12;
const cell = n => n.string+':'+n.fret;
const minFret = p => Math.min(...p.notes.map(n=>n.fret));

export function validatePattern(p,scale){
  const errors=[], fail=message=>errors.push((p.id||'patrón')+': '+message);
  const formula=scale.formula, size=formula.length;
  if(!Array.isArray(p.notes)||!p.notes.length){fail('sin notas');return errors;}
  for(const n of p.notes)if(!tuning[n.string]||!Number.isInteger(n.fret)||n.fret<0||n.fret>24){fail('cuerda o traste inválido');return errors;}
  for(let i=1;i<p.notes.length;i++){
    const a=p.notes[i-1], b=p.notes[i];
    if(b.string>a.string||(b.string===a.string&&b.fret<=a.fret))fail('notas fuera del orden de cuerdas 6 a 1 y trastes ascendentes');
  }
  for(let s=6;s>=1;s--){
    const count=p.notes.filter(n=>n.string===s).length;
    if(size===5?count!==2:(count<2||count>3))fail(`cuerda ${s} con ${count} notas`);
  }
  const pitches=p.notes.map(n=>tuning[n.string]+n.fret);
  p.notes.forEach((n,i)=>{
    const index=formula.indexOf(mod12(pitches[i]));
    if(index<0)fail(`cuerda ${n.string} traste ${n.fret} fuera de la escala`);
    else if(scale.degrees[index]!==n.degree)fail(`grado incoherente en cuerda ${n.string} traste ${n.fret}`);
  });
  // Distancias: cada nota debe ser el grado siguiente de la escala, a la distancia exacta en semitonos.
  for(let i=1;i<pitches.length;i++){
    const a=formula.indexOf(mod12(pitches[i-1])), step=pitches[i]-pitches[i-1];
    if(a<0)continue;
    const expected=mod12(formula[(a+1)%size]-formula[a])||12;
    if(step!==expected)fail(`distancia de ${step} semitonos entre cuerda ${p.notes[i-1].string} traste ${p.notes[i-1].fret} y cuerda ${p.notes[i].string} traste ${p.notes[i].fret}; se esperaban ${expected}`);
  }
  if(!same([...new Set(pitches.map(mod12))].sort((a,b)=>a-b),formula))fail('no contiene todos los grados de la escala');
  const low=minFret(p), high=Math.max(...p.notes.map(n=>n.fret));
  if(low!==p.sourcePosition)fail(`traste más grave ${low} distinto de la posición de la fuente ${p.sourcePosition}`);
  if(high-low>5)fail('abarca más de seis trastes');
  for(const s of rootStrings[p.caged?.[0]]??[])if(!p.notes.some((n,i)=>n.string===s&&mod12(pitches[i])===0))fail(`la forma ${p.caged} no tiene la tónica en la cuerda ${s}`);
  return errors;
}

export function validateScales(document){
  const errors=[];
  if(document.schemaVersion!==1)errors.push('Versión de esquema no soportada');
  if(!same(document.tuning,tuning))errors.push('Afinación diferente de EADGBE');
  if(document.tonic!=='C'||document.tonicPc!==0)errors.push('Los patrones fuente deben estar en C');
  const sources=new Map((document.sources??[]).map(s=>[s.id,s]));
  for(const s of sources.values())if(!/^https:\/\/onlineguitarbooks\.com\//.test(s.url)||!/^\d{4}-\d{2}-\d{2}$/.test(s.consultedAt??''))errors.push('Fuente sin URL o fecha de consulta: '+s.id);
  if(!same(document.scales.map(s=>s.id),Object.keys(expectedScales)))errors.push('Se esperan las escalas mayor, pentatónica mayor, pentatónica menor y menor natural');
  const ids=new Set();
  for(const scale of document.scales){
    const expected=expectedScales[scale.id], fail=message=>errors.push(scale.id+': '+message);
    if(!expected){fail('escala desconocida');continue;}
    if(!same(scale.formula,expected.formula))fail('fórmula incorrecta');
    if(!same(scale.degrees,expected.degrees))fail('grados incorrectos');
    if(!sources.has(scale.source))fail('fuente desconocida');
    if(!Array.isArray(scale.patterns)||scale.patterns.length!==5){fail('se requieren cinco patrones');continue;}
    const names=CAGED_SEQUENCE.map(l=>expected.minor?l+'m':l);
    if(!same(scale.patterns.map(p=>p.number),[1,2,3,4,5]))fail('numeración distinta de 1 a 5');
    if(!same(scale.patterns.map(p=>p.caged),names))fail('nombres CAGED fuera de la convención '+names.join('-'));
    for(const p of scale.patterns){
      if(ids.has(p.id))fail('identificador duplicado '+p.id);
      ids.add(p.id);
      if(p.id!==`${scale.id}-p${p.number}`)fail('identificador incoherente '+p.id);
      const d=p.sourceDiagram;
      if(!/^https:\/\/onlineguitarbooks\.com\//.test(d?.url??'')||!/^[0-9a-f]{64}$/.test(d?.sha256??'')||!(d?.sizeBytes>0))fail('diagrama fuente incompleto en '+p.id);
      errors.push(...validatePattern(p,scale));
    }
    // Orden por el mástil: E-D-C-A-G suben siempre y la vuelta completa mide una octava (12 trastes).
    const lows=scale.patterns.map(minFret), deltas=lows.map((f,i)=>mod12(lows[(i+1)%5]-f));
    if(deltas.some(d=>d===0)||deltas.reduce((a,b)=>a+b,0)!==12)fail('los patrones no se suceden en orden por el mástil');
    // Enlace entre vecinos: en pentatónica la nota aguda de cada cuerda es la grave del patrón siguiente; en las de siete notas comparten alguna posición.
    scale.patterns.forEach((p,i)=>{
      const next=scale.patterns[(i+1)%5], octave=n=>n.string+':'+mod12(n.fret);
      if(scale.formula.length===5){
        for(let s=6;s>=1;s--){
          const top=Math.max(...p.notes.filter(n=>n.string===s).map(n=>n.fret)), bottom=Math.min(...next.notes.filter(n=>n.string===s).map(n=>n.fret));
          if(mod12(top-bottom)!==0)fail(`${p.id} y ${next.id} no se enlazan en la cuerda ${s}`);
        }
      }else if(!p.notes.some(n=>next.notes.some(m=>octave(m)===octave(n))))fail(`${p.id} y ${next.id} no comparten ninguna posición`);
    });
  }
  for(const [child,parent] of Object.entries(parentScale)){
    const c=document.scales.find(s=>s.id===child), h=document.scales.find(s=>s.id===parent);
    if(!c||!h)continue;
    c.patterns.forEach((p,i)=>{
      const cells=new Set(h.patterns[i]?.notes.map(cell));
      if(!p.notes.every(n=>cells.has(cell(n))))errors.push(`${p.id}: no está contenido en ${h.patterns[i]?.id}`);
    });
  }
  return errors;
}
