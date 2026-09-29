/**
 * exportToPDF.ts — jsPDF-based PDF export (no window.print, works in Joule Spaces/iframes)
 */
import jsPDF from 'jspdf'
import type { LTVFParseResult, LTVFRow } from '../types/ltvf'

const C = {
  sapBlue:   [0,   51,  102] as [number,number,number],
  passGreen: [22,  163, 74]  as [number,number,number],
  warnAmber: [217, 119, 6]   as [number,number,number],
  failRed:   [220, 38,  38]  as [number,number,number],
  white:     [255, 255, 255] as [number,number,number],
  lightGray: [241, 245, 249] as [number,number,number],
  midGray:   [148, 163, 184] as [number,number,number],
  darkText:  [30,  41,  59]  as [number,number,number],
  rowEven:   [248, 250, 252] as [number,number,number],
  headerRow: [15,  23,  42]  as [number,number,number],
}

function rateColor(r: number|null, pass: number): [number,number,number] {
  if (r === null) return C.failRed
  if (r >= pass)  return C.passGreen
  if (r >= 80)    return C.warnAmber
  return C.failRed
}

function statusLabel(r: number|null, pass: number): string {
  if (r === null) return 'CRITICAL'
  if (r >= pass)  return 'HEALTHY'
  if (r >= 80)    return 'AT RISK'
  return 'CRITICAL'
}

const fmt    = (n:number|null|undefined) => (n == null ? '—' : n.toLocaleString())
const fmtPct = (n:number|null|undefined) => (n == null ? '—' : `${n.toFixed(1)}%`)

function isExcluded(r: LTVFRow): boolean {
  const nm = r.test_name?.toLowerCase() ?? ''
  return r.is_group ||
    (nm.includes('(zero data)') && (r.equal ?? 0) === 0) ||
    nm.includes('deactivated') || nm.includes('migrated:')
}

function streamStats(rows: LTVFRow[], pass: number) {
  const m = new Map<string,{total:number;pass:number;fail:number;rateSum:number;rateN:number;approved:number;rejected:number;recheck:number}>()
  for (const r of rows) {
    if (isExcluded(r)) continue
    const stream = r.full_path?.split(' > ')[0] ?? 'Unknown'
    if (!m.has(stream)) m.set(stream,{total:0,pass:0,fail:0,rateSum:0,rateN:0,approved:0,rejected:0,recheck:0})
    const s = m.get(stream)!
    s.total++
    if (r.rate_pct != null) { s.rateSum += r.rate_pct; s.rateN++; if (r.rate_pct >= pass) s.pass++; else s.fail++ }
    const so = (r.so_status ?? '').toLowerCase()
    if (so === 'approved') s.approved++; else if (so === 'rejected') s.rejected++; else if (so === 're-check') s.recheck++
  }
  return [...m.entries()]
    .map(([name,s]) => ({name,...s,avgRate:s.rateN ? s.rateSum/s.rateN : null}))
    .sort((a,b) => (a.avgRate??0)-(b.avgRate??0))
}

