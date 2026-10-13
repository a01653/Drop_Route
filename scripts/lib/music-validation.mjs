import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const readJson = path => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
const tuning = { 1:64, 2:59, 3:55, 4:50, 5:45, 6:40 };
const degreePc = { '1':0, '3':4, b3:3, '5':7, b5:6, '7':11, b7:10, bb7:9 };
const expectedSets = { D2S1:[4,3,2,1], D2S2:[5,4,3,2], D2S3:[6,5,4,3], D3S1:[5,3,2,1], D3S2:[6,4,3,2], D24S1:[5,4,2,1], D24S2:[6,5,3,2] };
const expectedFormula = { maj7:[0,4,7,11], '7':[0,4,7,10], m7:[0,3,7,10], m7b5:[0,3,6,10], dim7:[0,3,6,9] };
const order = {
  drop2:[[0,2,3,1],[1,3,0,2],[2,0,1,3],[3,1,2,0]],
  drop3:[[0,3,1,2],[1,0,2,3],[2,1,3,0],[3,2,0,1]],
  'drop2+4':[[0,2,1,3],[1,3,2,0],[2,0,3,1],[3,1,0,2]]
};
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const mod12 = n => ((n%12)+12)%12;

export function validateVoicing(v,catalog) {
  const errors=[];
  const fail = message => errors.push((v.id||v.name||'posición')+': '+message);
  const quality=catalog.qualities[v.quality];
  const set=catalog.sets.find(s=>s.id===v.setId);
  if(!quality||!set){ fail('calidad o set desconocido'); return errors; }
  if(!Number.isInteger(v.inversion)||v.inversion<0||v.inversion>3){ fail('inversión inválida');return errors; }
  if(!Number.isInteger(v.rootPc)||v.rootPc<0||v.rootPc>11){fail('tónica inválida');return errors;}
  if(!Array.isArray(v.notes)||v.notes.length!==4){ fail('se requieren cuatro notas');return errors;}
  if(!same(v.notes.map(n=>n.string),set.strings))fail('orden o conjunto de cuerdas incorrecto');
  const pitches=[], labels=[];
  for(const n of v.notes){
    if(!Number.isInteger(n.fret)||n.fret<0||n.fret>24||!tuning[n.string]){fail('cuerda o traste inválido');continue;}
    const midi=tuning[n.string]+n.fret;
    pitches.push(midi);labels.push(mod12(midi-v.rootPc));
    if(degreePc[n.degree]===undefined||mod12(midi-v.rootPc)!==degreePc[n.degree])fail('grado incoherente con la nota física');
  }
  if(!same([...new Set(labels)].sort((a,b)=>a-b),quality.formula))fail('notas diferentes de la fórmula');
  if(pitches.length===4&&mod12(Math.min(...pitches)-v.rootPc)!==quality.formula[v.inversion])fail('bajo incompatible con la inversión');
  if(!same(v.notes.map(n=>n.degree),order[set.drop][v.inversion].map(i=>quality.degrees[i])))fail('distribución de grados incompatible con el Drop');
  return errors;
}

export function validateCatalog(catalog){
  const errors=[];
  if(catalog.schemaVersion!==1)errors.push('Versión de esquema no soportada');
  if(!same(catalog.tuning,tuning))errors.push('Afinación diferente de EADGBE');
  if(catalog.sets.length!==7)errors.push('Se requieren siete sets');
  for(const [id,strings] of Object.entries(expectedSets))if(!same(catalog.sets.find(s=>s.id===id)?.strings,strings))errors.push('Set incorrecto: '+id);
  for(const [key,formula] of Object.entries(expectedFormula))if(!same(catalog.qualities[key]?.formula,formula))errors.push('Fórmula incorrecta: '+key);
  const ids=new Set(), combinations=new Set();
  for(const v of catalog.voicings){
    if(ids.has(v.id))errors.push('Identificador duplicado: '+v.id);
    ids.add(v.id);
    const key=v.setId+'/'+v.quality+'/'+v.inversion;
    if(combinations.has(key))errors.push('Posición duplicada: '+key);
    combinations.add(key);
    if(v.root!=='C'||v.rootPc!==0)errors.push('El catálogo inicial debe estar en C: '+v.id);
    if(v.quizEnabled!==(v.quality!=='dim7'))errors.push('Evaluabilidad incorrecta: '+v.id);
    errors.push(...validateVoicing(v,catalog));
  }
  for(const id of Object.keys(expectedSets))for(const q of ['maj7','7','m7','m7b5'])for(let i=0;i<4;i++)if(!combinations.has(id+'/'+q+'/'+i))errors.push('Falta una posición de la plantilla');
  if(catalog.voicings.length!==124)errors.push('Se esperan 112 posiciones de juego y 12 disminuidas de referencia');
  return errors;
}

export function validateRoutes(document,catalog){
  const errors=[], identities=new Set();
  if(document.routes.length!==16)errors.push('Se requieren dieciséis rutas');
  for(const r of document.routes){
    const fail=message=>errors.push(r.id+': '+message);
    if(identities.has(r.id))fail('identificador duplicado');
    identities.add(r.id);
    if(!['D2S1','D2S2'].includes(r.setId)||!['major','minor'].includes(r.mode)||r.tonic!=='C')fail('ruta fuera del alcance normalizado');
    if(!Array.isArray(r.steps)||r.steps.length!==3){fail('ruta incompleta');continue;}
    const names=r.mode==='major'?['Dm7','G7','Cmaj7']:['Dm7(b5)','G7','Cm7'];
    const qualities=r.mode==='major'?['m7','7','maj7']:['m7b5','7','m7'];
    if(!same(r.steps.map(s=>s.name),names))fail('nombres fuera de la secuencia fuente');
    if(!same(r.steps.map(s=>s.quality),qualities))fail('calidades incorrectas');
    if(!same(r.steps.map(s=>s.function),['ii','V','I']))fail('funciones incorrectas');
    if(!same(r.steps.map(s=>s.rootPc),[2,7,0])||!same(r.steps.map(s=>s.root),['D','G','C']))fail('raíces incorrectas');
    const start=r.steps[0].inversion;
    if(!same(r.steps.map(s=>s.inversion),[start,(start+2)%4,start]))fail('inversiones fuera de la ruta');
    for(const step of r.steps){if(step.setId!==r.setId)fail('cambio de set no previsto');errors.push(...validateVoicing(step,catalog));}
  }
  for(const set of ['D2S1','D2S2'])for(const mode of ['major','minor'])for(let i=0;i<4;i++)if(document.routes.filter(r=>r.setId===set&&r.mode===mode&&r.steps[0]?.inversion===i).length!==1)errors.push('Falta una ruta o está duplicada');
  return errors;
}

export function validateSources(manifest,catalog,routes,base=ROOT){
  const errors=[];
  for(const source of manifest.files){
    let bytes;
    try{bytes=readFileSync(resolve(base,source.file));}catch{errors.push('Referencia ausente: '+source.file);continue;}
    if(bytes.length!==source.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==source.sha256)errors.push('Referencia modificada: '+source.file);
  }
  const source=manifest.files.find(f=>f.file===catalog.source);
  if(!source||catalog.sourceSha256!==source.sha256||routes.sourceSha256!==source.sha256)errors.push('Procedencia del catálogo o rutas incoherente');
  return errors;
}
