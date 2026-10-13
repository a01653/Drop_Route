#!/usr/bin/env python3
"""Extrae los datos literales de la plantilla sin ejecutar su JavaScript."""
from pathlib import Path
import argparse
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "references/laminas-drop-original.html"


def unpack(text):
    match = re.search(r'<script type="__bundler/template">([\s\S]*?)</script>', text)
    return json.loads(match.group(1)) if match else text


def literal(source, name, references=None):
    match = re.search(r"\bconst\s+" + re.escape(name) + r"\s*=\s*([\s\S]*?);", source)
    if not match:
        raise ValueError(f"No se encuentra {name}")
    value = match.group(1)
    for key, item in sorted((references or {}).items(), key=lambda pair: -len(pair[0])):
        value = re.sub(r"(?<![\w.])" + re.escape(key) + r"\b", lambda _: json.dumps(item), value)
    value = re.sub(r'(?<=[{,])\s*([A-Za-z_$0-9][\w$]*)\s*:', r'"\1":', value)
    value = re.sub(r",\s*([}\]])", r"\1", value)
    return json.loads(value)


def build():
    source = unpack(SOURCE.read_text(encoding="utf-8"))
    v, sets, deg, qual = [literal(source, name) for name in ["V", "SETS", "DEG", "QUAL"]]
    qualities = {
        "maj7": {"name": "Cmaj7", "formula": [0,4,7,11], "degrees": ["1","3","5","7"]},
        "7": {"name": "C7", "formula": [0,4,7,10], "degrees": ["1","3","5","b7"]},
        "m7": {"name": "Cm7", "formula": [0,3,7,10], "degrees": ["1","b3","5","b7"]},
        "m7b5": {"name": "Cm7(b5)", "formula": [0,3,6,10], "degrees": ["1","b3","b5","b7"]},
        "dim7": {"name": "Cdim7", "formula": [0,3,6,9], "degrees": ["1","b3","b5","bb7"], "quizEnabled": False},
    }
    lookup = {item["name"]: key for key,item in qualities.items()}
    set_defs, voicings = [], []
    for key, strings in sets.items():
        family = "D24" if key.startswith("D24") else "D3" if key.startswith("D3") else "D2"
        drop = {"D24": "drop2+4", "D3": "drop3", "D2": "drop2"}[family]
        set_defs.append({"id": key, "drop": drop, "number": int(key[-1]), "strings": strings})
        for name, positions in v[key].items():
            quality = lookup[name]
            for inversion, frets in enumerate(positions):
                voicings.append({
                    "id": f"{key.lower()}-{quality}-i{inversion}", "setId": key,
                    "root": "C", "rootPc": 0, "quality": quality, "name": name,
                    "inversion": inversion, "quizEnabled": True,
                    "notes": [{"string":s,"fret":f,"degree":qual[name][str(d)][0]}
                              for s,f,d in zip(strings,frets,deg[family][inversion])]
                })
    dims, dim_positions = literal(source,"DIMSETS"), literal(source,"VDIM")
    labels = {1:"1",3:"b3",5:"b5",7:"bb7"}
    for key, strings in dims.items():
        for inversion, frets in enumerate(dim_positions[key]):
            set_id = "D2" + key
            voicings.append({
                "id": f"{set_id.lower()}-dim7-i{inversion}", "setId": set_id,
                "root":"C","rootPc":0,"quality":"dim7","name":"Cdim7",
                "inversion":inversion,"quizEnabled":False,
                "notes":[{"string":s,"fret":f,"degree":labels[d]}
                         for s,f,d in zip(strings,frets,deg["D2"][inversion])]
            })
    meta = {"schemaVersion":1,"source":"references/laminas-drop-original.html",
            "sourceSha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            "sourceDocumentVersion":literal(source,"DOCUMENT_VERSION")}
    catalog = {**meta,"tuning":{"1":64,"2":59,"3":55,"4":50,"5":45,"6":40},
               "sets":set_defs,"qualities":qualities,
               "inversions":["Fundamental","1ª inversión","2ª inversión","3ª inversión"],
               "voicings":voicings}
    refs = {"QUAL.Cmaj7":qual["Cmaj7"],"QUAL.Cm7":qual["Cm7"]}
    for name in ["QUAL_DM7","QUAL_G7","QUAL_DM7B5"]:
        refs[name] = literal(source,name)
    routes = []
    for constant,set_id,mode in [
        ("IIVI_CYCLES","D2S1","major"),("IIVI_MINOR_CYCLES","D2S1","minor"),
        ("IIVI_SET2_CYCLES","D2S2","major"),("IIVI_SET2_MINOR_CYCLES","D2S2","minor")
    ]:
        for index,cycle in enumerate(literal(source,constant,refs)):
            steps = []
            for ordinal,chord in enumerate(cycle["chords"]):
                inversion = ["Fundamental","1ª Inversión","2ª Inversión","3ª Inversión"].index(chord["family"])
                root = ["D","G","C"][ordinal]
                quality = "m7b5" if chord["name"]=="Dm7(b5)" else "m7" if chord["name"] in ["Dm7","Cm7"] else "7" if root=="G" else "maj7"
                step = {"function":["ii","V","I"][ordinal],"name":chord["name"],"root":root,
                        "rootPc":{"C":0,"D":2,"G":7}[root],"quality":quality,"inversion":inversion,"setId":set_id,
                        "notes":[{"string":s,"fret":f,"degree":chord["qual"][str(d)][0]}
                                 for s,f,d in zip(sets[set_id],chord["frets"],chord["degrees"])]}
                if "sub6" in chord:
                    step["sourceOptionalSubstitution"] = chord["sub6"]
                steps.append(step)
            routes.append({"id":f"{set_id.lower()}-{mode}-i{index}","setId":set_id,
                           "tonic":"C","mode":mode,"sourceConstant":constant,"steps":steps})
    return {"data/catalog.json":catalog,"data/routes.json":{**meta,"routes":routes}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check",action="store_true")
    args = parser.parse_args()
    for relative,data in build().items():
        target = ROOT / relative
        if args.check:
            if json.loads(target.read_text(encoding="utf-8")) != data:
                raise SystemExit("Datos diferentes de la fuente: "+relative)
        else:
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print("OK "+relative)


if __name__ == "__main__":
    main()
