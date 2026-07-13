from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import datetime

doc = Document()

# ── Page margins ──────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin   = Cm(2.8)
    section.right_margin  = Cm(2.8)

# ── Colour palette ────────────────────────────────────────────────────────────
SAP_BLUE    = RGBColor(0x00, 0x33, 0x66)
MID_BLUE    = RGBColor(0x00, 0x5A, 0x9C)
ACCENT_BLUE = RGBColor(0x0A, 0x84, 0xFF)
LIGHT_GREY  = RGBColor(0xF5, 0xF5, 0xF5)
DARK_GREY   = RGBColor(0x33, 0x33, 0x33)
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
GREEN       = RGBColor(0x16, 0xA3, 0x4A)
AMBER       = RGBColor(0xD9, 0x77, 0x06)

# ── Helper utilities ──────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_color: str):
    """Fill a table cell with a solid background colour."""
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd  = OxmlElement("w:shd")
    shd.set(qn("w:val"),   "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"),  hex_color)
    tcPr.append(shd)


def set_cell_borders(cell, color="DDDDDD"):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right"):
        border = OxmlElement(f"w:{side}")
        border.set(qn("w:val"),   "single")
        border.set(qn("w:sz"),    "4")
        border.set(qn("w:space"), "0")
        border.set(qn("w:color"), color)
        tcBorders.append(border)
    tcPr.append(tcBorders)


