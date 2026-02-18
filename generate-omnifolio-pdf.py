"""
OmniFolio Proprietary Systems — PDF Generator
Generates a cohesive technical brief covering all proprietary intelligence services.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import (
    HexColor, white, black
)
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon, Circle
from reportlab.graphics import renderPDF
from reportlab.platypus.flowables import Flowable
import math
import datetime

# ── Palette ────────────────────────────────────────────────────────────────────
BG          = HexColor('#0A0A0A')
SURFACE     = HexColor('#111111')
SURFACE2    = HexColor('#141414')
BORDER      = HexColor('#1F1F1F')
ACCENT_PUR  = HexColor('#A855F7')
ACCENT_BLUE = HexColor('#3B82F6')
ACCENT_GRN  = HexColor('#10B981')
ACCENT_AMB  = HexColor('#F59E0B')
ACCENT_RED  = HexColor('#EF4444')
ACCENT_CYAN = HexColor('#06B6D4')
ACCENT_INDIGO = HexColor('#6366F1')
TEXT_PRI    = HexColor('#F3F4F6')
TEXT_SEC    = HexColor('#9CA3AF')
TEXT_MUT    = HexColor('#4B5563')
LIGHT_GRAY  = HexColor('#E5E7EB')

PAGE_W, PAGE_H = A4

# ── Custom Flowables ───────────────────────────────────────────────────────────

class ColoredRect(Flowable):
    """Solid color rectangle."""
    def __init__(self, w, h, color, radius=4):
        super().__init__()
        self.w, self.h, self.color, self.radius = w, h, color, radius
    def wrap(self, *args): return (self.w, self.h)
    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.w, self.h, self.radius, fill=1, stroke=0)


class HeroHeader(Flowable):
    """Full-width dark hero header."""
    def __init__(self, width):
        super().__init__()
        self.width = width
        self.height = 200

    def wrap(self, *args):
        return (self.width, self.height)

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Background gradient simulation (dark)
        c.setFillColor(HexColor('#050505'))
        c.rect(0, 0, w, h, fill=1, stroke=0)

        # Decorative purple glow blobs
        for (cx, cy, r, alpha) in [
            (w*0.1, h*0.8, 100, 0.12),
            (w*0.85, h*0.3, 120, 0.10),
            (w*0.5, h*0.5, 90, 0.07),
        ]:
            c.setFillColorRGB(0.66, 0.33, 0.97, alpha)
            c.circle(cx, cy, r, fill=1, stroke=0)

        # Top accent line (gradient-like multi-segment)
        colors_line = [ACCENT_PUR, ACCENT_BLUE, ACCENT_GRN, ACCENT_AMB]
        seg_w = w / len(colors_line)
        for i, col in enumerate(colors_line):
            c.setStrokeColor(col)
            c.setLineWidth(3)
            c.line(i*seg_w, h-2, (i+1)*seg_w, h-2)

        # OMNIFOLIO wordmark
        c.setFillColor(TEXT_PRI)
        c.setFont('Helvetica-Bold', 28)
        c.drawString(28, h - 48, 'OMNI')
        c.setFillColor(ACCENT_PUR)
        c.drawString(28 + c.stringWidth('OMNI', 'Helvetica-Bold', 28), h - 48, 'FOLIO')

        # Tagline
        c.setFont('Helvetica', 9)
        c.setFillColor(TEXT_SEC)
        c.drawString(28, h - 64, 'Proprietary Intelligence Platform  ·  Copyright OmniFolio. All rights reserved.')

        # Title
        c.setFillColor(TEXT_PRI)
        c.setFont('Helvetica-Bold', 20)
        title = 'Proprietary Intelligence Services'
        c.drawString(28, h - 104, title)

        # Subtitle
        c.setFont('Helvetica', 11)
        c.setFillColor(TEXT_SEC)
        c.drawString(28, h - 124, 'Technical Overview  ·  Architecture, Scoring Algorithms & Data Pipelines')

        # Date
        c.setFont('Helvetica', 8)
        c.setFillColor(TEXT_MUT)
        date_str = datetime.date.today().strftime('%B %d, %Y')
        c.drawRightString(w - 28, h - 124, date_str)

        # Horizontal rule
        c.setStrokeColor(BORDER)
        c.setLineWidth(1)
        c.line(28, 24, w - 28, 24)

        # Service count badges
        services = [
            ('6', 'Proprietary Services', ACCENT_PUR),
            ('0', 'Third-Party APIs', ACCENT_GRN),
            ('100%', 'Public Data Sources', ACCENT_BLUE),
        ]
        bx = 28
        for (val, lbl, col) in services:
            c.setFillColor(col)
            c.roundRect(bx, 34, 80, 20, 4, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont('Helvetica-Bold', 9)
            c.drawCentredString(bx + 40, 43, f'{val}  {lbl}')
            bx += 90


class SectionBanner(Flowable):
    """Dark section title banner with colored left accent bar."""
    def __init__(self, width, number, title, subtitle, accent_color):
        super().__init__()
        self.width = width
        self.height = 54
        self.number = number
        self.title = title
        self.subtitle = subtitle
        self.accent = accent_color

    def wrap(self, *args):
        return (self.width, self.height)

    def draw(self):
        c = self.canv
        w, h = self.width, self.height

        # Background
        c.setFillColor(SURFACE)
        c.roundRect(0, 0, w, h, 6, fill=1, stroke=0)

        # Left accent bar
        c.setFillColor(self.accent)
        c.roundRect(0, 0, 5, h, 3, fill=1, stroke=0)

        # Number badge background (dim version of accent)
        hex_str = self.accent.hexval().replace('0x', '').zfill(6)
        r, g, b = int(hex_str[0:2],16)/255, int(hex_str[2:4],16)/255, int(hex_str[4:6],16)/255
        c.setFillColorRGB(r, g, b, 0.15)
        c.circle(28, h/2, 13, fill=1, stroke=0)
        c.setFillColor(self.accent)
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(28, h/2 - 4, str(self.number))

        # Title
        c.setFillColor(TEXT_PRI)
        c.setFont('Helvetica-Bold', 14)
        c.drawString(52, h - 22, self.title)

        # Subtitle
        c.setFillColor(TEXT_SEC)
        c.setFont('Helvetica', 9)
        c.drawString(52, 14, self.subtitle)


class ScoreGauge(Flowable):
    """Semi-circle gauge for a score metric."""
    def __init__(self, score, label, color, size=90):
        super().__init__()
        self.score = score  # 0–100
        self.label = label
        self.color = color
        self.size = size

    def wrap(self, *args):
        return (self.size, self.size * 0.7)

    def draw(self):
        c = self.canv
        cx, cy = self.size / 2, self.size * 0.22
        r = self.size * 0.38

        # Background arc track
        c.setStrokeColor(SURFACE2)
        c.setLineWidth(8)
        c.arc(cx - r, cy - r, cx + r, cy + r, 0, 180)

        # Filled arc
        angle = int(self.score * 1.8)  # 0..180 degrees
        c.setStrokeColor(self.color)
        c.setLineWidth(8)
        if angle > 0:
            c.arc(cx - r, cy - r, cx + r, cy + r, 0, angle)

        # Score text
        c.setFillColor(TEXT_PRI)
        c.setFont('Helvetica-Bold', 16)
        c.drawCentredString(cx, cy + r * 0.45, str(self.score))

        # Label
        c.setFillColor(TEXT_SEC)
        c.setFont('Helvetica', 7)
        c.drawCentredString(cx, cy - 12, self.label)


class DataFlowDiagram(Flowable):
    """Horizontal data flow: source → engine → output."""
    def __init__(self, width, steps, accent_color):
        super().__init__()
        self.width = width
        self.height = 64
        self.steps = steps  # list of (icon_char, label)
        self.accent = accent_color

    def wrap(self, *args):
        return (self.width, self.height)

    def draw(self):
        c = self.canv
        n = len(self.steps)
        box_w = 90
        box_h = 40
        gap = (self.width - n * box_w) / (n + 1)
        cy = self.height / 2

        for i, (icon, label) in enumerate(self.steps):
            bx = gap + i * (box_w + gap)
            by = cy - box_h / 2

            # Box background
            c.setFillColor(SURFACE2)
            c.roundRect(bx, by, box_w, box_h, 5, fill=1, stroke=0)

            # Box border
            c.setStrokeColor(self.accent)
            c.setLineWidth(0.5)
            c.roundRect(bx, by, box_w, box_h, 5, fill=0, stroke=1)

            # Icon
            c.setFillColor(self.accent)
            c.setFont('Helvetica-Bold', 10)
            c.drawCentredString(bx + box_w / 2, by + box_h - 13, icon)

            # Label
            c.setFillColor(TEXT_SEC)
            c.setFont('Helvetica', 7)
            c.drawCentredString(bx + box_w / 2, by + 7, label)

            # Arrow
            if i < n - 1:
                ax = bx + box_w + gap / 2
                c.setStrokeColor(self.accent)
                c.setLineWidth(1.5)
                c.line(bx + box_w + 4, cy, ax - 4, cy)
                # arrowhead
                c.setFillColor(self.accent)
                p = c.beginPath()
                p.moveTo(ax - 4, cy - 4)
                p.lineTo(ax - 4, cy + 4)
                p.lineTo(ax + 2, cy)
                p.close()
                c.drawPath(p, fill=1, stroke=0)


class ScoreBreakdownBar(Flowable):
    """Horizontal stacked bar showing score components."""
    def __init__(self, width, components):
        # components: list of (label, weight, color)
        super().__init__()
        self.width = width
        self.height = 32
        self.components = components

    def wrap(self, *args):
        return (self.width, self.height)

    def draw(self):
        c = self.canv
        total = sum(w for _, w, _ in self.components)
        x = 0
        bar_h = 12
        bar_y = self.height - bar_h - 4

        for label, weight, color in self.components:
            seg_w = (weight / total) * self.width
            c.setFillColor(color)
            c.roundRect(x, bar_y, seg_w - 1, bar_h, 2, fill=1, stroke=0)
            x += seg_w

        # Legend below
        lx = 0
        for label, weight, color in self.components:
            c.setFillColor(color)
            c.rect(lx, 2, 6, 6, fill=1, stroke=0)
            c.setFillColor(TEXT_SEC)
            c.setFont('Helvetica', 6)
            c.drawString(lx + 8, 3, f'{label} {int(weight*100)}%')
            lx += (self.width / len(self.components))


class FeatureGrid(Flowable):
    """2-column feature grid."""
    def __init__(self, width, features, accent_color):
        super().__init__()
        self.width = width
        self.features = features  # list of (title, desc)
        self.accent = accent_color
        rows = math.ceil(len(features) / 2)
        self.height = rows * 36 + 4

    def wrap(self, *args):
        return (self.width, self.height)

    def draw(self):
        c = self.canv
        col_w = (self.width - 8) / 2
        row_h = 36

        for i, (title, desc) in enumerate(self.features):
            col = i % 2
            row = i // 2
            bx = col * (col_w + 8)
            by = self.height - (row + 1) * row_h + 2

            # Background card
            c.setFillColor(SURFACE2)
            c.roundRect(bx, by, col_w, row_h - 2, 4, fill=1, stroke=0)

            # Dot
            c.setFillColor(self.accent)
            c.circle(bx + 12, by + row_h / 2 - 1, 3, fill=1, stroke=0)

            # Title
            c.setFillColor(TEXT_PRI)
            c.setFont('Helvetica-Bold', 8)
            c.drawString(bx + 22, by + 22, title)

            # Desc
            c.setFillColor(TEXT_SEC)
            c.setFont('Helvetica', 7)
            c.drawString(bx + 22, by + 10, desc)


# ── Document Setup ─────────────────────────────────────────────────────────────

def build_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=18*mm,
        rightMargin=18*mm,
        topMargin=14*mm,
        bottomMargin=14*mm,
        title='OmniFolio Proprietary Intelligence Services',
        author='OmniFolio',
    )

    styles = getSampleStyleSheet()
    W = PAGE_W - 36*mm  # usable width

    # ── Custom styles ────────────────────────────────────────────────────────────
    def S(name, base='Normal', **kw):
        s = ParagraphStyle(name, parent=styles[base], **kw)
        return s

    body = S('Body', fontSize=9, textColor=TEXT_SEC, leading=14,
              fontName='Helvetica', spaceAfter=4)
    body_light = S('BodyLight', fontSize=8, textColor=TEXT_MUT, leading=12,
                   fontName='Helvetica')
    h3 = S('H3', fontSize=11, textColor=TEXT_PRI, leading=16, fontName='Helvetica-Bold',
            spaceBefore=10, spaceAfter=4)
    h4 = S('H4', fontSize=9, textColor=TEXT_PRI, leading=14, fontName='Helvetica-Bold',
            spaceBefore=6, spaceAfter=2)
    caption = S('Caption', fontSize=7, textColor=TEXT_MUT, leading=10,
                fontName='Helvetica', alignment=TA_CENTER)
    mono = S('Mono', fontSize=8, textColor=ACCENT_GRN, leading=12,
             fontName='Courier', backColor=HexColor('#0D1F0D'), leftIndent=6)
    tag = S('Tag', fontSize=7, textColor=ACCENT_PUR, leading=10,
            fontName='Helvetica-Bold')
    label_r = S('LabelR', fontSize=8, textColor=TEXT_SEC, leading=12,
                fontName='Helvetica', alignment=TA_RIGHT)

    story = []
    sp = lambda h=6: Spacer(1, h)

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 1 — HERO + EXECUTIVE SUMMARY + TOC
    # ═══════════════════════════════════════════════════════════════════════════

    story.append(HeroHeader(W))
    story.append(sp(18))

    # Executive Summary
    story.append(Paragraph('Executive Summary', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'OmniFolio is a next-generation financial intelligence platform built entirely on '
        '<b>public government data sources</b> — zero paid third-party APIs, zero data vendor '
        'lock-in. Every intelligence layer is proprietary: the scoring models, the data pipelines, '
        'the caching architecture, and the front-end components are all original work. '
        'The platform aggregates data from the SEC EDGAR, US Senate LDA, USAspending.gov, '
        'US Bureau of Labor Statistics, Federal Reserve, and other authoritative public sources, '
        'transforming raw filings into actionable investment signals.',
        body
    ))
    story.append(sp(8))

    # Summary stats table
    stats_data = [
        ['Service', 'Data Source', 'Proprietary Score', 'Refresh Cadence'],
        ['Economic Calendar', 'BLS · Fed · ECB · BoE · BoJ', '—', 'On-demand seeding'],
        ['IPO Calendar', 'SEC EDGAR (S-1/F-1/424B4)', '—', '6-hour background'],
        ['Earnings Calendar', 'SEC EDGAR (8-K/10-Q/10-K)', '—', '6-hour background'],
        ['Earnings Surprises', 'SEC EDGAR + DB cache', 'OES Score', 'Per-ticker refresh'],
        ['Insider Sentiment', 'SEC EDGAR Form 4', 'OIC Score', 'Market-hours TTL'],
        ['Senate Lobbying', 'US Senate LDA API', 'OLI Score', '7-day TTL'],
        ['USA Spending', 'USAspending.gov API v2', 'OGI Score', '7-day TTL'],
    ]
    col_ws = [W*0.22, W*0.30, W*0.20, W*0.28]
    t = Table(stats_data, colWidths=col_ws)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_PUR),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('ROUNDEDCORNERS', [4]),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ('ALIGN', (3,0), (3,-1), 'CENTER'),
    ]))
    story.append(t)
    story.append(sp(8))

    story.append(Paragraph('Architecture Principle', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))

    arch_steps = [
        ('GOV', 'Public\nGov. API'),
        ('→', ''),
        ('PARSE', 'OmniFolio\nParser'),
        ('→', ''),
        ('SCORE', 'Proprietary\nAlgorithm'),
        ('→', ''),
        ('DB', 'Supabase\nCache'),
        ('→', ''),
        ('UI', 'React\nComponent'),
    ]
    # Simplified: use only meaningful steps
    story.append(DataFlowDiagram(W, [
        ('GOV', 'Public Gov. API'),
        ('PARSE', 'OmniFolio Parser'),
        ('SCORE', 'Scoring Engine'),
        ('DB', 'Supabase Cache'),
        ('UI', 'React Component'),
    ], ACCENT_PUR))
    story.append(sp(4))
    story.append(Paragraph(
        'All services follow the same architecture: raw public filings are ingested, '
        'parsed, and fed into proprietary scoring algorithms. Results are stored in '
        'Supabase with smart TTL caching (stale-while-revalidate). '
        'The React UI layer always shows data immediately from cache while '
        'background revalidation keeps it fresh — sub-100ms API responses.',
        body
    ))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 2 — ECONOMIC CALENDAR
    # ═══════════════════════════════════════════════════════════════════════════

    story.append(SectionBanner(W, '01', 'Economic Calendar',
                               'Proprietary macro event engine — zero external dependencies', ACCENT_AMB))
    story.append(sp(10))

    story.append(Paragraph('Overview', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'The OmniFolio Economic Calendar is a fully self-contained macro event scheduler. '
        'Rather than consuming paid calendar APIs (ForexFactory, Trading Economics, Bloomberg), '
        'we maintain our own curated database of recurring event rules compiled from official '
        'government release schedules. This is exactly how institutional platforms operate. '
        'The engine generates accurate event dates for any time horizon, works offline, '
        'never rate-limits, and costs zero per API call.',
        body
    ))
    story.append(sp(8))

    story.append(Paragraph('Data Sources', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))

    src_data = [
        ['Authority', 'Examples', 'Coverage'],
        ['US BLS', 'CPI, PPI, NFP, Jobless Claims', 'Monthly / Weekly'],
        ['US Census Bureau', 'Retail Sales, Durable Goods, Housing Starts', 'Monthly'],
        ['Federal Reserve', 'FOMC Rate Decision, Fed Chair Press Conf.', '~6-week intervals'],
        ['BEA', 'GDP Advance, PCE, Personal Income', 'Quarterly / Monthly'],
        ['ECB', 'Interest Rate Decision', 'Every 6 weeks'],
        ['Bank of England', 'MPC Rate Decision', '8× per year'],
        ['Bank of Japan', 'Monetary Policy Decision', '8× per year'],
        ['ISM', 'Manufacturing PMI, Services PMI', 'Monthly'],
    ]
    cws = [W*0.30, W*0.45, W*0.25]
    t2 = Table(src_data, colWidths=cws)
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_AMB),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t2)
    story.append(sp(8))

    story.append(Paragraph('Scheduling Engine', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'Events are defined by <b>recurring rule types</b> that deterministically compute '
        'the correct calendar date for any given month. Rules handle edge cases like '
        '"last business day adjustment" (weekend/holiday shift), "Nth weekday of month", '
        '"every N weeks from anchor date" (FOMC pattern), and simple weekly cadences.',
        body
    ))
    story.append(sp(4))

    rules_data = [
        ['Rule Type', 'Used For', 'Example'],
        ['weekday-of-month', 'Fixed occurrence in a month', 'FOMC — 1st Tue of Jan/Mar/May…'],
        ['day-of-month', 'Fixed day number', 'CPI — 15th of each month (adjusted)'],
        ['weekly', 'Every week same day', 'Initial Jobless Claims — every Thursday'],
        ['interval-weeks', 'N-week spacing from anchor', 'Fed rate decisions — every ~6 weeks'],
    ]
    cws2 = [W*0.22, W*0.32, W*0.46]
    t3 = Table(rules_data, colWidths=cws2)
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_AMB),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t3)
    story.append(sp(8))

    story.append(Paragraph('Key Features', h4))
    story.append(FeatureGrid(W, [
        ('Impact Classification', 'High / Medium / Low  ·  Color-coded alerts'),
        ('Multi-Country Coverage', 'US · EU · UK · Japan  ·  Flag & timezone support'),
        ('Forecast vs Actual', 'Live DB updates with % delta vs prior period'),
        ('Zero Rate Limits', 'All data is in Supabase — no external calls at runtime'),
        ('Persistent Cache', 'Seeded into DB once, served from cache forever'),
        ('Infinite Scale', 'N concurrent users, same sub-5ms DB response'),
    ], ACCENT_AMB))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 3 — IPO CALENDAR
    # ═══════════════════════════════════════════════════════════════════════════

    story.append(SectionBanner(W, '02', 'Proprietary IPO Calendar',
                               'Real-time IPO pipeline sourced directly from SEC EDGAR filings', ACCENT_PUR))
    story.append(sp(10))

    story.append(Paragraph('Overview', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'The OmniFolio IPO Calendar ingests registration statements directly from the SEC '
        'Electronic Data Gathering, Analysis, and Retrieval system (EDGAR). No IPO data '
        'vendor is needed — the SEC publishes all S-1, F-1, and 424B4 filings publicly. '
        'OmniFolio parses these filings, filters noise, enriches with company metadata, '
        'and maintains a live database of upcoming and recent IPO events.',
        body
    ))
    story.append(sp(8))

    story.append(DataFlowDiagram(W, [
        ('EDGAR', 'SEC EDGAR\nEFTS Search'),
        ('FILTER', 'SPAC/ETF\nFilter'),
        ('ENRICH', 'Company\nEnrichment'),
        ('SEED', 'Supabase\nDB Seed'),
        ('UI', 'IPO Calendar\nComponent'),
    ], ACCENT_PUR))
    story.append(sp(6))

    story.append(Paragraph('Data Pipeline', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))

    pipeline_data = [
        ['Step', 'Action', 'Detail'],
        ['1', 'SEC EDGAR EFTS Fetch', 'Query full-text search index for S-1, F-1, 424B4 filing types'],
        ['2', 'SPAC/ETF Filter', 'Exclude blank-check companies, investment trusts, secondary offerings'],
        ['3', 'Company Enrichment', 'Hit SEC submissions API for name, SIC, exchange, sector, industry'],
        ['4', 'Public Co. Filter', 'Exclude companies already filing 10-K/10-Q (already public)'],
        ['5', 'Status Classification', 'filed → expected → priced → withdrawn based on filing type'],
        ['6', 'Supabase Upsert', 'Idempotent upsert into ipo_calendar table (conflict on accession)'],
        ['7', 'Background Refresh', '6-hour cooldown; stale-while-revalidate for instant UI'],
    ]
    cws3 = [W*0.05, W*0.28, W*0.67]
    t4 = Table(pipeline_data, colWidths=cws3)
    t4.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_PUR),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (0,-1), ACCENT_PUR),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (1,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (1,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (1,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t4)
    story.append(sp(8))

    story.append(Paragraph('Filing Types & Status Mapping', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))

    filing_data = [
        ['Filing Type', 'Meaning', 'IPO Status'],
        ['S-1', 'Initial domestic registration statement', 'filed'],
        ['S-1/A', 'Amendment to S-1 (price update, schedule update)', 'expected (if price range)'],
        ['F-1', 'Initial registration — foreign private issuer', 'filed'],
        ['F-1/A', 'Amendment to F-1', 'expected (if price range)'],
        ['424B4', 'Final prospectus — IPO is confirmed & priced', 'priced'],
        ['RW', 'Registration withdrawal', 'withdrawn'],
    ]
    cws4 = [W*0.15, W*0.55, W*0.30]
    t5 = Table(filing_data, colWidths=cws4)
    t5.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_PUR),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t5)
    story.append(sp(8))

    story.append(Paragraph('Key Features', h4))
    story.append(FeatureGrid(W, [
        ('Live SEC Pipeline', 'Direct EDGAR EFTS — no IPO data vendor needed'),
        ('Sector Classification', 'SIC→sector mapping from SEC submissions API'),
        ('Price Discovery', 'Price range and final offer price from filings'),
        ('Deal Size Calc', 'Shares × Price = deal size in real-time'),
        ('4-Hour Local Cache', 'Browser localStorage cache for instant re-render'),
        ('10-min Auto-Refresh', 'Background polling — always fresh without page reload'),
    ], ACCENT_PUR))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 4 — EARNINGS CALENDAR + EARNINGS SURPRISES
    # ═══════════════════════════════════════════════════════════════════════════

    story.append(SectionBanner(W, '03', 'Earnings Calendar & Surprises',
                               'SEC EDGAR-powered earnings tracker with EPS/Revenue surprise scoring', ACCENT_CYAN))
    story.append(sp(10))

    story.append(Paragraph('Earnings Calendar', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'Like the IPO Calendar, the Earnings Calendar sources all data from SEC EDGAR rather '
        'than paid earnings data vendors. The pipeline ingests 8-K Item 2.02 filings '
        '(earnings announcements), 10-Q filings, and 10-K filings. EPS and revenue estimates '
        'are stored alongside actuals to compute surprise metrics in real-time.',
        body
    ))
    story.append(sp(8))

    story.append(DataFlowDiagram(W, [
        ('EDGAR', 'SEC EDGAR\n8-K / 10-Q / 10-K'),
        ('PARSE', 'EPS + Revenue\nExtraction'),
        ('SCORE', 'Surprise\n% Calc'),
        ('DB', 'Supabase\nearnings_calendar'),
        ('UI', 'Earnings\nComponent'),
    ], ACCENT_CYAN))
    story.append(sp(8))

    story.append(Paragraph('Earnings Surprises View', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'The Earnings Surprises View is a per-ticker deep-dive component showing up to '
        '12 quarters of historical EPS performance. It renders a bar chart of actuals vs '
        'estimates, highlights beats (green) and misses (red), and computes the '
        '<b>OmniFolio Earnings Score (OES)</b> — a composite signal of earnings quality.',
        body
    ))
    story.append(sp(8))

    surprise_data = [
        ['Metric', 'Calculation', 'Signal'],
        ['EPS Beat %', '(Actual − Estimate) / |Estimate| × 100', 'Green if > 0, Red if < 0'],
        ['Revenue Beat %', '(Actual − Estimate) / Estimate × 100', 'Green if > 0, Red if < 0'],
        ['Surprise Streak', 'Consecutive quarters of EPS beats', 'Quality indicator'],
        ['Beat Rate (TTM)', '% of last 4Q where EPS beat estimate', 'Reliability score'],
        ['Magnitude Score', 'Avg |surprise %| over trailing 8Q', 'Volatility of guidance'],
    ]
    cws5 = [W*0.25, W*0.45, W*0.30]
    t6 = Table(surprise_data, colWidths=cws5)
    t6.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_CYAN),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t6)
    story.append(sp(8))

    story.append(Paragraph('Key Features', h4))
    story.append(FeatureGrid(W, [
        ('Filing Type Badges', '8-K · 10-Q · 10-K — color-coded per type'),
        ('Pre/Post Market Flag', 'Before open / after close reporting time'),
        ('12-Quarter Chart', 'Visual EPS actual vs estimate bar chart'),
        ('Sector Filters', 'Filter events by GICS sector from SIC codes'),
        ('Expandable Rows', 'Inline drill-down with SEC filing link'),
        ('Stale-While-Revalidate', 'Instant render from cache; silent background refresh'),
    ], ACCENT_CYAN))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 5 — INSIDER SENTIMENT (OIC)
    # ═══════════════════════════════════════════════════════════════════════════

    story.append(SectionBanner(W, '04', 'Insider Sentiment  ·  OIC Score',
                               'OmniFolio Insider Confidence Score from SEC EDGAR Form 4 filings', ACCENT_INDIGO))
    story.append(sp(10))

    story.append(Paragraph('Overview', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'The OIC (OmniFolio Insider Confidence) Score is a multi-factor signal derived '
        'exclusively from SEC EDGAR Form 4 filings — the mandatory disclosure insiders '
        '(officers, directors, 10%+ shareholders) must file within 2 business days of any '
        'transaction. No insider data vendor is used. The score aggregates monthly transaction '
        'history, weights by insider role, detects cluster buying/selling, and normalises '
        'to a 0–100 scale.',
        body
    ))
    story.append(sp(8))

    story.append(Paragraph('OIC Scoring Formula', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        '<b>OIC = clamp( NPR×0.25 + VWS×0.30 + IRW×0.20 + CS×0.15 + CB×0.10, 0, 100 )</b>',
        S('Formula', fontSize=10, textColor=ACCENT_INDIGO, fontName='Courier',
          backColor=HexColor('#0A0A1A'), leftIndent=8, leading=16)
    ))
    story.append(sp(6))

    story.append(ScoreBreakdownBar(W, [
        ('NPR  25%', 0.25, ACCENT_INDIGO),
        ('VWS  30%', 0.30, ACCENT_BLUE),
        ('IRW  20%', 0.20, ACCENT_PUR),
        ('CS   15%', 0.15, ACCENT_GRN),
        ('CB   10%', 0.10, ACCENT_AMB),
    ]))
    story.append(sp(8))

    oic_data = [
        ['Component', 'Abbr.', 'Weight', 'Formula / Logic'],
        ['Net Purchase Ratio', 'NPR', '25%', '(buys − sells) / (buys + sells) × 100'],
        ['Value Weighted Signal', 'VWS', '30%', '(buyValue − sellValue) / (buyValue + sellValue) × 100'],
        ['Insider Role Weight', 'IRW', '20%', 'Role-weighted buy/sell ratio (CEO > Director > 10%+ Owner)'],
        ['Cluster Signal', 'CS', '15%', '+20 bonus when 3+ insiders act in same month (cluster flag)'],
        ['Consistency Bonus', 'CB', '10%', 'Sustained buying/selling signal across consecutive months'],
    ]
    cws6 = [W*0.28, W*0.07, W*0.08, W*0.57]
    t7 = Table(oic_data, colWidths=cws6)
    t7.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_INDIGO),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('TEXTCOLOR', (2,1), (2,-1), ACCENT_INDIGO),
        ('FONTNAME', (2,1), (2,-1), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (1,0), (2,-1), 'CENTER'),
    ]))
    story.append(t7)
    story.append(sp(8))

    story.append(Paragraph('Score Labels', h4))
    story.append(sp(4))
    label_data = [
        ['OIC Range', 'Label', 'Signal'],
        ['75 – 100', 'Strong Buy', 'Heavy cluster buying, officers leading, sustained trend'],
        ['55 – 74',  'Buy',        'Net buying across multiple roles, above-average spend'],
        ['35 – 54',  'Neutral',    'Mixed signals, small net position, no cluster flag'],
        ['15 – 34',  'Sell',       'Net selling dominates, value-weighted negative'],
        ['0 – 14',   'Strong Sell','Heavy cluster selling, officer-led, sustained exits'],
    ]
    cws7 = [W*0.20, W*0.20, W*0.60]
    t8 = Table(label_data, colWidths=cws7)
    t8.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_INDIGO),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('TEXTCOLOR', (1,1), (1,1), ACCENT_GRN),
        ('TEXTCOLOR', (1,2), (1,2), HexColor('#6EE7B7')),
        ('TEXTCOLOR', (1,3), (1,3), TEXT_SEC),
        ('TEXTCOLOR', (1,4), (1,4), HexColor('#FCA5A5')),
        ('TEXTCOLOR', (1,5), (1,5), ACCENT_RED),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t8)
    story.append(sp(8))

    story.append(Paragraph('Key Features', h4))
    story.append(FeatureGrid(W, [
        ('Role Weighting', 'CEO/CFO/COO buys carry 2× weight vs directors'),
        ('Cluster Detection', 'Flag when 3+ distinct insiders act in the same month'),
        ('Monthly Aggregation', 'Up to 24-month rolling history per ticker'),
        ('Trend Analysis', 'improving / declining / stable — 3-month momentum'),
        ('Transaction Drill-down', 'Per-transaction table with accession number & SEC link'),
        ('Market-Hours TTL', 'Cache expires at market close; refresh on open next day'),
    ], ACCENT_INDIGO))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 6 — SENATE LOBBYING (OLI)
    # ═══════════════════════════════════════════════════════════════════════════

    story.append(SectionBanner(W, '05', 'Senate Lobbying  ·  OLI Score',
                               'OmniFolio Lobbying Influence Score from US Senate LDA Database', ACCENT_AMB))
    story.append(sp(10))

    story.append(Paragraph('Overview', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'The OLI (OmniFolio Lobbying Influence) Score quantifies a corporation\'s political '
        'influence through the lens of its lobbying activity. Data is sourced from the '
        'US Senate Lobbying Disclosure Act (LDA) Database — a public API that requires '
        'no authentication and publishes all registered lobbying filings since 1999. '
        'The score captures spend magnitude, issue breadth, government reach, lobbyist '
        'deployment, consistency, and trend direction.',
        body
    ))
    story.append(sp(8))

    story.append(Paragraph('OLI Scoring Formula', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        '<b>OLI = clamp( SM×0.30 + IB×0.15 + GR×0.15 + LC×0.10 + CO×0.15 + TR×0.15, 0, 100 )</b>',
        S('FormulaAmb', fontSize=10, textColor=ACCENT_AMB, fontName='Courier',
          backColor=HexColor('#1A1500'), leftIndent=8, leading=16)
    ))
    story.append(sp(6))

    story.append(ScoreBreakdownBar(W, [
        ('SM  30%', 0.30, ACCENT_AMB),
        ('IB  15%', 0.15, ACCENT_GRN),
        ('GR  15%', 0.15, ACCENT_CYAN),
        ('LC  10%', 0.10, ACCENT_INDIGO),
        ('CO  15%', 0.15, ACCENT_PUR),
        ('TR  15%', 0.15, ACCENT_RED),
    ]))
    story.append(sp(8))

    oli_data = [
        ['Component', 'Abbr.', 'Weight', 'Formula / Logic'],
        ['Spend Magnitude', 'SM', '30%', 'Total $ spent (log-scaled) relative to peer companies'],
        ['Issue Breadth', 'IB', '15%', 'Number of distinct LDA issue area codes lobbied'],
        ['Government Reach', 'GR', '15%', 'Number of distinct federal entities / agencies contacted'],
        ['Lobbyist Count', 'LC', '10%', 'Total unique individual lobbyists deployed by registrants'],
        ['Consistency', 'CO', '15%', 'Number of quarters with active filings (sustained campaign)'],
        ['Trend', 'TR', '15%', 'Spend direction: increasing (+) / decreasing (−) / stable (0)'],
    ]
    cws8 = [W*0.27, W*0.07, W*0.08, W*0.58]
    t9 = Table(oli_data, colWidths=cws8)
    t9.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_AMB),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('TEXTCOLOR', (2,1), (2,-1), ACCENT_AMB),
        ('FONTNAME', (2,1), (2,-1), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (1,0), (2,-1), 'CENTER'),
    ]))
    story.append(t9)
    story.append(sp(8))

    story.append(Paragraph('Data Depth', h4))
    story.append(sp(4))
    story.append(Paragraph(
        'The LDA database covers <b>79+ issue area codes</b> ranging from Aerospace '
        'and Banking to Healthcare, Homeland Security, Telecommunications, and Taxation. '
        'Each quarterly filing includes: client/registrant names, specific issue '
        'descriptions, named individual lobbyists, and targeted government entities — '
        'giving a complete picture of a company\'s Washington presence.',
        body
    ))
    story.append(sp(8))

    story.append(Paragraph('Key Features', h4))
    story.append(FeatureGrid(W, [
        ('79+ Issue Areas', 'Full LDA issue code taxonomy mapped to readable names'),
        ('Quarterly Timeline', 'OLI score plotted per quarter — trend visualization'),
        ('Registrant Breakdown', 'Top lobbying firms employed and spend per firm'),
        ('Government Entity Map', 'Which agencies are being lobbied (DoD, FDA, SEC…)'),
        ('7-Day Smart Cache', 'Quarterly data changes slowly — long TTL appropriate'),
        ('Autocomplete Search', 'SEC EDGAR company search for any public company'),
    ], ACCENT_AMB))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 7 — USA SPENDING (OGI)
    # ═══════════════════════════════════════════════════════════════════════════

    story.append(SectionBanner(W, '06', 'USA Spending  ·  OGI Score',
                               'OmniFolio Government Influence Score from USAspending.gov federal contracts', ACCENT_GRN))
    story.append(sp(10))

    story.append(Paragraph('Overview', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'The OGI (OmniFolio Government Influence) Score measures a company\'s dependence '
        'on and influence within the federal contracting ecosystem. Data comes exclusively '
        'from USAspending.gov — the official public repository of all federal awards, '
        'contracts, grants, and loans mandated by the Digital Accountability and Transparency '
        'Act (DATA Act). The API is public, requires no authentication, and allows '
        '120 requests/minute.',
        body
    ))
    story.append(sp(8))

    story.append(DataFlowDiagram(W, [
        ('USAS', 'USAspending.gov\nAPI v2'),
        ('MATCH', 'Recipient\nName Match'),
        ('AGG', 'Annual\nAggregation'),
        ('SCORE', 'OGI Score\nCalc'),
        ('UI', 'Spending\nDashboard'),
    ], ACCENT_GRN))
    story.append(sp(8))

    story.append(Paragraph('OGI Scoring Components', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))

    ogi_data = [
        ['Component', 'Signal', 'Detail'],
        ['Total Obligation (TO)', 'Scale', 'Total federal $ awarded — log-normalised to 0–40 pts'],
        ['Agency Diversification (AD)', 'Breadth', 'Number of distinct awarding agencies — 0–20 pts'],
        ['Award Type Mix (ATM)', 'Complexity', 'Contracts vs Grants vs IDV vs Loans — 0–15 pts'],
        ['Geographic Spread (GS)', 'Reach', 'Number of states with active performance — 0–15 pts'],
        ['YoY Growth (GR)', 'Trend', 'Year-over-year obligation growth rate — 0–10 pts'],
    ]
    cws9 = [W*0.28, W*0.15, W*0.57]
    t10 = Table(ogi_data, colWidths=cws9)
    t10.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_GRN),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('TEXTCOLOR', (1,1), (1,-1), ACCENT_GRN),
        ('FONTNAME', (1,1), (1,-1), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t10)
    story.append(sp(8))

    story.append(Paragraph('Award Data Fields', h4))
    story.append(sp(4))
    story.append(Paragraph(
        'Each award record contains: Award ID, Award Type (Contract/Grant/IDV/Loan), '
        'Action Date, Fiscal Year, Total Obligation ($), Awarding Agency, Sub-Agency, '
        'Recipient Name, UEI (Unique Entity Identifier), NAICS Code/Description, '
        'PSC Code (Product/Service Code), Performance Location (city/state/country), '
        'Congressional District, and a permalink to the USAspending.gov award page.',
        body
    ))
    story.append(sp(8))

    award_types = [
        ['Award Type', 'Description', 'Typical Companies'],
        ['Contract (A/B/C/D)', 'Direct procurement for goods/services', 'Defense, IT, Construction'],
        ['Grant (02/03/04)', 'Financial assistance — no goods delivered', 'Research, Healthcare, Education'],
        ['IDV — IDIQ/BPA/FSS', 'Indefinite-delivery vehicles (framework agreements)', 'Consulting, IT Services'],
        ['Loan / Loan Guarantee', 'Federal loans & loan guarantees', 'Energy, Housing, Small Business'],
        ['Direct Payment', 'Direct financial assistance to individuals/entities', 'Agriculture, Disaster Relief'],
    ]
    cws10 = [W*0.25, W*0.40, W*0.35]
    t11 = Table(award_types, colWidths=cws10)
    t11.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_GRN),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t11)
    story.append(sp(8))

    story.append(Paragraph('Key Features', h4))
    story.append(FeatureGrid(W, [
        ('Annual Chart', 'Total obligations by fiscal year — bar chart'),
        ('Agency Breakdown', 'Top awarding agencies with % of total spend'),
        ('Award Type Donut', 'Contract vs Grant vs IDV vs Loan distribution'),
        ('State Distribution', 'Performance location heat map by state'),
        ('30-Result Pagination', 'Full award table with description & USAspending link'),
        ('Popular Contractors', 'Quick-access grid for top government contractors'),
    ], ACCENT_GRN))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # PAGE 8 — CACHING ARCHITECTURE + COMPARATIVE SUMMARY
    # ═══════════════════════════════════════════════════════════════════════════

    story.append(SectionBanner(W, '07', 'Caching & Infrastructure',
                               'Smart TTL, stale-while-revalidate, Supabase-backed persistence', ACCENT_BLUE))
    story.append(sp(10))

    story.append(Paragraph('Caching Strategy', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))
    story.append(Paragraph(
        'Every proprietary service uses a two-layer caching strategy. Layer 1 is a '
        'browser-side localStorage cache for instant re-renders without network latency. '
        'Layer 2 is a Supabase PostgreSQL table that acts as the source of truth. '
        'The pattern is <b>stale-while-revalidate</b>: the UI renders stale data immediately, '
        'then triggers a background refresh. This achieves both speed and freshness.',
        body
    ))
    story.append(sp(8))

    cache_data = [
        ['Service', 'L1 Cache (Browser)', 'L2 Cache (Supabase)', 'Refresh Trigger'],
        ['Economic Calendar', '—', 'DB-seeded', 'Manual or scheduled seed'],
        ['IPO Calendar', '4-hour localStorage', '6-hour background API', 'Force refresh button'],
        ['Earnings Calendar', '4-hour localStorage', '6-hour background API', 'Force refresh button'],
        ['Insider Sentiment', '—', 'Market-hours TTL', 'Per-ticker on load + stale-check'],
        ['Senate Lobbying', '—', '7-day TTL', 'Per-ticker on load + ?refresh=true'],
        ['USA Spending', '—', '7-day TTL', 'Per-ticker on load + ?refresh=true'],
    ]
    cws11 = [W*0.22, W*0.22, W*0.26, W*0.30]
    t12 = Table(cache_data, colWidths=cws11)
    t12.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_BLUE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t12)
    story.append(sp(8))

    story.append(Paragraph('API Cost Comparison', h3))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(4))

    cost_data = [
        ['Service', 'OmniFolio Approach', 'Equivalent Paid API', 'Typical Cost/Month'],
        ['Economic Calendar', 'BLS + Fed + ECB + BoJ (FREE)', 'Trading Economics Pro', '$300–$3,000'],
        ['IPO Calendar', 'SEC EDGAR (FREE)', 'Nasdaq Data Link IPO', '$500–$2,000'],
        ['Earnings Calendar', 'SEC EDGAR (FREE)', 'Intrinio / FactSet', '$200–$1,500'],
        ['Insider Sentiment', 'SEC EDGAR Form 4 (FREE)', 'OpenInsider Pro / Quiver', '$50–$500'],
        ['Senate Lobbying', 'Senate LDA API (FREE)', 'Quiver Quant / OpenSecrets', '$100–$800'],
        ['USA Spending', 'USAspending.gov (FREE)', 'Govini / Input.io', '$500–$5,000'],
        ['TOTAL', '100% Free', '—', '$1,650 – $12,800/mo'],
    ]
    cws12 = [W*0.20, W*0.28, W*0.27, W*0.25]
    t13 = Table(cost_data, colWidths=cws12)
    t13.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SURFACE2),
        ('TEXTCOLOR', (0,0), (-1,0), ACCENT_BLUE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), SURFACE),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [SURFACE, HexColor('#141414')]),
        ('TEXTCOLOR', (0,1), (-1,-1), TEXT_SEC),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('BACKGROUND', (0,-1), (-1,-1), HexColor('#0A1A0A')),
        ('TEXTCOLOR', (0,-1), (-1,-1), ACCENT_GRN),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (1,1), (1,-2), ACCENT_GRN),
        ('GRID', (0,0), (-1,-1), 0.3, BORDER),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t13)
    story.append(sp(8))

    story.append(Paragraph('Infrastructure Stack', h4))
    story.append(FeatureGrid(W, [
        ('Next.js 14 App Router', 'Server components + API routes for all data pipelines'),
        ('Supabase PostgreSQL', 'Row-level security, smart TTL tables, upsert semantics'),
        ('TypeScript End-to-End', 'Full type safety from DB schema to React component'),
        ('Tailwind CSS + Recharts', 'Dark-mode UI with custom chart components'),
        ('Vercel Edge Runtime', 'Global CDN deployment, <50ms TTFB worldwide'),
        ('Zero Vendor Lock-in', 'All data sources are public gov APIs — no dependency risk'),
    ], ACCENT_BLUE))

    story.append(sp(10))
    story.append(HRFlowable(width=W, thickness=0.5, color=BORDER))
    story.append(sp(6))
    story.append(Paragraph(
        'Copyright © OmniFolio. All rights reserved. All proprietary scoring algorithms '
        '(OIC, OLI, OGI, OES) are original work. Data is sourced exclusively from public '
        'government databases. This document is confidential.',
        S('Footer', fontSize=7, textColor=TEXT_MUT, fontName='Helvetica',
          alignment=TA_CENTER, leading=11)
    ))

    # ── Build ─────────────────────────────────────────────────────────────────────
    doc.build(story)
    print(f'[✓] PDF generated: {output_path}')


if __name__ == '__main__':
    build_pdf('/Users/aristotelesbasilakos/Omnifolio/OmniFolio-Proprietary-Services.pdf')
