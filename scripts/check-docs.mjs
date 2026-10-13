import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {ROOT} from './lib/music-validation.mjs';
import {validateDtsDocumentation} from './lib/documentation-validation.mjs';
const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--final')){
  console.error('Uso: node scripts/check-docs.mjs [--final]');
  process.exit(1);
}
const errors=[],files=[],ignored=new Set(['.git','node_modules','.claude']);
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){if(ignored.has(e.name))continue;const p=resolve(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.md'))files.push(p);}}
walk(ROOT);
for(const p of files){
  for(const m of readFileSync(p,'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
    const t=m[1].split('#')[0];
    if(!t||/^(https?:|mailto:)/.test(t))continue;
    if(!existsSync(resolve(dirname(p),t)))errors.push(relative(ROOT,p)+': enlace ausente '+t);
  }
}
if(!readFileSync(resolve(ROOT,'CLAUDE.md'),'utf8').includes('@AGENTS.md'))errors.push('Falta importación de reglas comunes');
for(let i=1;i<=7;i++)if(!existsSync(resolve(ROOT,'docs/work-orders/DR-'+String(i).padStart(3,'0')+'.md')))errors.push('Falta una orden de trabajo');
const dts=validateDtsDocumentation(ROOT,{final:args.includes('--final')});
errors.push(...dts.errors);
if(errors.length){for(const e of errors)console.error('FAIL '+e);process.exitCode=1;}
else {
  if(dts.pending.length)console.log('PENDIENTE DR-007: regenerar DTS por cambios en '+dts.pending.join(', ')+'.');
  console.log('OK: '+files.length+' documentos, enlaces, órdenes e integridad de los derivados existentes'+(dts.pending.length?' (regeneración aplazada).':'; DTS sincronizado.'));
}
