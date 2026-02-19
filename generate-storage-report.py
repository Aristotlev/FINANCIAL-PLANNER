"""
OmniFolio Storage Analysis PDF Generator
Generates a professional PDF report of all database storage estimates.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import Flowable
from datetime import datetime
import os

# ─── Colour palette ──────────────────────────────────────────────────────────
BRAND_DARK   = colors.HexColor("#0F1117")   # near-black background feel
BRAND_ACCENT = colors.HexColor("#6366F1")   # indigo – primary accent
BRAND_LIGHT  = colors.HexColor("#EEF2FF")   # very light indigo tint
BRAND_GREEN  = colors.HexColor("#22C55E")
BRAND_YELLOW = colors.HexColor("#F59E0B")
BRAND_RED    = colors.HexColor("#EF4444")
BRAND_GRAY   = colors.HexColor("#6B7280")
TABLE_HEADER = colors.HexColor("#312E81")   # deep indigo for table headers
ROW_ALT      = colors.HexColor("#F5F3FF")   # very light purple alternating row

PAGE_W, PAGE_H = A4
MARGIN = 1.8 * cm


# ─── Styles ──────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=26,
    textColor=BRAND_ACCENT,
    spaceAfter=4,
    leading=30,
    alignment=TA_CENTER,
)
subtitle_style = ParagraphStyle(
    "Subtitle",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=11,
    textColor=BRAND_GRAY,
    spaceAfter=6,
    alignment=TA_CENTER,
)
section_style = ParagraphStyle(
    "Section",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=13,
    textColor=BRAND_ACCENT,
    spaceBefore=14,
    spaceAfter=6,
    leading=16,
)
body_style = ParagraphStyle(
    "Body",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=9,
    textColor=colors.HexColor("#1F2937"),
    spaceAfter=4,
    leading=13,
)
note_style = ParagraphStyle(
    "Note",
    parent=styles["Normal"],
    fontName="Helvetica-Oblique",
    fontSize=8,
    textColor=BRAND_GRAY,
    spaceAfter=4,
    leading=11,
)
caption_style = ParagraphStyle(
    "Caption",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9,
    textColor=colors.white,
    alignment=TA_LEFT,
    leading=11,
)
warn_style = ParagraphStyle(
    "Warn",
    parent=styles["Normal"],
    fontName="Helvetica-Bold",
    fontSize=9,
    textColor=BRAND_RED,
    leading=11,
)


# ─── Helper: build a styled table ────────────────────────────────────────────
def make_table(headers, rows, col_widths, warn_col=None):
    """
    headers  : list of header strings
    rows     : list of lists (strings)
    col_widths: list of floats (cm units)
    warn_col : index of a column whose value triggers red text if it contains "⚠"
    """
    header_row = [Paragraph(f"<b>{h}</b>", caption_style) for h in headers]
    data = [header_row]
    for i, row in enumerate(rows):
        styled = []
        for j, cell in enumerate(row):
            txt = str(cell)
            if "⚠️" in txt:
                p = Paragraph(txt, warn_style)
            else:
                p = Paragraph(txt, body_style)
            styled.append(p)
        data.append(styled)

    col_widths_pt = [w * cm for w in col_widths]

    style = TableStyle([
        # Header
        ("BACKGROUND",  (0, 0), (-1, 0), TABLE_HEADER),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 8.5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING",    (0, 0), (-1, 0), 6),
        # Alternating rows
        *[("BACKGROUND", (0, r), (-1, r), ROW_ALT) for r in range(2, len(data), 2)],
        # Grid
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#C7D2FE")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",  (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",(0, 0), (-1, -1), 5),
    ])

    t = Table(data, colWidths=col_widths_pt, repeatRows=1)
    t.setStyle(style)
    return t


def make_summary_table(headers, rows, col_widths):
    """Grand-summary table with bold grand-total row."""
    header_row = [Paragraph(f"<b>{h}</b>", caption_style) for h in headers]
    data = [header_row]
    for row in rows:
        is_total = str(row[0]).startswith("**")
        styled = []
        for cell in row:
            txt = str(cell).strip("*")
            st = ParagraphStyle(
                "BoldCell" if is_total else "NormCell",
                parent=body_style,
                fontName="Helvetica-Bold" if is_total else "Helvetica",
                textColor=BRAND_ACCENT if is_total else colors.HexColor("#1F2937"),
            )
            styled.append(Paragraph(txt, st))
        data.append(styled)

    col_widths_pt = [w * cm for w in col_widths]

    style = TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), TABLE_HEADER),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#C7D2FE")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",(0, 0), (-1, -1), 5),
        # Highlight grand-total row
        ("BACKGROUND",  (0, -1), (-1, -1), BRAND_LIGHT),
        ("FONTNAME",    (0, -1), (-1, -1), "Helvetica-Bold"),
        ("LINEABOVE",   (0, -1), (-1, -1), 1.2, BRAND_ACCENT),
    ])

    t = Table(data, colWidths=col_widths_pt, repeatRows=1)
    t.setStyle(style)
    return t


# ─── Pill / badge flowable ────────────────────────────────────────────────────
class ColorBadge(Flowable):
    """A small coloured pill with text, drawn inline."""
    def __init__(self, text, bg=BRAND_ACCENT, fg=colors.white, width=110, height=16):
        super().__init__()
        self.text  = text
        self.bg    = bg
        self.fg    = fg
        self.width = width
        self.height = height

    def draw(self):
        self.canv.setFillColor(self.bg)
        self.canv.roundRect(0, 0, self.width, self.height, 4, fill=1, stroke=0)
        self.canv.setFillColor(self.fg)
        self.canv.setFont("Helvetica-Bold", 8)
        self.canv.drawCentredString(self.width / 2, 4, self.text)

    def wrap(self, *args):
        return self.width, self.height


# ─── Build document ──────────────────────────────────────────────────────────
def build_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title="OmniFolio Storage Analysis",
        author="OmniFolio",
    )

    story = []

    # ── Cover / Title ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 1.4 * cm))
    story.append(Paragraph("OmniFolio", title_style))
    story.append(Paragraph("Database &amp; Storage Analysis Report", subtitle_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", subtitle_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=1.5, color=BRAND_ACCENT, spaceAfter=10))
    story.append(Paragraph(
        "This report quantifies all database tables, caches, and file storage used by OmniFolio "
        "across its data domains: SEC EDGAR, insider sentiment, government spending, LDA lobbying, "
        "financial calendars, user portfolio data, community features, and more. "
        "Estimates are provided for development baseline, 1,000 users at 12 months, "
        "and 10,000 users at 12 months.",
        body_style,
    ))
    story.append(Spacer(1, 0.4 * cm))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 1 – SEC EDGAR
    # ─────────────────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        Paragraph("1. SEC EDGAR Data", section_style),
        Paragraph(
            "Data sourced from SEC EDGAR (XBRL financials, Form 4 insider transactions, 13F institutional "
            "holdings, filing text). Shared across all users — grows only when more symbols are tracked, "
            "not with user count.",
            body_style,
        ),
    ]))

    sec_headers = ["Table", "Avg Row Size", "Monthly Growth", "Current Est.", "12-Month Projection"]
    sec_rows = [
        ["sec_companies",              "~300 B",  "One-time load (10K+ companies)",         "3–4 MB",   "4 MB (stable)"],
        ["sec_filings",                "~500 B",  "~200/symbol × 15 symbols",               "15 MB",    "50–80 MB"],
        ["sec_financials",             "~2 KB",   "~8 rows/quarter/symbol (70+ NUMERIC cols)","5 MB",   "20–40 MB"],
        ["sec_insider_transactions",   "~400 B",  "~50/symbol/month",                       "3 MB",     "15–25 MB"],
        ["sec_institutional_holdings", "~350 B",  "~500/fund × 3 funds/quarter",            "2 MB",     "10–15 MB"],
        ["sec_filing_sections",        "5–50 KB", "Sporadic (full plain_text + keywords)",  "20 MB",    "100–300 MB ⚠️"],
        ["sec_watchlist",              "~200 B",  "Per active user",                        "< 1 MB",   "< 5 MB"],
        ["sec_filing_alerts",          "~300 B",  "Per filing event/user",                  "< 1 MB",   "~10 MB"],
        ["sec_cache_refresh_log",      "~150 B",  "1 row/cache key",                        "< 0.1 MB", "< 0.1 MB"],
    ]
    story.append(make_table(sec_headers, sec_rows, [4.5, 2.2, 4.5, 2.2, 3.6]))
    story.append(Paragraph(
        "⚠️  sec_filing_sections stores full extracted text (Risk Factors, MD&amp;A) — "
        "15 symbols × 20 filings × 5 sections can reach 750 MB if unconstrained. "
        "Recommend capping stored text at 10,000 characters per section.",
        note_style,
    ))
    story.append(Paragraph("<b>SEC subtotal:</b> ~48 MB now → ~200–460 MB at 12 months", body_style))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 2 – Proprietary Sentiment & Analysis Caches
    # ─────────────────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        Paragraph("2. Proprietary Sentiment &amp; Analysis Caches", section_style),
        Paragraph(
            "Computed from SEC Form 4 and 10-Q/10-K XBRL filings using OmniFolio's proprietary "
            "OIC (Insider Confidence) and OES (Earnings Surprise) scoring algorithms. "
            "Smart TTL between 2h–72h keeps sizes bounded.",
            body_style,
        ),
    ]))

    sent_headers = ["Table", "Avg Row Size", "Growth Model", "12-Month Est."]
    sent_rows = [
        ["insider_sentiment_cache",        "~400 B",  "1 row/symbol/month × symbols tracked",    "2–5 MB"],
        ["insider_sentiment_transactions", "~500 B",  "~50 txns/symbol/month × 15 symbols",      "5–10 MB"],
        ["insider_sentiment_refresh_log",  "~200 B",  "Cleaned after 30 days (bounded)",         "< 1 MB"],
        ["earnings_surprises_cache",       "~1.2 KB", "4 rows/symbol/year (50+ columns)",        "3–5 MB"],
        ["earnings_estimates_history",     "~200 B",  "Snapshot per analyst revision",           "1–2 MB"],
        ["earnings_surprises_refresh_log", "~200 B",  "Cleaned periodically",                    "< 1 MB"],
    ]
    story.append(make_table(sent_headers, sent_rows, [5.5, 2.2, 6.0, 3.3]))
    story.append(Paragraph("<b>Sentiment subtotal:</b> ~12 MB now → ~12–24 MB at 12 months", body_style))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 3 – Government & Public Data (LDA, USAspending)
    # ─────────────────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        Paragraph("3. Government &amp; Public Data Caches (Senate LDA, USAspending.gov)", section_style),
        Paragraph(
            "100% public government data. Senate Lobbying Disclosure Act (LDA) filings via lda.senate.gov, "
            "federal contract awards via usaspending.gov. "
            "Both caches use weekly TTL (168h) and 30-day log cleanup.",
            body_style,
        ),
    ]))

    gov_headers = ["Table", "Avg Row Size", "Growth Model", "12-Month Est."]
    gov_rows = [
        ["senate_lobbying_cache",      "~800 B", "~20 filings/symbol × 15 symbols (JSONB arrays)", "5–10 MB"],
        ["senate_lobbying_refresh_log","~200 B", "Cleaned after 30 days",                          "< 1 MB"],
        ["usa_spending_cache",         "~600 B", "~50 awards/symbol × 15 symbols",                 "5–10 MB"],
        ["usa_spending_refresh_log",   "~200 B", "Cleaned after 30 days",                          "< 1 MB"],
    ]
    story.append(make_table(gov_headers, gov_rows, [5.5, 2.2, 6.0, 3.3]))
    story.append(Paragraph("<b>Government data subtotal:</b> ~12 MB now → ~12–22 MB at 12 months", body_style))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 4 – Calendar & News Caches
    # ─────────────────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(KeepTogether([
        Paragraph("4. Calendar &amp; News Caches", section_style),
        Paragraph(
            "IPO and earnings calendars sourced from SEC EDGAR (S-1/10-Q filings). "
            "Economic calendar uses public macroeconomic event feeds. "
            "Twitter/X feed cache rolls over every 15 days.",
            body_style,
        ),
    ]))

    cal_headers = ["Table", "Avg Row Size", "Growth Model", "12-Month Est."]
    cal_rows = [
        ["ipo_calendar_cache",         "~500 B + JSONB", "~200 IPOs/year",                        "2–5 MB"],
        ["earnings_calendar_cache",    "~400 B + JSONB", "~5,000 earnings reports/quarter",       "10–20 MB"],
        ["economic_calendar_cache",    "~300 B",         "~50 events/week × 52 weeks",            "1–2 MB"],
        ["twitter_feed_cache",         "~1 KB",          "Rolling 15-day window",                 "5–10 MB"],
        ["crypto_fear_and_greed",      "~100 B",         "1 row/day (daily update)",              "< 0.1 MB"],
        ["ipo_calendar_meta",          "~100 B",         "Few config rows",                       "< 0.1 MB"],
        ["earnings_calendar_meta",     "~100 B",         "Few config rows",                       "< 0.1 MB"],
        ["economic_calendar_meta",     "~100 B",         "Few config rows",                       "< 0.1 MB"],
        ["cache_metadata",             "~100 B",         "1 row per cache name (static)",         "< 0.1 MB"],
    ]
    story.append(make_table(cal_headers, cal_rows, [4.8, 2.6, 5.2, 2.6 + 1.8]))
    story.append(Paragraph("<b>Calendar/News subtotal:</b> ~18 MB now → ~18–37 MB at 12 months", body_style))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 5 – User Portfolio Data
    # ─────────────────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        Paragraph("5. User Portfolio Data", section_style),
        Paragraph(
            "All user-owned financial data: holdings, transactions, snapshots. "
            "Scales linearly with user count. "
            "price_snapshots is bounded by a 48-hour auto-cleanup function.",
            body_style,
        ),
    ]))

    user_headers = ["Table", "Avg Row Size", "Growth per User", "Per 1K Users (12 mo)"]
    user_rows = [
        ["encrypted_state_snapshots", "2–50 KB",  "1 row/user (upserted, E2E encrypted)",  "2–50 MB"],
        ["portfolio_snapshots",        "~500 B",   "1 snapshot/day × 365",                 "180 MB"],
        ["price_snapshots",            "~100 B",   "Cleaned every 48 hours",               "5–10 MB (rolling)"],
        ["users / profiles",           "~500 B",   "1 row/user",                           "0.5 MB"],
        ["user_subscriptions",         "~300 B",   "1 row/user",                           "0.3 MB"],
        ["user_usage",                 "~300 B",   "1 row/user/day × 365",                 "110 MB"],
        ["cash_accounts",              "~200 B",   "Max 10–50 entries",                    "10 MB"],
        ["savings_accounts",           "~200 B",   "Max 10–50 entries",                    "10 MB"],
        ["crypto_holdings",            "~300 B",   "Max 10–50 entries",                    "15 MB"],
        ["stock_holdings",             "~300 B",   "Max 10–50 entries",                    "15 MB"],
        ["crypto_transactions",        "~300 B",   "Moderate",                             "30 MB"],
        ["stock_transactions",         "~300 B",   "Moderate",                             "30 MB"],
        ["trading_accounts",           "~200 B",   "Max 10–50 entries",                    "10 MB"],
        ["real_estate",                "~400 B",   "Few per user",                         "5 MB"],
        ["valuable_items",             "~300 B",   "Few per user",                         "5 MB"],
        ["expense_categories",         "~200 B",   "10–20 per user",                       "4 MB"],
        ["income_sources",             "~200 B",   "Few per user",                         "2 MB"],
        ["tax_profiles",               "~300 B",   "1 per user",                           "0.3 MB"],
        ["exchange_rates_history",     "~100 B",   "30 currencies × 365 days (shared)",    "5 MB"],
        ["user_currency_preferences",  "~100 B",   "1 row/user",                           "0.1 MB"],
    ]
    story.append(make_table(user_headers, user_rows, [5.0, 2.4, 5.0, 4.6]))
    story.append(Paragraph("<b>User data per 1,000 users:</b> ~430 MB → ~4.3 GB for 10,000 users", body_style))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 6 – Community
    # ─────────────────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        Paragraph("6. Community Data", section_style),
        Paragraph(
            "Social features: posts, comments, likes, follows, hashtags. "
            "Comments can grow 5× faster than posts if engagement is high.",
            body_style,
        ),
    ]))

    comm_headers = ["Table", "Avg Row Size", "Growth Model", "Per 1K Users (12 mo)"]
    comm_rows = [
        ["posts",          "~500 B",  "~10 posts/user/month × 12 months",  "60 MB"],
        ["comments",       "~300 B",  "~5 comments/post",                  "180 MB"],
        ["post_likes",     "~50 B",   "Variable engagement",               "10 MB"],
        ["follows",        "~50 B",   "Variable",                          "5 MB"],
        ["hashtags",       "~100 B",  "Unique hashtag registry",           "1 MB"],
        ["post_hashtags",  "~60 B",   "~3 tags/post",                      "4 MB"],
    ]
    story.append(make_table(comm_headers, comm_rows, [3.8, 2.4, 5.2, 5.6]))
    story.append(Paragraph("<b>Community subtotal per 1,000 users:</b> ~260 MB → ~2.6 GB for 10,000 users", body_style))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 7 – File Storage (Supabase Storage Buckets)
    # ─────────────────────────────────────────────────────────────────────────
    story.append(KeepTogether([
        Paragraph("7. File Storage (Supabase Storage Buckets)", section_style),
        Paragraph(
            "Object storage for binary files. post-images is the dominant growth driver and "
            "should have upload size limits enforced (recommend max 2 MB per image, "
            "compressed to 800px width server-side).",
            body_style,
        ),
    ]))

    file_headers = ["Bucket", "Avg File Size", "Growth", "Per 1K Users (12 mo)"]
    file_rows = [
        ["avatars",      "100–500 KB", "1 avatar/user",                     "100–500 MB"],
        ["post-images",  "200 KB–2 MB","~5 images/user/month × 12 months",  "1–10 GB ⚠️"],
    ]
    story.append(make_table(file_headers, file_rows, [4.0, 3.0, 5.5, 4.5]))
    story.append(Paragraph(
        "⚠️  post-images is the largest wildcard. Without compression, 10K active users "
        "posting images could generate 10–100 GB of file storage.",
        note_style,
    ))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 8 – Grand Summary
    # ─────────────────────────────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("8. Grand Summary", section_style))
    story.append(Paragraph(
        "Database totals include ~20% overhead for indexes. "
        "File storage totals are separate from database storage.",
        body_style,
    ))

    sum_headers = ["Category", "Dev / Baseline", "1K Users @ 12 Mo", "10K Users @ 12 Mo"]
    sum_rows = [
        ["SEC EDGAR (DB)",              "~48 MB",    "200–460 MB",     "200–460 MB (shared)"],
        ["Sentiment & Analysis (DB)",   "~12 MB",    "12–24 MB",       "12–24 MB (shared)"],
        ["Gov Data / LDA (DB)",         "~12 MB",    "12–22 MB",       "12–22 MB (shared)"],
        ["Calendar & News (DB)",        "~18 MB",    "18–37 MB",       "18–37 MB (shared)"],
        ["User Portfolio Data (DB)",    "< 1 MB",    "~430 MB",        "~4.3 GB"],
        ["Community (DB)",              "< 1 MB",    "~260 MB",        "~2.6 GB"],
        ["Reference & Config (DB)",     "~10 MB",    "~25 MB",         "~200 MB"],
        ["Index overhead (~20%)",       "~20 MB",    "~190 MB",        "~1.5 GB"],
        ["**DB Total",                  "**~121 MB", "**~1.2–1.5 GB", "**~8–10 GB"],
        ["File Storage (Buckets)",      "~10 MB",    "1–10 GB",        "10–100 GB ⚠️"],
        ["**Grand Total",               "**~131 MB", "**~2–12 GB",    "**~18–110 GB"],
    ]
    story.append(make_summary_table(sum_headers, sum_rows, [5.5, 3.0, 4.0, 4.5]))

    # ─────────────────────────────────────────────────────────────────────────
    # SECTION 9 – Key Insights & Recommendations
    # ─────────────────────────────────────────────────────────────────────────
    story.append(Paragraph("9. Key Insights &amp; Recommendations", section_style))

    insights = [
        (BRAND_RED,    "⚠️  sec_filing_sections",
         "Full extracted text (Risk Factors, MD&A) can balloon to 750 MB+ unconstrained. "
         "Cap stored text to 10,000 characters per section or store AI-generated summaries instead."),
        (BRAND_RED,    "⚠️  post-images bucket",
         "Without limits this dominates file storage. Enforce max 2 MB upload size and "
         "resize/compress server-side on ingest (you already handle avatar uploads via API — apply the same pattern)."),
        (BRAND_GREEN,  "✅  price_snapshots is well-managed",
         "The 48-hour cleanup function keeps this table at a constant ~5–10 MB regardless of user count."),
        (BRAND_GREEN,  "✅  Shared data doesn't scale with users",
         "SEC, government, and calendar caches (~300–550 MB) are shared across all users. "
         "This is a significant architectural advantage."),
        (BRAND_GREEN,  "✅  Smart TTL system",
         "The dynamic TTL logic (OIC/OES caches, insider sentiment) adapts to market hours, "
         "filing activity, and weekends — preventing unbounded growth."),
        (BRAND_YELLOW, "💡  portfolio_snapshots growth",
         "At 1 snapshot/day/user, this table reaches 180 MB per 1K users/year. "
         "Consider weekly snapshots for FREE/BASIC users and daily only for PRO+."),
        (BRAND_YELLOW, "💡  user_usage table",
         "365 rows/user/year at 300 B = 110 MB per 1K users. "
         "Aggregate older records monthly (sum counts) after 90 days to reduce row count."),
        (BRAND_ACCENT, "📦  Supabase plan recommendation",
         "Supabase Free tier provides 500 MB DB + 1 GB file storage — sufficient only for early dev. "
         "You will need the Pro plan ($25/mo → 8 GB DB + 100 GB storage) before reaching ~500 active users. "
         "Plan for Team tier ($599/mo → 100 GB DB) at ~5K users."),
    ]

    for color, title, body in insights:
        story.append(KeepTogether([
            Spacer(1, 0.2 * cm),
            Table(
                [[Paragraph(f"<b>{title}</b>", ParagraphStyle(
                    "IT", parent=body_style, fontName="Helvetica-Bold",
                    textColor=color, fontSize=9.5
                )),
                Paragraph(body, body_style)]],
                colWidths=[4.8 * cm, (PAGE_W - 2 * MARGIN - 4.8 * cm)],
                style=TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                ]),
            ),
        ]))

    # ─── Footer note ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.6 * cm))
    story.append(HRFlowable(width="100%", thickness=0.8, color=BRAND_GRAY, spaceAfter=6))
    story.append(Paragraph(
        "All figures are estimates based on schema analysis and typical usage patterns. "
        "Actual sizes depend on content length (especially JSONB fields and free-text columns), "
        "user activity level, and cleanup job execution frequency. "
        "Re-run this analysis after each major schema change.",
        note_style,
    ))
    story.append(Paragraph(
        f"© {datetime.now().year} OmniFolio  •  Confidential &amp; Proprietary",
        ParagraphStyle("Footer", parent=note_style, alignment=TA_CENTER, textColor=BRAND_GRAY),
    ))

    doc.build(story)
    print(f"✅  PDF generated: {output_path}")


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "OmniFolio-Storage-Analysis.pdf")
    build_pdf(out)
