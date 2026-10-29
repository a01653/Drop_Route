import {readJson,validateCatalog,validateRoutes,validateSources} from './lib/music-validation.mjs';
import {validateScales} from './lib/scale-validation.mjs';
const c=readJson('data/catalog.json'),r=readJson('data/routes.json'),s=readJson('data/scales.json');
const errors=[...validateCatalog(c),...validateRoutes(r,c),...validateSources(readJson('references/sources.json'),c,r),...validateScales(s)];
if(errors.length){for(const e of errors)console.error('FAIL '+e);process.exitCode=1;}
else console.log('OK: 124 posiciones (112 evaluables, 12 de referencia), 16 rutas, 20 patrones de escala y referencias íntegras.');
