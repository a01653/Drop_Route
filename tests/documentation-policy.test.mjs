import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateDtsDocumentation,DTS_INPUTS,DTS_ARTIFACTS} from '../scripts/lib/documentation-validation.mjs';

function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'drop-route-documentation-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const write=(path,content)=>{const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);};
  const policy={schemaVersion:1,dtsDerivatives:'deferred',finalWorkOrder:'DR-007'};
  write('docs/documentation-policy.json',JSON.stringify(policy));
  for(const path of [...DTS_INPUTS,...DTS_ARTIFACTS])write(path,'fixture: '+path);
  const manifest={source:'docs/DTS.md',files:[...DTS_INPUTS,...DTS_ARTIFACTS].map(path=>({path,sha256:createHash('sha256').update(readFileSync(join(root,path))).digest('hex')}))};
  write('docs/latex/DTS_Drop_Route.build.json',JSON.stringify(manifest));
  return {root,write,policy,manifest};
}

test('desarrollo admite cambios de Markdown, plantilla y generador y los declara pendientes',t=>{
  const f=fixture(t);
  for(const path of DTS_INPUTS)f.write(path,'cambio de desarrollo');
  const result=validateDtsDocumentation(f.root);
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(new Set(result.pending),new Set(DTS_INPUTS));
});

test('el cierre estricto rechaza fuentes pendientes aunque la política sea deferred',t=>{
  const f=fixture(t);f.write('docs/DTS.md','nueva arquitectura');
  const result=validateDtsDocumentation(f.root,{final:true});
  assert.equal(result.errors.length,1);
  assert.match(result.errors[0],/pendiente de regenerar/);
  assert.deepEqual(result.pending,[]);
});

test('required exige sincronización también en la comprobación ordinaria',t=>{
  const f=fixture(t);f.write('docs/documentation-policy.json',JSON.stringify({...f.policy,dtsDerivatives:'required'}));
  f.write('scripts/build_dts.py','nuevo generador');
  assert.match(validateDtsDocumentation(f.root).errors[0],/pendiente de regenerar/);
});

test('un DTS sincronizado pasa el cierre estricto sin cambiar la política',t=>{
  const f=fixture(t);
  assert.deepEqual(validateDtsDocumentation(f.root,{final:true}),{errors:[],pending:[]});
});

test('aplazar la generación no permite alterar el PDF existente',t=>{
  const f=fixture(t);f.write(DTS_ARTIFACTS[1],'PDF modificado sin registro');
  assert.match(validateDtsDocumentation(f.root).errors[0],/Derivado.*alterado/);
});

test('aplazar la generación no permite perder el LaTeX existente',t=>{
  const f=fixture(t);rmSync(join(f.root,DTS_ARTIFACTS[0]));
  assert.match(validateDtsDocumentation(f.root).errors[0],/Archivo.*ausente/);
});

test('una política ausente, inválida o desconocida no desactiva la comprobación',t=>{
  const f=fixture(t);
  for(const value of ['{','null',JSON.stringify({...f.policy,dtsDerivatives:'ignorar'})]){
    f.write('docs/documentation-policy.json',value);
    assert.match(validateDtsDocumentation(f.root).errors[0],/Política.*inválida/);
  }
  rmSync(join(f.root,'docs/documentation-policy.json'));
  assert.match(validateDtsDocumentation(f.root).errors[0],/Política.*ausente/);
});

test('el manifiesto sigue siendo obligatorio y debe incluir todos los archivos',t=>{
  const f=fixture(t);
  f.write('docs/latex/DTS_Drop_Route.build.json',JSON.stringify({...f.manifest,files:f.manifest.files.slice(1)}));
  assert.match(validateDtsDocumentation(f.root).errors[0],/Falta entrada/);
  rmSync(join(f.root,'docs/latex/DTS_Drop_Route.build.json'));
  assert.match(validateDtsDocumentation(f.root).errors[0],/Registro.*ausente/);
});

test('el manifiesto rechaza entradas duplicadas, rutas inesperadas y hashes inválidos',t=>{
  const f=fixture(t);
  for(const extra of [f.manifest.files[0],{path:'../otro.pdf',sha256:'a'.repeat(64)},{path:DTS_INPUTS[0],sha256:'no-es-un-hash'}]){
    f.write('docs/latex/DTS_Drop_Route.build.json',JSON.stringify({...f.manifest,files:[...f.manifest.files,extra]}));
    assert.match(validateDtsDocumentation(f.root).errors[0],/Entrada.*inválida/);
  }
});
