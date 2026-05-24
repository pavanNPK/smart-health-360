#!/usr/bin/env python3
"""Generate a self-contained Smart Health 360 project-flow PPTX.

This avoids third-party dependencies by writing the minimal OpenXML package
directly. The output is intended as a shareable presentation companion to
docs/README.md and docs/SMART_HEALTH_360_PRESENTATION.html.
"""

from __future__ import annotations

from datetime import datetime, timezone
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


OUT = Path(__file__).resolve().parents[1] / "docs" / "SMART_HEALTH_360_PROJECT_FLOW.pptx"

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
}

SLIDE_W = 12192000
SLIDE_H = 6858000


def emu(inches: float) -> int:
    return int(inches * 914400)


def xml_text(value: str) -> str:
    return escape(value, quote=False)


def run(text: str, size: int = 18, color: str = "17202A", bold: bool = False) -> str:
    b = ' b="1"' if bold else ""
    return (
        f'<a:r><a:rPr lang="en-US" sz="{size * 100}"{b}>'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
        f'</a:rPr><a:t xml:space="preserve">{xml_text(text)}</a:t></a:r>'
    )


def paragraph(text: str, size: int = 18, color: str = "17202A", bold: bool = False) -> str:
    return f"<a:p>{run(text, size=size, color=color, bold=bold)}</a:p>"


def textbox(shape_id: int, x: float, y: float, w: float, h: float, lines: list[str], *,
            size: int = 18, color: str = "17202A", bold_first: bool = False,
            fill: str | None = None, line: str | None = None, radius: str = "roundRect") -> str:
    fill_xml = (
        f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>'
        if fill
        else '<a:noFill/>'
    )
    line_xml = (
        f'<a:ln w="9525"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>'
        if line
        else '<a:ln><a:noFill/></a:ln>'
    )
    paras = []
    for i, line_text in enumerate(lines):
        line_size = size + 2 if bold_first and i == 0 else size
        paras.append(paragraph(line_text, line_size, color, bold_first and i == 0))
    return f"""
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="{shape_id}" name="TextBox {shape_id}"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>
          <a:prstGeom prst="{radius}"><a:avLst/></a:prstGeom>
          {fill_xml}
          {line_xml}
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" anchor="t" lIns="152400" tIns="114300" rIns="152400" bIns="114300"/>
          <a:lstStyle/>
          {''.join(paras)}
        </p:txBody>
      </p:sp>
    """


def rect(shape_id: int, x: float, y: float, w: float, h: float, fill: str, line: str = "FFFFFF") -> str:
    return f"""
      <p:sp>
        <p:nvSpPr><p:cNvPr id="{shape_id}" name="Shape {shape_id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr>
          <a:xfrm><a:off x="{emu(x)}" y="{emu(y)}"/><a:ext cx="{emu(w)}" cy="{emu(h)}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>
          <a:ln><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>
        </p:spPr>
      </p:sp>
    """


