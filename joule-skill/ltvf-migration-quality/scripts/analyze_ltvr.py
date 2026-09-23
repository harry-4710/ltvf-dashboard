#!/usr/bin/env python3
# analyze_ltvr.py - Joule Skill helper
# Usage: python analyze_ltvr.py <file.xlsx> [--summary]
#        python analyze_ltvr.py --live [--url URL]
# Deps: pip install openpyxl requests
import sys, json, argparse, math
from pathlib import Path
BACKEND = "https://ltvf-backend.cfapps.us10-003.hana.ondemand.com"
PASS_THRESHOLD = 85.0
def _f(v):
    try: x=float(v); return round(x,2) if not math.isnan(x) else None
    except: return None
def _i(v):
    try: x=float(v); return int(x) if not math.isnan(x) else None
    except: return None
def _s(v):
    if v is None: return None
    s=str(v).strip()
    return s if s and s.lower() not in ("nan","none","") else None
def parse_excel(path):
    try: import openpyxl
    except ImportError: sys.exit("ERROR: pip install openpyxl")
    ws=openpyxl.load_workbook(path,read_only=True,data_only=True).active
    rows=list(ws.iter_rows(values_only=True))
    if not rows: sys.exit("empty workbook")
    hdrs=[str(h).strip().lower() if h else "" for h in rows[0]]
    if "s/o" not in hdrs: sys.exit("ERROR: not LTVR - no S/O column")
    def ci(n):
        try: return hdrs.index(n)
        except: return None
    idx={k:ci(v) for k,v in {"name":"test name","so":"s/o","signed":"signed by",
        "rate":"rate(%)","diff":"diff.","missing":"missing","unexp":"unexp.",
        "equal":"equal","wi_pct":"wi(%)","tot":"tot"}.items()}
    def g(r,k): i=idx.get(k); return r[i] if i is not None and i<len(r) else None
    data=rows[1:]
    gt=next((r for r in data if not _s(g(r,"name"))),None)
    sr=_f(g(gt,"rate")) if gt else 0.0; se=_i(g(gt,"equal")) if gt else 0
    sd=_i(g(gt,"diff")) if gt else 0; sm=_i(g(gt,"missing")) if gt else 0
    su=_i(g(gt,"unexp")) if gt else 0; sv=_i(g(gt,"tot")) if gt else 0
    out=[]; secs=[]; n=pc=fc=ac=rc=cc=0; cid=None; cnm=""
    for r in data:
        nm=_s(g(r,"name"))
        if not nm: continue
        n+=1; rid="row_"+str(n); grp=">" in nm
        if grp:
            pts=[p.strip().rstrip(">").strip() for p in nm.split(">")]
            pts=[p for p in pts if p]; lbl=pts[-1] if pts else nm
            cid=rid; cnm=lbl
            if lbl not in secs: secs.append(lbl)
            out.append({"id":rid,"parent_id":None,"level":0,"test_name":lbl,
                "full_path":lbl,"is_group":True,"rate_pct":_f(g(r,"rate")),
                "diff":_i(g(r,"diff")),"missing":_i(g(r,"missing")),
                "equal":_i(g(r,"equal")),"tot":_i(g(r,"tot")),
                "wi_pct":_f(g(r,"wi_pct")),"so_status":None,"signed_by":None})
        else:
            so=_s(g(r,"so")); spb=_s(g(r,"signed")); rate=_f(g(r,"rate"))
            if so=="Approved": ac+=1
            elif so=="Rejected": rc+=1
            elif so=="Re-check": cc+=1
            if rate is not None:
                if rate>=PASS_THRESHOLD: pc+=1
                else: fc+=1
            fp=cnm+" > "+nm if cnm else nm
            out.append({"id":rid,"parent_id":cid,"level":1,"test_name":nm,
                "full_path":fp,"is_group":False,"rate_pct":rate,
                "diff":_i(g(r,"diff")),"missing":_i(g(r,"missing")),
                "equal":_i(g(r,"equal")),"tot":_i(g(r,"tot")),
                "wi_pct":_f(g(r,"wi_pct")),"so_status":so,"signed_by":spb})
    has=(ac+rc+cc)>0; src=(se or 0)+(sm or 0)
    return {"filename":Path(path).name,"source":"excel_upload","sections":secs,"rows":out,
        "summary":{"overall_rate":sr or 0.0,"total_equal":se or 0,"total_diff":sd or 0,
            "total_missing":sm or 0,"total_unexpected":su or 0,"total_source":src,
            "total_target":se or 0,"total_rows":pc+fc,"pass_count":pc,"warn_count":0,
            "fail_count":fc,"has_signoff":has,"total_approved":ac,"total_rejected":rc,
            "total_recheck":cc,"total_volume":sv or 0}}
def fetch_live(base,tag):
    try: import requests
    except ImportError: sys.exit("ERROR: pip install requests")
    st=requests.get(base+"/api/sap/status",timeout=10).json()
    if not st.get("available"):
        print(json.dumps({"error":"BTP not connected","missing_vars":st.get("missing_vars",[])}))
        sys.exit(0)
    r=requests.get(base+"/api/sap/fetch?system_tag="+tag,timeout=30)
    r.raise_for_status(); d=r.json(); d["source"]="live_sap"; return d

def print_summary(d):
    s=d["summary"]
    print("\n"+"="*56+"\nLTVR: "+d["filename"]+"\n"+"="*56)
    print("Rate: {:.1f}%  tests={}  pass={}  fail={}".format(
        s["overall_rate"],s["total_rows"],s["pass_count"],s["fail_count"]))
    if s.get("has_signoff"):
        print("SO: approved={}  rejected={}  recheck={}".format(
            s["total_approved"],s["total_rejected"],s["total_recheck"]))
    if s.get("total_volume"): print("Vol: {:,}".format(s["total_volume"]))
    print("Streams: "+", ".join(d["sections"]))
    worst=[r for r in d["rows"] if not r["is_group"] and r["rate_pct"] is not None]
    worst.sort(key=lambda r:r["rate_pct"])
    for r in worst[:5]:
        print("  {:5.1f}%  {}  [{}]".format(
            r["rate_pct"],r["test_name"][:50],r.get("so_status","")))
    print("="*56)

def main():
    p=argparse.ArgumentParser()
    p.add_argument("file",nargs="?"); p.add_argument("--live",action="store_true")
    p.add_argument("--url",default=BACKEND); p.add_argument("--system-tag",default="default")
    p.add_argument("--summary",action="store_true")
    a=p.parse_args()
    if a.live or not a.file: data=fetch_live(a.url,a.system_tag)
    else:
        if not Path(a.file).exists(): sys.exit("not found: "+a.file)
        data=parse_excel(a.file)
    if a.summary: print_summary(data)
    else: print(json.dumps(data,indent=2,ensure_ascii=False))

if __name__=="__main__": main()
