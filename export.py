import os
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import database

def export_chat_as_markdown(uid: str, chat_title: str, messages: List[Dict[str, Any]]) -> str:
    """
    Exports a conversation to a Markdown (.md) document and saves it
    to data/users/<uid>/exports/. Returns the Markdown text.
    """
    export_dir = database.get_user_dir(uid, "exports")
    safe_title = "".join(c for c in chat_title if c.isalnum() or c in (" ", "-", "_")).strip() or "chat"
    filename = f"{safe_title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    file_path = os.path.join(export_dir, filename)

    lines = [
        f"# {chat_title}",
        f"*Exported on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} via LocalGPT Pro*",
        "",
        "---",
        ""
    ]

    for m in messages:
        role = "👤 **User**" if m["role"] == "user" else "🤖 **Assistant (LocalGPT)**"
        created = m.get("created_at", "")
        if created:
            lines.append(f"### {role} *({created[:16].replace('T', ' ')})*")
        else:
            lines.append(f"### {role}")
        
        lines.append(m["content"])
        
        # Sources if present
        sources = m.get("metadata", {}).get("sources", [])
        if sources:
            lines.append("")
            lines.append("**Sources:**")
            for s in sources:
                lines.append(f"- 📄 `{s['source']}` (Page {s['page']})")
        lines.append("")
        lines.append("---")
        lines.append("")

    md_content = "\n".join(lines)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    return md_content

def export_chat_as_pdf(uid: str, chat_title: str, messages: List[Dict[str, Any]]) -> bytes:
    """
    Exports a conversation to a styled PDF using ReportLab and saves it
    to data/users/<uid>/exports/. Returns the PDF bytes.
    """
    export_dir = database.get_user_dir(uid, "exports")
    safe_title = "".join(c for c in chat_title if c.isalnum() or c in (" ", "-", "_")).strip() or "chat"
    filename = f"{safe_title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    file_path = os.path.join(export_dir, filename)

    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0284c7'),
        spaceAfter=6
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=14
    )
    user_style = ParagraphStyle(
        'UserLabel',
        parent=styles['Heading3'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=10,
        spaceAfter=4
    )
    assistant_style = ParagraphStyle(
        'AILabel',
        parent=styles['Heading3'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0369a1'),
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=8
    )
    source_style = ParagraphStyle(
        'Sources',
        parent=styles['Italic'],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=6
    )

    story = [
        Paragraph(chat_title, title_style),
        Paragraph(f"Exported on {datetime.now().strftime('%B %d, %Y at %H:%M:%S')} • LocalGPT Pro", meta_style),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceAfter=14)
    ]

    for m in messages:
        is_user = (m["role"] == "user")
        label = "👤 User" if is_user else "🤖 LocalGPT Assistant"
        story.append(Paragraph(label, user_style if is_user else assistant_style))
        
        # Replace newlines for ReportLab
        clean_content = m["content"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
        story.append(Paragraph(clean_content, body_style))

        sources = m.get("metadata", {}).get("sources", [])
        if sources:
            src_text = "<b>Sources cited:</b> " + ", ".join([f"{s['source']} (p. {s['page']})" for s in sources])
            story.append(Paragraph(src_text, source_style))

        story.append(Spacer(1, 6))

    doc.build(story)

    with open(file_path, "rb") as f:
        pdf_bytes = f.read()

    return pdf_bytes