def slide_xml(title: str, kicker: str, cards: list[tuple[str, list[str], str]], *,
              lead: str = "", footer: str = "", wide_body: list[str] | None = None,
              table: list[list[str]] | None = None,
              pre_lines: list[str] | None = None) -> str:
    shapes: list[str] = []
    sid = 2
    shapes.append(rect(sid, 0, 0, 13.333, 0.12, "0F766E")); sid += 1
    shapes.append(textbox(sid, 0.55, 0.35, 4.4, 0.35, [kicker.upper()], size=10, color="0F766E", bold_first=True)); sid += 1
    shapes.append(textbox(sid, 0.55, 0.75, 11.6, 0.95, [title], size=28, color="17202A", bold_first=True)); sid += 1
    if lead:
        shapes.append(textbox(sid, 0.55, 1.6, 11.6, 0.72, [lead], size=15, color="5D6D7E")); sid += 1

    top = 2.35 if lead else 1.95
    if wide_body:
        shapes.append(textbox(sid, 0.75, top, 11.8, 3.8, wide_body, size=18, color="334155", fill="F8FAFC", line="D9E2EC", bold_first=True)); sid += 1

    if table:
        row_h = 0.42
        col_w = 11.8 / len(table[0])
        y = top
        for r, row in enumerate(table):
            x = 0.75
            fill = "EEF2F7" if r == 0 else "FFFFFF"
            color = "273444" if r == 0 else "5D6D7E"
            for cell in row:
                shapes.append(textbox(sid, x, y, col_w, row_h, [cell], size=10, color=color, fill=fill, line="D9E2EC", bold_first=(r == 0), radius="rect")); sid += 1
                x += col_w
            y += row_h

    if pre_lines is not None:
        shapes.append(textbox(sid, 0.55, top, 12.2, 3.85, pre_lines, size=8, color="17202A", fill="F8FAFC", line="D9E2EC", radius="rect")); sid += 1

    if cards:
        cols = min(3, len(cards))
        card_w = (12.2 - (cols - 1) * 0.25) / cols
        card_h = 3.7 if len(cards) <= 3 else 1.78
        for idx, (heading, body, accent) in enumerate(cards):
            row = idx // cols
            col = idx % cols
            x = 0.55 + col * (card_w + 0.25)
            y = top + row * (card_h + 0.22)
            lines = [heading] + [f"- {item}" for item in body]
            shapes.append(textbox(sid, x, y, card_w, card_h, lines, size=12, color="17202A", fill=accent, line="D9E2EC", bold_first=True)); sid += 1

    shapes.append(textbox(sid, 0.55, 6.32, 10.0, 0.25, [footer], size=8, color="94A3B8", bold_first=True)); sid += 1
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="{NS['a']}" xmlns:r="{NS['r']}" xmlns:p="{NS['p']}">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{SLIDE_W}" cy="{SLIDE_H}"/><a:chOff x="0" y="0"/><a:chExt cx="{SLIDE_W}" cy="{SLIDE_H}"/></a:xfrm></p:grpSpPr>
      {''.join(shapes)}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>"""


SLIDES = [
    dict(title="Smart Health 360 Project Flow", kicker="Project Flow",
         lead="Patient entry, doctor consultation, records, VIS_A / VIS_B visibility, audit handling, waiting room, offline payment, and future trusted-person operations.",
         cards=[("Core Idea", ["Digital hospital workflow", "Medical history in one place", "Controlled incognito records"], "ECFDF5")],
         footer="Smart Health 360 - Project Flow"),
    dict(title="What The Application Does", kicker="Overview",
         cards=[("Reception", ["Registers or searches patient", "Assigns doctor", "Supports waiting-room flow"], "EFF6FF"),
                ("Doctor", ["Sees assigned patients", "Opens history before consultation", "Adds diagnosis and prescription"], "ECFDF5"),
                ("Visibility", ["Records saved as VIS_A or VIS_B", "VIS_B can be hidden during audit", "Audit log tracks important actions"], "FFFBEB")],
         footer="One-line project summary"),
    dict(title="Main Users And Responsibilities", kicker="Users",
         cards=[("Super Admin", ["Controls users, clinics, audit, permissions", "Creates doctors and receptionists", "Controls emergency hide/restore"], "FEF3C7"),
                ("Doctor", ["Sees assigned patients", "Checks history and prescriptions", "Adds diagnosis, advice, and follow-up"], "DBEAFE"),
                ("Receptionist", ["Registers patients", "Assigns doctor", "Maintains basic patient information"], "D1FAE5")],
         footer="Main actors"),
    dict(title="Ramesh Kumar Walks Into The Hospital", kicker="Real-world story",
         wide_body=["1. Ramesh reaches reception.",
                    "2. Receptionist registers him or searches existing profile.",
                    "3. Receptionist assigns Dr. Arjun.",
                    "4. Ramesh appears in the doctor's patient list or waiting-room screen.",
                    "5. Doctor opens profile and sees details, previous visits, diagnosis history, prescriptions, medicines, X-ray/lab attachments, and notes.",
                    "6. Doctor saves the medical record or prescription as VIS_A or VIS_B.",
                    "7. Later, authorized users can change VIS_A to VIS_B or VIS_B to VIS_A."],
         cards=[], footer="Simple real-world story"),
    dict(title="VIS_A And VIS_B", kicker="Record visibility",
         cards=[("VIS_A", ["Normal visible record", "Regular hospital workflow", "Normal exports based on role", "Suitable for regular outpatient history"], "DCFCE7"),
                ("VIS_B", ["Incognito/sensitive record", "Controlled access", "Can be hidden during audit mode", "Protected from normal export"], "FEF3C7")],
         lead="In discussions these may be described as normal/incognito records. In the application and project documentation, the terms are VIS_A and VIS_B.",
         footer="Visibility model"),
    dict(title="VIS_A Real Example", kicker="Normal record",
         cards=[("Patient", ["Ramesh Kumar", "Visit reason: fever and cough", "Doctor: Dr. Arjun", "Status: VIS_A"], "FFFFFF"),
                ("Meaning", ["Normal hospital record", "Doctor can see it", "Reception can see it based on permission", "Can be included in standard patient history and exports"], "DCFCE7")],
         footer="VIS_A example"),
    dict(title="VIS_B Real Example", kicker="Incognito record",
         cards=[("Patient", ["Suresh Reddy", "Visit reason: sensitive internal consultation", "Doctor: Dr. Arjun", "Status: VIS_B"], "FFFFFF"),
                ("Meaning", ["Stored but treated as sensitive", "Authorized doctors/admins can see it in normal mode", "Can be hidden from normal screens and exports during inspection"], "FEF3C7")],
         footer="VIS_B example"),
    dict(title="Changing VIS_A To VIS_B And Back", kicker="Visibility lifecycle",
         cards=[("Normal To Incognito", ["Ramesh starts as VIS_A", "Hospital later decides record should be incognito", "Authorized user changes VIS_A to VIS_B"], "ECFDF5"),
                ("Incognito To Normal", ["Suresh starts as VIS_B", "Hospital later decides it can be normal history", "Authorized user changes VIS_B to VIS_A"], "EFF6FF"),
                ("Why It Matters", ["Final visibility may be decided later", "System supports controlled movement", "Audit tracking records the change"], "FFFBEB")],
         footer="Visibility changes"),
    dict(title="Complete Start-To-End Flow", kicker="Flow",
         wide_body=["Patient arrives -> Reception searches or creates patient -> Reception assigns doctor -> Patient appears in doctor's workflow/waiting list -> Doctor opens patient details -> Doctor checks records, medicines, prescriptions, and reports -> Doctor consults patient -> Record/prescription/attachment is saved -> Record is marked VIS_A or VIS_B -> Hospital continues treatment history -> VIS_B can be hidden during audit -> VIS_B can be restored after audit."],
         cards=[], footer="Complete project flow"),
    dict(title="Role-Based Flow Tree", kicker="Roles",
         cards=[("Super Admin", ["Creates doctors and receptionists", "Manages clinics/areas/hierarchy", "Views audit logs", "Controls emergency hide/restore"], "FEF3C7"),
                ("Receptionist", ["Registers patient", "Assigns doctor", "Updates patient details", "Adds visit support and attachments where allowed"], "D1FAE5"),
                ("Doctor", ["Sees assigned patients", "Opens patient profile", "Reads visit and medicine history", "Adds diagnosis and prescription"], "DBEAFE")],
         footer="Role tree"),
    dict(title="Doctor Consultation Flow", kicker="Consultation",
         cards=[("1. Login", ["Doctor logs in and sees doctor dashboard"], "FFFFFF"),
                ("2. Queue", ["Doctor sees assigned patients and who is waiting"], "FFFFFF"),
                ("3. Details", ["Doctor opens profile and checks previous history"], "FFFFFF"),
                ("4. Current Visit", ["Doctor enters complaint, diagnosis, medicines, tests, follow-up, notes"], "FFFFFF"),
                ("5. Save", ["Record saved as VIS_A or VIS_B"], "FFFFFF"),
                ("6. History", ["Next visit continues with full context"], "FFFFFF")],
         footer="Consultation flow"),
    dict(title="Patient Queue / Waiting List Example", kicker="Queue",
         table=[["Queue", "Patient", "Reason", "Assigned Doctor", "Status"],
                ["1", "Ramesh Kumar", "Fever", "Dr. Arjun", "Waiting"],
                ["2", "Priya Sharma", "Follow-up", "Dr. Arjun", "Waiting"],
                ["3", "Suresh Reddy", "Consultation", "Dr. Arjun", "Waiting"]],
         cards=[], lead="This can become a complete digital waiting-room screen so the doctor can see who is next and open the patient profile before consultation starts.",
         footer="Waiting list example"),
    dict(title="Patient Details Module", kicker="Patient details",
         cards=[("Settings", ["Name, age/date of birth, gender", "Contact details", "Assigned doctor", "Status/visibility where applicable"], "EFF6FF"),
                ("Records", ["New visit, follow-up, continuation", "Disease summary, diagnosis, doctor notes", "Created date and visibility status"], "ECFDF5"),
                ("Prescription", ["Symptoms, diagnosis, medicines", "Dosage and food instructions", "Tests/X-rays, follow-up, doctor approval"], "FFFBEB"),
                ("Medicine / X-Ray", ["Medicine files", "X-ray reports", "Lab attachments", "Prescription documents"], "F8FAFC")],
         footer="Patient details module"),
    dict(title="Incognito / Audit Handling Flow", kicker="Audit",
         cards=[("Normal Mode", ["Doctors access assigned data", "Reception handles front desk", "Admin monitors system data", "VIS_A normal, VIS_B permission based"], "ECFDF5"),
                ("Emergency Hide", ["Trusted Super Admin enables hide", "VIS_B hidden from normal views", "Normal screens and exports show only VIS_A", "Audit log stores who/when/why"], "FEF3C7"),
                ("Restore Mode", ["Trusted Super Admin restores records", "VIS_B returns to controlled availability", "Audit log stores restore activity"], "EFF6FF")],
         footer="Incognito and audit handling"),
    dict(title="Offline Payment Plan", kicker="Payments",
         cards=[("Approach", ["Offline payment mode", "Receptionist records payment status manually", "Cash, outside UPI, card machine, or other offline method", "Payment reference or notes can be maintained"], "EFF6FF"),
                ("Example", ["Ramesh pays consultation fee by cash", "Receptionist marks payment as received", "Doctor continues consultation without waiting for online gateway confirmation"], "ECFDF5")],
         footer="Offline payment"),
    dict(title="Future Trusted-Person Operating Model", kicker="Trusted control",
         cards=[("Trusted User Can", ["Control VIS_A and VIS_B", "Manage inspection mode", "Manage doctors and receptionists", "Monitor audit logs", "Restore hidden records"], "FEF3C7"),
                ("Why It Matters", ["Incognito feature should not be available to every staff member", "It should be controlled only by trusted hospital users"], "FFFFFF")],
         footer="Trusted-person model"),
    dict(title="Waiting-Room Optimization Plan", kicker="Waiting room",
         cards=[("Doctor Screen Can Show", ["Who is waiting", "Who is next", "Which patient is in consultation", "Visit type and assigned doctor", "Previous summary, pending reports, follow-up status"], "EFF6FF"),
                ("Waiting Flow", ["Reception registers patient", "Patient enters waiting list", "Doctor screen shows next patient", "Doctor opens details before calling patient", "Consultation starts", "Prescription and record saved"], "ECFDF5")],
         footer="Waiting-room digitalization"),
    dict(title="Medicine History Maintenance", kicker="Medicine history",
         cards=[("Doctor Can Check", ["Previous medicine names", "Dosage", "Number of days", "Instructions", "Diagnosis connected to medicine", "Follow-up advice", "Current or older visit"], "ECFDF5"),
                ("Example", ["Priya returns for gastric pain", "Doctor checks medicine given last month", "Doctor avoids unnecessary repetition and changes treatment based on history"], "FFFFFF")],
         footer="Medicine and prescription history"),
    dict(title="Who Can See What", kicker="Permissions",
         table=[["Action", "Super Admin", "Doctor", "Receptionist"],
                ["Create users", "Yes", "No", "No"],
                ["Create patient", "Usually no/admin controlled", "No", "Yes"],
                ["Assign doctor", "Yes", "No", "Yes during registration"],
                ["See patient profile", "Yes", "Based on rules", "Based on rules"],
                ["Change VIS_A/VIS_B", "Yes", "If authorized", "Limited/controlled"],
                ["Emergency hide/restore", "Yes", "No", "No"],
                ["View audit logs", "Full", "Scoped", "Own/scoped"]],
         cards=[], footer="Permission matrix"),
    dict(title="Export And Audit Safety", kicker="Audit safety",
         cards=[("Export Rules", ["Receptionist export should be restricted", "Doctor export should be related to assigned patients", "Super Admin export can be broader but should be audited", "Emergency hide mode exports should show only VIS_A"], "EFF6FF"),
                ("Audit Logged Actions", ["Login", "Patient creation", "Record creation", "Visibility change", "Export", "Emergency hide", "Emergency restore"], "FEF3C7")],
         footer="Export and audit safety"),
    dict(title="Two Patient Scenarios", kicker="Examples",
         cards=[("Ramesh Kumar - VIS_A", ["Registered and assigned to Dr. Arjun", "Doctor diagnoses fever and cough", "Paracetamol, cough syrup, follow-up advice", "Record saved as VIS_A", "Later visits continue with history"], "DCFCE7"),
                ("Suresh Reddy - VIS_B", ["Registered and assigned to Dr. Arjun", "Doctor completes consultation", "Hospital decides record should be incognito", "Record saved as VIS_B", "Hidden during inspection and restored after audit"], "FEF3C7")],
         footer="End-to-end examples"),
    dict(title="Final Project Vision", kicker="Vision",
         cards=[("Digital Operations", ["Digital reception", "Digital doctor workflow", "Digital waiting room"], "EFF6FF"),
                ("Medical Continuity", ["Patient medical history in one place", "Prescription and medicine history", "Attachment/report storage"], "ECFDF5"),
                ("Controlled Safety", ["Offline payment handling", "Controlled incognito patient records", "Audit-safe visibility management", "Trusted-person control"], "FEF3C7")],
         lead="The doctor should know who is next, open the full patient history on screen, treat faster with better context, maintain medicine and prescription history, and the hospital should control which records remain normal and which records are handled as incognito.",
         footer="Final project vision"),
]


def append_readme_reference_slides() -> None:
    readme = (Path(__file__).resolve().parents[1] / "docs" / "README.md").read_text(encoding="utf-8")
    lines = readme.splitlines()
    chunk_size = 28
    total = (len(lines) + chunk_size - 1) // chunk_size
    for index in range(total):
        chunk = lines[index * chunk_size:(index + 1) * chunk_size]
        SLIDES.append(
            dict(
                title=f"Full README Reference ({index + 1}/{total})",
                kicker="Complete content",
                lead="These appendix slides carry the complete README content line-by-line for sharing inside the PowerPoint file.",
                cards=[],
                pre_lines=chunk,
                footer="Full README reference",
            )
        )


def content_types(slide_count: int) -> str:
    overrides = "\n".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, slide_count + 1)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  {overrides}
</Types>"""


