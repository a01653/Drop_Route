#!/usr/bin/env python3
from pathlib import Path
import argparse, hashlib, json, re, shutil, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'docs/latex'
TEMPLATE = DEST / 'manual-template.tex'
GENERATOR = Path(__file__).resolve()
DOCS = [
    dict(key='uso', name='Manual_Uso_Drop_Route', title='Manual de uso', source='docs/manuals/USO.md',
         cover='Manual de uso', subtitle='Reconocer voicings y continuar rutas II--V--I'),
    dict(key='instalacion', name='Manual_Instalacion_Drop_Route', title='Manual de instalación', source='docs/manuals/INSTALACION.md',
         cover='Manual de instalación', subtitle='Abrir, instalar y publicar la aplicación'),
]
IMAGE_RE = re.compile(r'!\[[^\]\n]*\]\((capturas/[a-z0-9-]+\.png)\)')

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def rel(path): return Path(path).resolve().relative_to(ROOT).as_posix()

def run(cmd, **kwargs):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', **kwargs)

def compile_doc(doc, engine):
    source = ROOT / doc['source']
    text = source.read_text(encoding='utf-8').replace('\r\n','\n')
    text = re.sub(r'^# [^\n]+\n', '', text, count=1)
    captures=[]
    for m in IMAGE_RE.finditer(text):
        p=(source.parent/m.group(1)).resolve()
        if not p.is_file(): raise SystemExit('Falta captura: '+rel(p))
        if p not in captures: captures.append(p)
    with tempfile.TemporaryDirectory(prefix='drop-route-manual-') as td:
        work=Path(td)
        md=work/'body.md'; md.write_text(text, encoding='utf-8', newline='\n')
        tex=work/(doc['name']+'.tex')
        cmd=['pandoc',str(md),'--from=gfm','--to=latex','--standalone','--no-highlight',
             '--shift-heading-level-by=-1','--template='+str(TEMPLATE),'--output='+str(tex),
             '--variable=covertitle:'+doc['cover'],'--variable=coversubtitle:'+doc['subtitle'],
             '--variable=headtitle:'+doc['title']]
        r=run(cmd,cwd=ROOT)
        if r.returncode: raise SystemExit(r.stderr[-4000:])
        latex=tex.read_text(encoding='utf-8')
        latex=latex.replace('{capturas/', '{../manuals/capturas/')
        latex=re.sub(r'\\includegraphics(\[[^\]]*\])?\{\.\./manuals/capturas/',
                     r'\\includegraphics[width=0.48\\linewidth,height=0.62\\textheight,keepaspectratio]{../manuals/capturas/', latex)
        latex=latex.replace('% !TeX program = lualatex','% !TeX program = '+engine)
        tex.write_text('% Source-SHA256: '+sha(source)+'\n'+latex,encoding='utf-8',newline='\n')
        build=work/'docs/latex'; build.mkdir(parents=True)
        finaltex=build/tex.name; shutil.copyfile(tex,finaltex)
        capdir=work/'docs/manuals/capturas'; capdir.mkdir(parents=True)
        for p in captures: shutil.copyfile(p,capdir/p.name)
        for _ in range(3):
            r=run([engine,'-interaction=nonstopmode','-halt-on-error','-output-directory=.',finaltex.name],cwd=build)
            if r.returncode: raise SystemExit(r.stdout[-6000:])
        log=(build/(doc['name']+'.log')).read_text(encoding='utf-8',errors='replace')
        bad=[x for x in ['Overfull \\hbox','Overfull \\vbox','Missing character','Float too large','undefined references'] if x in log]
        if bad: raise SystemExit(doc['title']+': problemas en LaTeX: '+', '.join(bad))
        pdf=build/(doc['name']+'.pdf')
        DEST.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(finaltex,DEST/finaltex.name); shutil.copyfile(pdf,DEST/pdf.name)
    files=[{'path':rel(source),'sha256':sha(source),'role':'source'},
           {'path':rel(TEMPLATE),'sha256':sha(TEMPLATE),'role':'template'},
           {'path':rel(GENERATOR),'sha256':sha(GENERATOR),'role':'generator'}]
    for p in captures: files.append({'path':rel(p),'sha256':sha(p),'role':'capture'})
    files += [
        {'path':rel(DEST/(doc['name']+'.tex')),'sha256':sha(DEST/(doc['name']+'.tex')),'role':'latex'},
        {'path':rel(DEST/(doc['name']+'.pdf')),'sha256':sha(DEST/(doc['name']+'.pdf')),'role':'pdf'}]
    manifest={'document':doc['key'],'title':doc['title'],'source':doc['source'],'command':'npm run docs:build','engine':engine,'files':files}
    (DEST/(doc['name']+'.build.json')).write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
    print(doc['title']+' generado')

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--engine',choices=['auto','lualatex','xelatex'],default='auto'); a=ap.parse_args()
    if a.engine=='auto': a.engine='lualatex' if shutil.which('lualatex') else 'xelatex'
    for tool in ['pandoc',a.engine]:
        if not shutil.which(tool): raise SystemExit('Falta '+tool)
    for doc in DOCS: compile_doc(doc,a.engine)
if __name__=='__main__': main()
