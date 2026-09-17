import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import os

def create_element(name):
    return OxmlElement(name)

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = create_element('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def generate_docx():
    doc = docx.Document()

    # Page Setup - Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles & Fonts
    style_normal = doc.styles['Normal']
    font_normal = style_normal.font
    font_normal.name = 'Calibri'
    font_normal.size = Pt(11)
    font_normal.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # Document Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run("INTELLIBUS AI PLATFORM")
    run_title.font.size = Pt(26)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A) # Deep Blue

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("Comprehensive Technical Documentation & System Architecture")
    run_sub.font.size = Pt(14)
    run_sub.font.color.rgb = RGBColor(0x25, 0x63, 0xEB)
    p_sub.paragraph_format.space_after = Pt(24)

    # Horizontal Divider Line / Box
    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        run = p.add_run(text)
        run.font.size = Pt(18)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        return p

    # 1. Executive Summary
    add_heading_1("1. Executive Project Summary")
    doc.add_paragraph(
        "IntelliBus AI is an enterprise-grade, real-time campus transportation intelligence system designed to modernize fleet management, "
        "passenger experiences, and driver telemetry. Powered by FastAPI, PostgreSQL, WebSockets, React 19, and Machine Learning algorithms, "
        "the platform delivers sub-second vehicle location updates, predictive AI arrival countdowns, automated stop geofencing, driver safety auditing, "
        "and digital QR boarding validation."
    )

    # 2. System Architecture & Flowchart
    add_heading_1("2. System Architecture & Data Flow Diagram")
    doc.add_paragraph(
        "The architecture operates on a reactive micro-event pipeline where telemetry flows seamlessly from mobile devices and simulators to real-time WebSocket subscribers."
    )

    flowchart_box = doc.add_paragraph()
    flowchart_box.paragraph_format.space_before = Pt(6)
    flowchart_box.paragraph_format.space_after = Pt(12)
    run_fc = flowchart_box.add_run(
        "+-----------------------------------------------------------------------------------+\n"
        "|                             INTELLIBUS AI SYSTEM ARCHITECTURE                      |\n"
        "+-----------------------------------------------------------------------------------+\n"
        "                                          |\n"
        "            +-----------------------------+-----------------------------+\n"
        "            |                                                           |\n"
        "  [Driver Mobile Phone GPS]                                   [Telemetry Simulator]\n"
        "  (navigator.geolocation API)                                 (ml/telemetry_simulator.py)\n"
        "            |                                                           |\n"
        "            +-----------------------------+-----------------------------+\n"
        "                                          |\n"
        "                                 WebSocket Connection\n"
        "                             /ws/live-location/{trip_id}\n"
        "                                          |\n"
        "                                          v\n"
        "                        +-----------------------------------+\n"
        "                        | FastAPI Telemetry Broker          |\n"
        "                        | (ConnectionManager & Broadcast)   |\n"
        "                        +-----------------------------------+\n"
        "                                          |\n"
        "           +------------------------------+------------------------------+\n"
        "           |                              |                              |\n"
        "           v                              v                              v\n"
        "  [Geofence Engine]             [Machine Learning Engine]         [PostgreSQL DB]\n"
        " (50m Proximity Check)          - ETA Predictor (Haversine)       - Users, Buses\n"
        " (backend/app/geofence.py)      - Route Optimizer (Dijkstra)      - Routes, Trips\n"
        "                                - Driver Safety Auditor           - GPS Logs, Alerts\n"
        "           |                              |                              |\n"
        "           +------------------------------+------------------------------+\n"
        "                                          |\n"
        "                                          v\n"
        "                        +-----------------------------------+\n"
        "                        | React 19 Frontend User Dashboards |\n"
        "                        | - Student (Map, ETA, AI Voice, QR)|\n"
        "                        | - Driver (Console, GPS Broadcaster)|\n"
        "                        | - Staff (Fleet Ops, Analytics)    |\n"
        "                        | - Admin (Fleet Config, Users, PWA)|\n"
        "                        +-----------------------------------+\n"
    )
    run_fc.font.name = 'Consolas'
    run_fc.font.size = Pt(9.5)
    run_fc.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)

    # 3. How to Run the Project
    add_heading_1("3. How to Run the Project (Step-by-Step)")
    doc.add_paragraph(
        "The project features root launcher scripts that start the FastAPI Backend and Vite Frontend simultaneously in separate console windows."
    )

    add_heading_2("Launch Commands:")
    p_cmd = doc.add_paragraph()
    r_cmd = p_cmd.add_run(
        "Option A: Windows Command Prompt (Root Directory)\n"
        "   .\\start.bat\n\n"
        "Option B: Windows PowerShell (Root Directory)\n"
        "   .\\start.ps1\n\n"
        "Option C: Manual Backend Launch\n"
        "   cd backend\n"
        "   .venv\\Scripts\\python.exe -m uvicorn app.main:app --reload --port 8000\n\n"
        "Option D: Manual Frontend Launch\n"
        "   cd frontend\n"
        "   npm run dev\n"
    )
    r_cmd.font.name = 'Consolas'
    r_cmd.font.size = Pt(9.5)

    add_heading_2("Access URLs & Ports:")
    table_urls = doc.add_table(rows=3, cols=3)
    table_urls.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_urls.autofit = False

    headers = ["Service", "URL", "Description"]
    for i, h in enumerate(headers):
        cell = table_urls.cell(0, i)
        cell.paragraphs[0].text = h
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_background(cell, "1E3A8A")
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    data_urls = [
        ["Frontend UI", "http://localhost:5173", "Main Application (Student, Driver, Staff, Admin)"],
        ["Backend REST API", "http://localhost:8000/api/v1/openapi.json", "Swagger / OpenAPI Documentation"]
    ]
    for row_idx, row_data in enumerate(data_urls, start=1):
        for col_idx, cell_value in enumerate(row_data):
            cell = table_urls.cell(row_idx, col_idx)
            cell.paragraphs[0].text = cell_value

    # Demo Credentials Table
    add_heading_2("Default Demo Credentials:")
    table_creds = doc.add_table(rows=5, cols=3)
    table_creds.alignment = WD_TABLE_ALIGNMENT.CENTER

    headers_c = ["Role", "Email", "Password"]
    for i, h in enumerate(headers_c):
        cell = table_creds.cell(0, i)
        cell.paragraphs[0].text = h
        cell.paragraphs[0].runs[0].font.bold = True
        set_cell_background(cell, "2563EB")
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    creds_data = [
        ["Student", "student@campus.edu", "password123"],
        ["Driver", "driver@campus.edu", "password123"],
        ["Staff / Dispatcher", "staff@campus.edu", "password123"],
        ["Administrator", "admin@campus.edu", "password123"]
    ]
    for row_idx, row_data in enumerate(creds_data, start=1):
        for col_idx, cell_value in enumerate(row_data):
            cell = table_creds.cell(row_idx, col_idx)
            cell.paragraphs[0].text = cell_value

    # 4. Security Status & Architecture
    add_heading_1("4. Security Status & Compliance Report")
    doc.add_paragraph(
        "Security is implemented natively across all layers of the IntelliBus AI stack:"
    )

    doc.add_paragraph("• Authentication Standard: OAuth2 JSON Web Token (JWT) using HS256 algorithm and 7-day token expiration.")
    doc.add_paragraph("• Cryptographic Password Hashing: PBKDF2-HMAC-SHA256 with 100,000 iterations and dedicated salt key.")
    doc.add_paragraph("• Role-Based Access Control (RBAC): Enforced at both API router dependency levels (FastAPI) and frontend React Router guards (ProtectedRoute.tsx).")
    doc.add_paragraph("• CORS Security: Configured middleware with strict header validation.")
    doc.add_paragraph("• WebSocket Security: Connection validation per trip ID.")

    # 5. Core Modules Breakdown
    add_heading_1("5. Core Modules Technical Breakdown")

    doc.add_paragraph("• Machine Learning Core (ml/): ETA Predictor regression model, Dijkstra shortest path route optimizer, and driver safety anomaly auditor.")
    doc.add_paragraph("• Real-Time WebSockets: Low-latency location broadcast connecting driver mobile GPS to listening student tracking maps.")
    doc.add_paragraph("• AI Voice Assistant: Speech recognition and synthesis widget enabling natural verbal interaction for bus arrival inquiries.")
    doc.add_paragraph("• Express QR Pass: Dynamic QR boarding pass with token generation and countdown timers.")
    doc.add_paragraph("• PWA Mobile Installation: Service worker asset caching and web manifest for native mobile installation.")

    # Save Document
    output_path = os.path.join(os.path.dirname(__file__), "IntelliBus_AI_Project_Documentation.docx")
    doc.save(output_path)
    print(f"Generated Word Document at: {output_path}")

if __name__ == "__main__":
    generate_docx()