def presentation_xml(slide_count: int) -> str:
    sld_ids = "\n".join(
        f'<p:sldId id="{255 + i}" r:id="rId{i + 1}"/>'
        for i in range(1, slide_count + 1)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="{NS['a']}" xmlns:r="{NS['r']}" xmlns:p="{NS['p']}" saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>{sld_ids}</p:sldIdLst>
  <p:sldSz cx="{SLIDE_W}" cy="{SLIDE_H}" type="wide"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>"""


def presentation_rels(slide_count: int) -> str:
    rels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>']
    rels.extend(
        f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>'
        for i in range(1, slide_count + 1)
    )
    rels.append(f'<Relationship Id="rId{slide_count + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>')
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  {''.join(rels)}
</Relationships>"""


ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""


def core_xml() -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Smart Health 360 Project Flow</dc:title>
  <dc:creator>Smart Health 360</dc:creator>
  <cp:lastModifiedBy>Smart Health 360</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>"""


APP_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Smart Health 360</Application>
  <PresentationFormat>Widescreen</PresentationFormat>
  <Slides>22</Slides>
</Properties>"""


MASTER_XML = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="{NS['a']}" xmlns:r="{NS['r']}" xmlns:p="{NS['p']}">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>"""

MASTER_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>"""

LAYOUT_XML = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="{NS['a']}" xmlns:r="{NS['r']}" xmlns:p="{NS['p']}" type="blank" preserve="1">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>"""

LAYOUT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>"""

THEME_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Smart Health 360">
  <a:themeElements>
    <a:clrScheme name="Smart Health 360">
      <a:dk1><a:srgbClr val="17202A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="334155"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>
      <a:accent1><a:srgbClr val="0F766E"/></a:accent1><a:accent2><a:srgbClr val="1D4ED8"/></a:accent2>
      <a:accent3><a:srgbClr val="B45309"/></a:accent3><a:accent4><a:srgbClr val="15803D"/></a:accent4>
      <a:accent5><a:srgbClr val="9F1239"/></a:accent5><a:accent6><a:srgbClr val="5D6D7E"/></a:accent6>
      <a:hlink><a:srgbClr val="1D4ED8"/></a:hlink><a:folHlink><a:srgbClr val="0F766E"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Arial"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Clean"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme>
  </a:themeElements>
</a:theme>"""


def main() -> None:
    append_readme_reference_slides()
    slide_count = len(SLIDES)
    with ZipFile(OUT, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types(slide_count))
        zf.writestr("_rels/.rels", ROOT_RELS)
        zf.writestr("docProps/core.xml", core_xml())
        zf.writestr("docProps/app.xml", APP_XML.replace("<Slides>22</Slides>", f"<Slides>{slide_count}</Slides>"))
        zf.writestr("ppt/presentation.xml", presentation_xml(slide_count))
        zf.writestr("ppt/_rels/presentation.xml.rels", presentation_rels(slide_count))
        zf.writestr("ppt/slideMasters/slideMaster1.xml", MASTER_XML)
        zf.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", MASTER_RELS)
        zf.writestr("ppt/slideLayouts/slideLayout1.xml", LAYOUT_XML)
        zf.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", LAYOUT_RELS)
        zf.writestr("ppt/theme/theme1.xml", THEME_XML)
        for i, data in enumerate(SLIDES, start=1):
            zf.writestr(f"ppt/slides/slide{i}.xml", slide_xml(**data))
    print(f"Created {OUT}")


if __name__ == "__main__":
    main()
