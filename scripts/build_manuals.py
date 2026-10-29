#!/usr/bin/env python3
from pathlib import Path
import argparse, hashlib, json, re, shutil, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'docs/latex'
TEMPLATE = DEST / 'manual-template.tex'
GENERATOR = Path(__file__).resolve()
DOCS = [
    dict(key='uso', name='Manual_Uso_Drop_Route', title='Manual de uso', source='docs/manuals/USO.md',
         cover='Manual de uso', subtitle='Voicings, rutas II--V--I y patrones de escala'),
    dict(key='instalacion', name='Manual_Instalacion_Drop_Route', title='Manual de instalación', source='docs/manuals/INSTALACION.md',
         cover='Manual de instalación', subtitle='Abrir, instalar y publicar la aplicación'),
]
# La versión impresa en portada y pies sale del paquete, no se escribe a mano en la plantilla.
VERSION = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
IMAGE_RE = re.compile(r'!\[[^\]\n]*\]\((capturas/[a-z0-9-]+\.png)\)')

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def rel(path): return Path(path).resolve().relative_to(ROOT).as_posix()

FIG_RE = re.compile(r'\\pandocbounded\{\\includegraphics\[[^\]]*\]\{([^}]+\.png)\}\}')
CAPTION_RE = re.compile(r'\\emph\{Figura \d+\.[^\n]*\}')
# Relación ancho/alto desde la que una captura es demasiado apaisada para compartir línea con texto.
WIDE = 2.3
# Reparto de la línea entre el texto (izquierda) y la captura (derecha), y texto mínimo y máximo que la acompaña.
TEXT_WIDTH, FIGURE_WIDTH = '0.38', '0.58'
MIN_TEXT, MAX_TEXT = 250, 900
NOT_PLAIN = ('\\section', '\\subsection', '\\begin', '\\end', '\\item', '\\hypertarget', '\\pandocbounded', '\\tightlist', '\\noindent')

def png_ratio(path):
    """Ancho entre alto de un PNG referenciado desde docs/latex, leído de su cabecera IHDR."""
    header = (DEST / path).resolve().read_bytes()[16:24]
    return int.from_bytes(header[:4], 'big') / int.from_bytes(header[4:], 'big')

def wrap_figures(latex):
    """Cada captura comparte línea con los párrafos que la introducen: texto a la izquierda, figura a la derecha, como en un
    libro. Es un bloque fijo (no un flotante de wrapfig, que se desborda al pie de página). Las muy anchas, o sin texto
    suficiente a su lado, son figuras flotantes a ancho completo."""
    head, sep, rest = latex.partition('\\begin{document}')
    blocks = rest.split('\n\n')
    out, i = [], 0
    while i < len(blocks):
        m = FIG_RE.fullmatch(blocks[i].strip()) if i + 1 < len(blocks) else None
        caption = blocks[i + 1].strip() if m else ''
        if not m or not CAPTION_RE.fullmatch(caption):
            out.append(blocks[i]); i += 1; continue
        i += 2
        path = m.group(1)
        graphic = '\\includegraphics[width=\\linewidth,keepaspectratio]{' + path + '}\\par\\smallskip\n{\\footnotesize ' + caption + '}'
        text, size = [], 0
        while out and out[-1].strip() and not out[-1].lstrip().startswith(NOT_PLAIN) and '\\begin{' not in out[-1] and size + len(out[-1]) <= MAX_TEXT:
            size += len(out[-1]); text.insert(0, out.pop())
        if png_ratio(path) >= WIDE or size < MIN_TEXT:
            out.extend(text)
            out.append('\\begin{figure}[!htbp]\n\\centering\n' + graphic.replace('width=\\linewidth', 'width=0.82\\linewidth', 1) + '\n\\end{figure}')
            continue
        # \vspace{0pt}: la línea base de una imagen es su borde inferior; así ambas columnas se alinean por arriba.
        out.append('\\noindent\\begin{minipage}[t]{' + TEXT_WIDTH + '\\linewidth}\\vspace{0pt}\n\\raggedright\n' + '\n\n'.join(text) + '\n\\end{minipage}\\hfill\n'
                   '\\begin{minipage}[t]{' + FIGURE_WIDTH + '\\linewidth}\\vspace{0pt}\\centering\n' + graphic + '\n\\end{minipage}')
    return head + sep + '\n\n'.join(out)

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
             '--variable=headtitle:'+doc['title'],'--variable=version:'+VERSION]
        r=run(cmd,cwd=ROOT)
        if r.returncode: raise SystemExit(r.stderr[-4000:])
        latex=tex.read_text(encoding='utf-8')
        latex=latex.replace('{capturas/', '{../manuals/capturas/')
        latex=re.sub(r'\\includegraphics(\[[^\]]*\])?\{\.\./manuals/capturas/',
                     r'\\includegraphics[width=0.48\\linewidth,height=0.62\\textheight,keepaspectratio]{../manuals/capturas/', latex)
        latex=wrap_figures(latex)
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
