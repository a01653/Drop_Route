#!/usr/bin/env python3
"""Genera LaTeX y PDF desde el DTS Markdown."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "docs/DTS.md"
DEST = ROOT / "docs/latex"
TEMPLATE = DEST / "dts-template.tex"
NAME = "DTS_Drop_Route"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine",choices=["auto","lualatex","xelatex"],default="auto")
    args = parser.parse_args()
    if args.engine == "auto":
        module = subprocess.run(["kpsewhich","luaotfload-main.lua"],capture_output=True,text=True).stdout.strip() if shutil.which("kpsewhich") else ""
        args.engine = "lualatex" if shutil.which("lualatex") and module else "xelatex"
    for tool in ["pandoc",args.engine]:
        if not shutil.which(tool):
            raise SystemExit("Falta "+tool)
    text = MD.read_text(encoding="utf-8")
    source_hash = hashlib.sha256(MD.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory(prefix="drop-route-dts-") as temporary:
        temp = Path(temporary)
        body = temp / "body.md"
        body.write_text(text[text.index("## "):],encoding="utf-8")
        tex = temp / (NAME+".tex")
        subprocess.run(["pandoc",str(body),"--from=gfm","--to=latex","--standalone",
                        "--number-sections","--shift-heading-level-by=-1",
                        "--template="+str(TEMPLATE),"--output="+str(tex)],check=True)
        latex = tex.read_text(encoding="utf-8")
        def columns(match):
            n = len(match.group(1))
            fractions = [0.29,0.71] if n==2 else [1/n]*n
            padding = (2*n-2)/n
            cols = "".join(r">{\raggedright\arraybackslash}p{\dimexpr"+f"{f:.6f}"+r"\linewidth-"+f"{padding:.6f}"+r"\tabcolsep\relax}" for f in fractions)
            return r"\begin{longtable}[]{@{}"+cols+r"@{}}"
        latex = re.sub(r"\\begin\{longtable\}\[\]\{@\{\}([lcr]+)@\{\}\}",columns,latex)
        latex = re.sub(r"^(\\hypertarget\{[^\n]+\}\{%\s*\\section|\\section)",r"\\Needspace{4cm}\n\1",latex,flags=re.M)
        latex = latex.replace("% !TeX program = lualatex","% !TeX program = "+args.engine)
        tex.write_text("% Source-SHA256: "+source_hash+"\n"+latex,encoding="utf-8",newline="\n")
        for _ in range(3):
            result = subprocess.run([args.engine,"-interaction=nonstopmode","-halt-on-error",
                                     "-output-directory=.",tex.name],
                                    cwd=temp,capture_output=True,text=True)
            if result.returncode:
                print(result.stdout[-6000:])
                raise SystemExit("Compilación fallida; no se sustituyen los derivados")
        log = (temp/(NAME+".log")).read_text(encoding="utf-8")
        if "Overfull \\hbox" in log:
            lines=log.splitlines()
            for i,line in enumerate(lines):
                if "Overfull \\hbox" in line: print("\n".join(lines[i:i+5]))
            raise SystemExit("Hay desbordes; revisar antes de entregar")
        # Un carácter sin glifo en la fuente se imprime como un cuadro vacío sin que la compilación falle.
        missing = [line for line in log.splitlines() if line.startswith("Missing character")]
        if missing:
            print("\n".join(missing))
            raise SystemExit("Hay caracteres sin glifo en la fuente; revisar antes de entregar")
        for ext in [".tex",".pdf"]:
            shutil.copyfile(temp/(NAME+ext),DEST/(NAME+ext))
    files = [MD,DEST/(NAME+".tex"),DEST/(NAME+".pdf"),TEMPLATE,Path(__file__).resolve()]
    manifest = {"source":"docs/DTS.md","command":"npm run docs:build","engine":args.engine,
                "files":[{"path":p.relative_to(ROOT).as_posix(),"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
    (DEST/(NAME+".build.json")).write_text(json.dumps(manifest,indent=2)+"\n",newline="\n")
    print("DTS generado; sin Overfull hbox ni caracteres sin glifo")


if __name__ == "__main__":
    main()