function worstTests(rows: LTVFRow[], limit=15): LTVFRow[] {
  return rows.filter(r=>!isExcluded(r)&&r.rate_pct!=null).sort((a,b)=>(a.rate_pct??0)-(b.rate_pct??0)).slice(0,limit)
}
export async function exportToPDF(
  data: LTVFParseResult,
  thresholds: { pass: number; warn: number },
  systemTag: string,
  _uploadedAt: Date | null
): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW=210, ML=12, CW=PW-ML-12
  let y=0
  const { summary, rows, filename } = data
  const { pass } = thresholds
  const streams = streamStats(rows, pass)
  const worst   = worstTests(rows)
  // Header
  doc.setFillColor(...C.sapBlue); doc.rect(0,0,PW,22,'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(13); doc.setFont('helvetica','bold')
  doc.text('LTVR Migration Quality Dashboard', ML, 9)
  doc.setFontSize(8); doc.setFont('helvetica','normal')
  doc.text(filename+(systemTag?'  |  '+systemTag:'')+' | '+new Date().toLocaleDateString(), ML, 16)
  doc.setTextColor(...C.darkText); y=28
  // KPI cards
  const kpiW=CW/4
  const kpis=[
    {label:'Overall Match Rate',value:fmtPct(summary.overall_rate),color:rateColor(summary.overall_rate,pass)},
    {label:'Total Test Cases',  value:fmt(summary.total_rows),      color:C.darkText},
    {label:'Status',            value:statusLabel(summary.overall_rate,pass),color:rateColor(summary.overall_rate,pass)},
    {label:'Data Volume',       value:fmt(summary.total_volume||summary.total_equal)+' items',color:C.darkText},
  ]
  kpis.forEach((k,i)=>{
    const x=ML+i*kpiW
    doc.setFillColor(...C.lightGray); doc.roundedRect(x,y,kpiW-2,16,2,2,'F')
    doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...C.midGray); doc.text(k.label,x+3,y+5)
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...k.color); doc.text(k.value,x+3,y+13)
  })
  doc.setTextColor(...C.darkText); y+=21
  doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(...C.midGray)
  doc.text(fmt(summary.total_equal)+' matching | '+fmt(summary.total_missing)+' missing | '+fmt(summary.total_diff)+' differences',ML,y)
  doc.setTextColor(...C.darkText); y+=7
  // Sign-off row
  if (summary.has_signoff) {
    const tot=(summary.total_approved+summary.total_rejected+summary.total_recheck)||1
    const soW=CW/3
    const pct=(n: number)=>fmt(n)+' ('+((n/tot)*100).toFixed(0)+'%)'
    const soK=[
      {label:'Approved',value:pct(summary.total_approved),color:C.passGreen},
      {label:'Rejected',value:pct(summary.total_rejected),color:C.failRed},
      {label:'Re-check',value:pct(summary.total_recheck), color:C.warnAmber},
    ]
    soK.forEach((k,i)=>{
      const x=ML+i*soW
      doc.setFillColor(...C.lightGray); doc.roundedRect(x,y,soW-2,14,2,2,'F')
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(...C.midGray); doc.text(k.label,x+3,y+5)
      doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(...k.color); doc.text(k.value,x+3,y+12)
    })
    doc.setTextColor(...C.darkText); y+=19
  }
  // Stream table
  y+=2
  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.text('Stream Performance',ML,y); y+=4
  const hasSO=summary.has_signoff
  const sCols=hasSO?['Stream','Tests','Pass(>=85%)','Fail','Rate','Approved','Rejected','Re-check']:['Stream','Tests','Pass(>=85%)','Fail','Rate']
  const sColW: number[]=hasSO?[55,16,22,14,18,22,20,20]:[80,20,26,18,24]
  doc.setFillColor(...C.headerRow); doc.rect(ML,y,CW,6,'F')
  doc.setTextColor(...C.white); doc.setFontSize(7); doc.setFont('helvetica','bold')
  let cx=ML+2; sCols.forEach((h,i)=>{doc.text(h,cx,y+4.3);cx+=sColW[i]}); y+=6
  streams.forEach((s,idx)=>{
    if(y>260){doc.addPage();y=15}
    doc.setFillColor(...(idx%2===0?C.white:C.rowEven)); doc.rect(ML,y,CW,6,'F')
    doc.setTextColor(...C.darkText); doc.setFont('helvetica','normal'); doc.setFontSize(7)
    const rd=hasSO?[s.name,String(s.total),String(s.pass),String(s.fail),fmtPct(s.avgRate),String(s.approved),String(s.rejected),String(s.recheck)]:[s.name,String(s.total),String(s.pass),String(s.fail),fmtPct(s.avgRate)]
    cx=ML+2; rd.forEach((v,i)=>{
      if(i===4){doc.setTextColor(...rateColor(s.avgRate,pass));doc.setFont('helvetica','bold')}
      doc.text(v,cx,y+4.3); doc.setTextColor(...C.darkText); doc.setFont('helvetica','normal'); cx+=sColW[i]
    }); y+=6
  }); y+=4
  // Top issues
  if(worst.length>0){
    if(y>230){doc.addPage();y=15}
    doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(...C.darkText)
    doc.text('Top Issues - Lowest Match Rate ('+worst.length+')',ML,y); y+=4
    const iCols=['Test Name','Stream','Rate','Missing','Sign-Off']
    const iColW=[82,44,18,18,24]
    doc.setFillColor(...C.headerRow); doc.rect(ML,y,CW,6,'F')
    doc.setTextColor(...C.white); doc.setFont('helvetica','bold'); doc.setFontSize(7)
    cx=ML+2; iCols.forEach((h,i)=>{doc.text(h,cx,y+4.3);cx+=iColW[i]}); y+=6
    worst.forEach((r,idx)=>{
      if(y>270){doc.addPage();y=15}
      doc.setFillColor(...(idx%2===0?C.white:C.rowEven)); doc.rect(ML,y,CW,6,'F')
      doc.setTextColor(...C.darkText); doc.setFont('helvetica','normal'); doc.setFontSize(7)
      const stream=r.full_path?.split(' > ')[0]??''
      const nm=r.test_name.length>45?r.test_name.slice(0,45)+'...':r.test_name
      const rd=[nm,stream.length>25?stream.slice(0,25)+'...':stream,fmtPct(r.rate_pct),fmt(r.missing),r.so_status??'-']
      cx=ML+2; rd.forEach((v,i)=>{
        if(i===2){doc.setTextColor(...rateColor(r.rate_pct,pass));doc.setFont('helvetica','bold')}
        doc.text(v,cx,y+4.3); doc.setTextColor(...C.darkText); doc.setFont('helvetica','normal'); cx+=iColW[i]
      }); y+=6
    })
  }
  // Footer + save
  const pages=(doc as unknown as {internal:{getNumberOfPages():number}}).internal.getNumberOfPages()
  for(let p=1;p<=pages;p++){
    doc.setPage(p); doc.setFontSize(7); doc.setTextColor(...C.midGray)
    doc.text('LTVF Dashboard | Pass >='+pass+'% | Page '+p+' of '+pages, ML, 292)
  }
  const safe=filename.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]/g,'_')
  doc.save('LTVR_Dashboard_'+safe+'_'+new Date().toISOString().slice(0,10)+'.pdf')
}