def heading1(text: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after  = Pt(6)
    run = p.add_run(text)
    run.font.size  = Pt(16)
    run.font.bold  = True
    run.font.color.rgb = SAP_BLUE
    # bottom border
    pPr  = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bot  = OxmlElement("w:bottom")
    bot.set(qn("w:val"),   "single")
    bot.set(qn("w:sz"),    "6")
    bot.set(qn("w:space"), "1")
    bot.set(qn("w:color"), "00336600"[:-2] if False else "003366")
    pBdr.append(bot)
    pPr.append(pBdr)
    return p


def heading2(text: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run(text)
    run.font.size  = Pt(13)
    run.font.bold  = True
    run.font.color.rgb = MID_BLUE
    return p


def heading3(text: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after  = Pt(2)
    run = p.add_run(text)
    run.font.size  = Pt(11)
    run.font.bold  = True
    run.font.color.rgb = DARK_GREY
    return p


def body(text: str, bold_parts: list[tuple[str, bool]] | None = None):
    """Add a normal paragraph. Optionally pass bold_parts=[(text,bold),...]."""
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    if bold_parts:
        for t, b in bold_parts:
            r = p.add_run(t)
            r.font.size = Pt(10.5)
            r.font.bold = b
            r.font.color.rgb = DARK_GREY
    else:
        r = p.add_run(text)
        r.font.size = Pt(10.5)
        r.font.color.rgb = DARK_GREY
    return p


def bullet(text: str, level: int = 0):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent  = Cm(0.8 + level * 0.6)
    p.paragraph_format.space_after  = Pt(2)
    r = p.add_run(text)
    r.font.size = Pt(10.5)
    r.font.color.rgb = DARK_GREY
    return p


def info_box(title: str, lines: list[str], color_hex="E8F0FE", border_hex="003366"):
    """Shaded info / callout box."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    cell = tbl.cell(0, 0)
    set_cell_bg(cell, color_hex)
    set_cell_borders(cell, border_hex)
    cell.paragraphs[0].clear()
    hrun = cell.paragraphs[0].add_run(title)
    hrun.font.bold = True
    hrun.font.size = Pt(10.5)
    hrun.font.color.rgb = SAP_BLUE
    for line in lines:
        p   = cell.add_paragraph()
        r   = p.add_run(line)
        r.font.size = Pt(10)
        r.font.color.rgb = DARK_GREY
    doc.add_paragraph()  # spacer


def two_col_table(headers: list[str], rows: list[list[str]], col_widths: list[float] | None = None):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    # header row
    hdr = tbl.rows[0]
    for i, h in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_bg(cell, "003366")
        cell.paragraphs[0].clear()
        r = cell.paragraphs[0].add_run(h)
        r.font.bold  = True
        r.font.color.rgb = WHITE
        r.font.size  = Pt(10)
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    # data rows
    for ri, row in enumerate(rows):
        tr = tbl.add_row()
        bg = "F5F5F5" if ri % 2 == 0 else "FFFFFF"
        for ci, val in enumerate(row):
            cell = tr.cells[ci]
            set_cell_bg(cell, bg)
            set_cell_borders(cell, "DDDDDD")
            cell.paragraphs[0].clear()
            r = cell.paragraphs[0].add_run(val)
            r.font.size = Pt(10)
            r.font.color.rgb = DARK_GREY
    # column widths
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in tbl.rows:
                row.cells[i].width = Inches(w)
    doc.add_paragraph()


# ═══════════════════════════════════════════════════════════════════════════════
#  COVER PAGE
# ═══════════════════════════════════════════════════════════════════════════════

# Company / project banner
banner = doc.add_table(rows=1, cols=1)
banner.style = "Table Grid"
bc = banner.cell(0, 0)
set_cell_bg(bc, "003366")
bc.paragraphs[0].clear()
bc.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
br1 = bc.paragraphs[0].add_run("\n\nLTVF Cloud Dashboard\n")
br1.font.size  = Pt(28)
br1.font.bold  = True
br1.font.color.rgb = WHITE
br2 = bc.add_paragraph()
br2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2  = br2.add_run("Technical Architecture & Solution Design\n\n")
r2.font.size  = Pt(14)
r2.font.color.rgb = RGBColor(0xB3, 0xD1, 0xFF)
doc.add_paragraph()

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
for line in [
    f"Prepared by: Cloud Solutions Team",
    f"Date: {datetime.date.today().strftime('%d %B %Y')}",
    "Version: 1.0",
    "Classification: Business Confidential",
]:
    r = meta.add_run(line + "\n")
    r.font.size = Pt(11)
    r.font.color.rgb = DARK_GREY

doc.add_page_break()


# ═══════════════════════════════════════════════════════════════════════════════
#  1. EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
heading1("1.  Executive Summary")

body(
    "This document presents the technical architecture and implementation approach for the "
    "LTVF Cloud Dashboard — a modern, browser-based replacement for the SAP GUI transaction "
    "LTVR (program CNVLTVF3_RESULTS). The solution enables business users to access, analyse, "
    "and share Long-Term Value Forecast data without requiring the SAP GUI client to be installed, "
    "while keeping the authoritative data source as the existing SAP S/4HANA on-premise system."
)

info_box(
    "Business Objective",
    [
        "  •  Provide LTVF report access from any browser — desktop, tablet, or mobile.",
        "  •  Eliminate dependency on SAP GUI and SAP Logon for read-only reporting users.",
        "  •  Enable cloud-hosted visualisations, KPI dashboards, and data exports.",
        "  •  Maintain a single source of truth — all data continues to reside in SAP.",
    ]
)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  2. CURRENT STATE vs FUTURE STATE
# ═══════════════════════════════════════════════════════════════════════════════
heading1("2.  Current State vs Future State")

two_col_table(
    ["Dimension", "Current State (SAP GUI)", "Future State (Cloud Dashboard)"],
    [
        ["Access",         "SAP GUI client required on each PC",               "Any modern browser — no installation"],
        ["Users",          "SAP-licensed GUI users only",                       "Any authorised user via web URL"],
        ["Data Source",    "Direct SAP session (tcode LTVR)",                   "SAP OData API — same data, REST interface"],
        ["Visualisation",  "Fixed ALV grid layout only",                        "Interactive table, KPI cards, charts"],
        ["Export",         "Manual download via SAP menu",                      "One-click CSV / Excel export"],
        ["Availability",   "Requires VPN + SAP Logon",                          "Cloud-hosted, accessible from anywhere"],
        ["Maintenance",    "SAP transport requests for UI changes",              "Standard web deployment pipeline"],
    ],
    col_widths=[1.3, 2.5, 2.5]
)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  3. SOLUTION ARCHITECTURE OVERVIEW
# ═══════════════════════════════════════════════════════════════════════════════
heading1("3.  Solution Architecture Overview")

body(
    "The solution follows a standard three-tier web architecture. Each layer has a clear "
    "responsibility and communicates only with the layer immediately above or below it, "
    "ensuring security, maintainability, and scalability."
)

heading2("3.1  Architecture Diagram")

arch_lines = [
    "┌─────────────────────────────────────────────────────────────┐",
    "│              PRESENTATION LAYER  (Tier 3)                   │",
    "│         React SPA — runs in the user's browser              │",
    "│    AG Grid Table  │  KPI Cards  │  Charts  │  Filters       │",
    "└──────────────────────────┬──────────────────────────────────┘",
    "                           │  HTTPS  /api/*",
    "┌──────────────────────────▼──────────────────────────────────┐",
    "│              APPLICATION LAYER  (Tier 2)                    │",
    "│          Python FastAPI — cloud-hosted REST API             │",
    "│  /api/ltvf  │  /api/health  │  Auth middleware  │  Models  │",
    "└──────────────────────────┬──────────────────────────────────┘",
    "                           │  HTTPS  OData / Basic Auth",
    "┌──────────────────────────▼──────────────────────────────────┐",
    "│              DATA LAYER  (Tier 1)                           │",
    "│     SAP S/4HANA On-Premise  (QSL system, client 100)       │",
    "│   CNVLTVF3_RESULTS program  │  HANA DB  │  SAP Gateway     │",
    "└─────────────────────────────────────────────────────────────┘",
]

p = doc.add_paragraph()
r = p.add_run("\n".join(arch_lines))
r.font.name = "Courier New"
r.font.size = Pt(8.5)
r.font.color.rgb = DARK_GREY
doc.add_paragraph()

heading2("3.2  Data Flow")
for step in [
    "1.  User opens the dashboard URL in a browser — no SAP GUI, no VPN client required.",
    "2.  React frontend calls the FastAPI backend over HTTPS (/api/ltvf).",
    "3.  FastAPI authenticates against SAP using a dedicated read-only service account.",
    "4.  SAP Gateway returns LTVF hierarchy data as JSON via OData.",
    "5.  FastAPI normalises the data into a typed response model and returns it to the frontend.",
    "6.  React renders the hierarchical table, KPI cards, and charts in the browser.",
]:
    bullet(step)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  4. FRONTEND ARCHITECTURE — REACT
# ═══════════════════════════════════════════════════════════════════════════════
heading1("4.  Frontend Architecture")

heading2("4.1  Technology Choice — Why React")

body(
    "React was selected as the frontend framework after evaluating the leading options. "
    "The following table summarises the evaluation:"
)

two_col_table(
    ["Criterion", "React", "Angular", "Vue.js"],
    [
        ["Ecosystem maturity",       "Very large — 20M+ weekly downloads",  "Large — Google-backed",           "Large — community-driven"],
        ["SAP-compatible UI grids",  "AG Grid, SAP UI5 Web Components",      "AG Grid, DevExtreme",             "AG Grid (limited enterprise)"],
        ["TypeScript support",       "First-class via Vite + TSX",           "Built-in (required)",             "Good but optional"],
        ["Deployment size",          "Small SPA bundle (~200 KB gzip)",       "Larger (~400 KB)",                "Small (~150 KB)"],
        ["Talent availability",      "Highest globally",                      "High (enterprise)",               "High (Asia-Pacific)"],
        ["Learning curve",           "Low-moderate",                          "High (decorators, DI, modules)",  "Low"],
        ["Verdict",                  "✔  SELECTED",                           "Viable but heavier",              "Viable for smaller apps"],
    ],
    col_widths=[1.6, 2.0, 1.7, 1.7]
)

info_box(
    "Key Reason: AG Grid Integration",
    [
        "  The LTVF report has a multi-level hierarchical structure (cost categories → GL accounts →",
        "  business partners). AG Grid Community Edition provides native tree-data rendering,",
        "  column sorting, filtering, and virtualised scrolling for large datasets — features that",
        "  directly map to the SAP ALV grid behaviour business users already know.",
    ],
    color_hex="E8F4FD",
    border_hex="0A84FF"
)

heading2("4.2  Component Architecture")

body("The frontend is structured into focused, reusable components:")

two_col_table(
    ["Component", "Responsibility", "Key Library"],
    [
        ["Header",       "Displays report title, system ID, client, data source badge, refresh button",  "Lucide React icons"],
        ["KPICards",     "Four summary tiles: Net MRP, Global Amount, Delta, Line Item count",            "Tailwind CSS"],
        ["LTVFTable",    "Hierarchical AG Grid table — mirrors the SAP ALV layout with indented rows",    "AG Grid Community"],
        ["sapApi.ts",    "Axios HTTP client — single function to call /api/ltvf",                         "Axios"],
        ["App.tsx",      "Root component — owns data fetching state and wires all components together",   "React hooks"],
    ],
    col_widths=[1.4, 3.3, 1.6]
)

heading2("4.3  LTVF Table Design")

body(
    "The LTVF data is inherently hierarchical. The AG Grid table is configured to visually "
    "replicate the SAP tree structure:"
)
for item in [
    "Level 0 rows (e.g. Tool Costs, Business Partners) — bold, blue background, acts as group header.",
    "Level 1 rows (e.g. MAESTR DATA) — semi-bold, light blue background.",
    "Level 2 rows (e.g. GL accounts, cost centres) — standard weight, white background.",
    "Negative Delta values are highlighted in red; positive in green — matching SAP traffic-light convention.",
    "All numeric columns are right-aligned with thousand separators.",
]:
    bullet(item)

heading2("4.4  State Management")

body(
    "The application uses React's built-in hooks (useState, useEffect, useCallback) for state "
    "management. A dedicated third-party state library (Redux, Zustand) is deliberately not "
    "introduced at this stage — the data model is a single API response, making local component "
    "state sufficient. This keeps the bundle small and the codebase easy to maintain."
)

heading2("4.5  Build & Deployment")

two_col_table(
    ["Tool", "Purpose"],
    [
        ["Vite",         "Build tool — fast HMR in development, optimised production bundle"],
        ["TypeScript",   "Type safety across all components and API response models"],
        ["Tailwind CSS", "Utility-first CSS — consistent spacing, colour, and responsive layout"],
        ["Nginx",        "Production static file server + reverse proxy to backend API"],
        ["Docker",       "Containerised build — identical output in dev, staging, and production"],
    ],
    col_widths=[1.5, 5.0]
)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  5. BACKEND ARCHITECTURE — FASTAPI
# ═══════════════════════════════════════════════════════════════════════════════
heading1("5.  Backend Architecture")

heading2("5.1  Technology Choice — Why Python + FastAPI")

two_col_table(
    ["Criterion", "FastAPI (Python)", "Node.js / Express", "Java Spring Boot"],
    [
        ["SAP OData integration",  "requests / zeep libraries — mature SAP connectors",  "node-fetch, limited SAP SDKs",     "SAP Java Connector (JCo) — official"],
        ["Performance",            "Async I/O via Uvicorn — handles concurrent SAP calls", "Native async",                    "High throughput, heavier runtime"],
        ["Auto API docs",          "Built-in Swagger UI at /docs",                         "Manual (Swagger-jsdoc)",          "SpringDoc"],
        ["Data validation",        "Pydantic models — automatic request/response typing",  "Manual or Joi",                   "Bean validation"],
        ["Deployment size",        "~150 MB Docker image",                                 "~120 MB",                         "~350 MB+"],
        ["Verdict",                "✔  SELECTED",                                          "Viable",                          "Viable but heavier for read-only API"],
    ],
    col_widths=[1.7, 2.2, 1.7, 1.7]
)

heading2("5.2  API Endpoint Design")

two_col_table(
    ["Endpoint", "Method", "Description"],
    [
        ["/api/ltvf",    "GET", "Returns full LTVF hierarchy as JSON. Accepts report_id query parameter."],
        ["/api/health",  "GET", "Health check — returns status and whether mock mode is active."],
        ["/docs",        "GET", "Auto-generated Swagger UI for developer testing."],
    ],
    col_widths=[1.8, 0.8, 4.7]
)

heading2("5.3  SAP Integration Layer")

body(
    "The backend contains a dedicated SAP client module (sap_client.py) that is completely "
    "isolated from the API routing layer. This separation means the SAP connection can be "
    "updated, replaced, or mocked without touching the API endpoints or frontend."
)

for item in [
    "Protocol:  HTTPS OData (SAP Gateway /sap/opu/odata/)",
    "Auth:  HTTP Basic Auth using a dedicated read-only SAP service account.",
    "SAP Client:  100  (QSL quality system — to be promoted to production after testing).",
    "Response format:  JSON ($format=json) — no XML parsing required.",
    "Timeout:  30 seconds per request with error surfaced to the frontend as a 502.",
]:
    bullet(item)

heading2("5.4  Mock / Live Toggle")

body(
    "A single environment variable (USE_MOCK) controls whether the backend calls SAP or "
    "returns built-in mock data. This allows:"
)
for item in [
    "Frontend development to proceed independently of SAP availability.",
    "Demonstrations to business stakeholders before SAP connectivity is confirmed.",
    "Automated testing with deterministic data.",
    "Instant rollback to mock mode if the SAP OData service is unavailable.",
]:
    bullet(item)

info_box(
    "Switching to Live SAP Data",
    [
        "  1.  Rename .env.example  →  .env",
        "  2.  Fill in SAP_BASE_URL, SAP_USER, SAP_PASSWORD (provided by BASIS team)",
        "  3.  Set USE_MOCK=false",
        "  4.  Restart the backend container — no code changes required.",
    ],
    color_hex="E6F4EA",
    border_hex="16A34A"
)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  6. SECURITY ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════════
heading1("6.  Security Architecture")

body(
    "Security is a primary design concern given the sensitivity of financial cost data in LTVF reports."
)

two_col_table(
    ["Security Control", "Implementation"],
    [
        ["SAP credentials never exposed to browser",  "Credentials are stored only in backend environment variables — the React frontend never receives or transmits SAP passwords."],
        ["Dedicated read-only SAP service account",   "A technical user (not a personal account) with minimum required authorisation — display-only access to LTVF data."],
        ["HTTPS everywhere",                           "TLS enforced on both the frontend (Nginx) and backend-to-SAP OData calls. No plain HTTP in production."],
        ["CORS policy",                                "Backend restricts API access to the known frontend origin — prevents cross-site request abuse."],
        ["No direct HANA DB access",                  "The application never connects directly to the HANA database. All data flows through SAP Gateway OData — the authorised and audited path."],
        ["Personal user accounts not used",           "SAP user VANISHA (or any named user) is not used for API calls — prevents audit trail pollution and password-change disruptions."],
    ],
    col_widths=[2.3, 4.9]
)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  7. DEPLOYMENT ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════════════════
heading1("7.  Deployment Architecture")

heading2("7.1  Containerisation")

body(
    "Both the frontend and backend are packaged as Docker containers, enabling consistent "
    "deployment across development, staging, and production environments."
)

two_col_table(
    ["Container", "Base Image", "Exposed Port", "Role"],
    [
        ["backend",   "python:3.12-slim",  "8000",  "FastAPI + Uvicorn ASGI server"],
        ["frontend",  "nginx:alpine",       "80/443", "React SPA static files + API reverse proxy"],
    ],
    col_widths=[1.2, 1.8, 1.3, 2.9]
)

heading2("7.2  Cloud Hosting Options")

two_col_table(
    ["Platform", "Suitability", "Notes"],
    [
        ["Azure App Service",       "High",    "Best fit if organisation uses Microsoft Azure — integrates with Azure AD for SSO"],
        ["Azure Container Apps",    "High",    "Fully managed container hosting, scales to zero, low operational overhead"],
        ["AWS ECS / Fargate",       "High",    "Serverless containers on AWS — no VM management required"],
        ["Google Cloud Run",        "High",    "Per-request billing, zero cold-start containers"],
        ["On-premise Docker host",  "Medium",  "Option if cloud egress to SAP is restricted — deploy within corporate network"],
    ],
    col_widths=[2.0, 1.0, 4.3]
)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  8. PROJECT PHASES & TIMELINE
# ═══════════════════════════════════════════════════════════════════════════════
heading1("8.  Project Phases")

two_col_table(
    ["Phase", "Description", "Status", "Dependency"],
    [
        ["Phase 1 — Scaffold",       "Full frontend + backend built with mock LTVF data. Dashboard running locally.",  "Complete",    "None"],
        ["Phase 2 — SAP Connect",    "BASIS team provides OData service URL, port, and service account credentials.",  "In Progress", "BASIS team"],
        ["Phase 3 — Integration",    "sap_client.py wired to live SAP. USE_MOCK=false. End-to-end data validation.",   "Pending",     "Phase 2"],
        ["Phase 4 — Cloud Deploy",   "Containerised deployment to chosen cloud platform. HTTPS certificate applied.",  "Pending",     "Phase 3"],
        ["Phase 5 — UAT & Handover", "Business user acceptance testing. Documentation and training materials.",        "Pending",     "Phase 4"],
    ],
    col_widths=[1.7, 3.0, 1.1, 1.4]
)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  9. INFORMATION REQUIRED FROM BASIS TEAM
# ═══════════════════════════════════════════════════════════════════════════════
heading1("9.  Information Required from BASIS Team")

body(
    "The following items are required from the SAP BASIS / Basis team to complete Phase 2. "
    "All items are standard SAP Gateway configuration details."
)

two_col_table(
    ["#", "Item Required", "Example / Format"],
    [
        ["1", "SAP Gateway base URL and HTTPS port",              "https://sap-host.company.com:44300"],
        ["2", "OData service name for CNVLTVF3_RESULTS data",     "/sap/opu/odata/sap/CNVLTVF3_SRV"],
        ["3", "Read-only API service account (technical user)",   "SVC_LTVF_API"],
        ["4", "Service account password",                         "Shared via secure vault / KeePass"],
        ["5", "Network path — is SAP reachable from cloud?",      "VPN required / reverse proxy URL"],
        ["6", "SAP client number (confirmed)",                    "100  (already known from QSL)"],
    ],
    col_widths=[0.4, 3.3, 2.5]
)

doc.add_page_break()

# ═══════════════════════════════════════════════════════════════════════════════
#  10. BENEFITS SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
heading1("10.  Benefits Summary")

two_col_table(
    ["Benefit", "Detail"],
    [
        ["No SAP GUI required",         "Reporting users access LTVF data through a browser — reducing SAP licence pressure and IT support overhead for GUI installation."],
        ["Real-time SAP data",          "Dashboard always reflects the current state of SAP — no batch exports, no stale spreadsheets."],
        ["Improved readability",        "Colour-coded delta indicators, KPI summary cards, and sortable columns replace the fixed ALV grid."],
        ["Scalable access",             "The cloud-hosted URL can be shared with finance, operations, or management teams without SAP access provisioning."],
        ["Maintainable codebase",       "Standard web technologies (React, Python) — any web developer can maintain the dashboard without SAP ABAP knowledge."],
        ["Safe rollback",               "Mock mode ensures the dashboard remains operational even during SAP maintenance windows or OData service outages."],
        ["Audit-safe",                  "Read-only service account with no write permissions — zero risk of accidental SAP data modification through the dashboard."],
    ],
    col_widths=[2.0, 5.2]
)

# ═══════════════════════════════════════════════════════════════════════════════
#  11. GLOSSARY
# ═══════════════════════════════════════════════════════════════════════════════
heading1("11.  Glossary")

two_col_table(
    ["Term", "Definition"],
    [
        ["LTVF",      "Long-Term Value Forecast — SAP report showing cost breakdown by GL account, cost centre, and business partner."],
        ["LTVR",      "SAP transaction code for the LTVF results viewer (program CNVLTVF3_RESULTS)."],
        ["OData",     "Open Data Protocol — a REST-based standard used by SAP Gateway to expose SAP data as JSON/XML APIs."],
        ["FastAPI",   "A modern Python web framework for building REST APIs — chosen for speed, auto-documentation, and SAP OData compatibility."],
        ["React",     "A JavaScript library for building user interfaces — maintained by Meta, used by millions of web applications globally."],
        ["AG Grid",   "A high-performance data grid library used to render the hierarchical LTVF table in the browser."],
        ["SPA",       "Single-Page Application — a web app that loads once and updates dynamically without full page reloads."],
        ["BASIS",     "SAP Basis — the team responsible for SAP system administration, including Gateway configuration and service accounts."],
        ["QSL",       "Quality System Landscape — the SAP test/quality environment (as shown in the system status screenshot)."],
        ["HANA / HDB","SAP HANA Database — the in-memory database underpinning the S/4HANA system."],
    ],
    col_widths=[1.3, 5.9]
)

# ── Footer note ───────────────────────────────────────────────────────────────
doc.add_paragraph()
footer_p = doc.add_paragraph()
footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = footer_p.add_run(
    f"LTVF Cloud Dashboard — Technical Architecture Document  |  "
    f"Version 1.0  |  {datetime.date.today().strftime('%d %B %Y')}  |  Business Confidential"
)
r.font.size = Pt(8)
r.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
r.font.italic = True

# ── Save ──────────────────────────────────────────────────────────────────────
output_path = "C:/Users/I750407/ltvf-dashboard/LTVF_Cloud_Dashboard_Architecture.docx"
doc.save(output_path)
print(f"Document saved: {output_path}")
