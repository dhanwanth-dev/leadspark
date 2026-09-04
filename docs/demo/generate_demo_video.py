#!/usr/bin/env python3
"""Generate LeadSpark n8n automation demo MP4 (no live screen required)."""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 30
OUT = Path(__file__).resolve().parents[1] / "media" / "n8n-whatsapp-qualify-demo.mp4"
FRAMES_DIR = Path("/tmp/leadspark-frames")

BG = (11, 20, 18)
PANEL = (18, 32, 28)
LINE = (30, 58, 50)
MINT = (62, 207, 142)
MUTED = (138, 168, 156)
TEXT = (232, 245, 240)
WA = (37, 211, 102)
HOT = (255, 107, 74)
NODE = (26, 46, 40)
ACTIVE = (45, 90, 74)


def font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/TTF/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/noto/NotoSans-Regular.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F12, F14, F16, F18, F22, F28, F36 = (
    font(12),
    font(14),
    font(16),
    font(18),
    font(22),
    font(28, True),
    font(36, True),
)
FM12 = font(12)
FM13 = font(13)


NODES = [
    "WhatsApp Trigger",
    "Extract inbound",
    "Client config",
    "Gemini qualify",
    "Send WhatsApp",
    "Google Sheets",
    "Hot email",
]


def rounded(draw, xy, r, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def draw_base(active: int, progress: float, status: str, badge: str):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    # soft radial-ish vignette via top overlay
    for y in range(0, 220, 2):
        a = int(18 * (1 - y / 220))
        draw.line([(0, y), (W, y)], fill=(20 + a, 48 + a // 2, 40 + a // 2))

    draw.text((48, 36), "LeadSpark", fill=MINT, font=F16)
    draw.text((48, 64), "WhatsApp → Qualify → Sheet → Hot Alert", fill=TEXT, font=F28)
    draw.text(
        (48, 108),
        "End-to-end n8n automation: inbound enquiry becomes a scored lead in under a minute.",
        fill=MUTED,
        font=F16,
    )

    # badge
    bw = 220
    rounded(draw, (W - 48 - bw, 48, W - 48, 88), 8, (26, 77, 58), MINT, 1)
    draw.text((W - 48 - bw + 18, 58), badge, fill=MINT, font=FM13)

    # left canvas
    rounded(draw, (48, 150, 740, 580), 16, PANEL, LINE, 1)
    draw.text((72, 168), "N8N WORKFLOW · LEADSPARK-WHATSAPP-QUALIFY", fill=MUTED, font=FM12)

    # nodes grid 4 + 3
    positions = []
    x0, y0 = 72, 210
    for i, title in enumerate(NODES):
        col = i % 4
        row = i // 4
        x = x0 + col * 165
        y = y0 + row * 110
        positions.append((x, y))
        on = i <= active
        fill = ACTIVE if on else NODE
        outline = MINT if on else LINE
        rounded(draw, (x, y, x + 148, y + 70), 10, fill, outline, 2 if on else 1)
        draw.text((x + 12, y + 12), f"{i+1:02d}", fill=MUTED, font=FM12)
        draw.text((x + 12, y + 34), title, fill=TEXT, font=F14)
        if i < len(NODES) - 1 and col < 3:
            ax = x + 148 + 4
            ay = y + 32
            draw.text((ax, ay), "→", fill=MINT if i < active else MUTED, font=F18)

    # right panels
    rounded(draw, (768, 150, 1232, 360), 16, PANEL, LINE, 1)
    draw.text((792, 166), "BUYER WHATSAPP", fill=MUTED, font=FM12)

    rounded(draw, (768, 376, 1232, 500), 16, PANEL, LINE, 1)
    draw.text((792, 392), "LEAD CRM (GOOGLE SHEET)", fill=MUTED, font=FM12)

    rounded(draw, (768, 516, 1232, 580), 16, PANEL, LINE, 1)
    draw.text((792, 532), "AGENT INBOX", fill=MUTED, font=FM12)

    # footer
    draw.text((48, 620), status, fill=MINT, font=FM13)
    rounded(draw, (48, 660, 328, 668), 4, LINE)
    pw = int(280 * max(0, min(1, progress)))
    if pw:
        rounded(draw, (48, 660, 48 + pw, 668), 4, MINT)
    draw.text((980, 652), "docs/media · LeadSpark", fill=MUTED, font=F12)
    return img, draw


def bubble(draw, text, y, buyer=False):
    max_w = 380
    # simple wrap
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=F14) > max_w - 24:
            lines.append(cur)
            cur = w
        else:
            cur = t
    if cur:
        lines.append(cur)
    h = 16 + 18 * len(lines)
    if buyer:
        x1 = 1232 - 24
        x0 = x1 - max_w
        fill = WA
        tc = BG
    else:
        x0 = 792
        x1 = x0 + max_w
        fill = NODE
        tc = TEXT
    rounded(draw, (x0, y, x1, y + h), 10, fill)
    for i, line in enumerate(lines):
        draw.text((x0 + 12, y + 8 + i * 18), line, fill=tc, font=F14)
    return h + 10


def sheet_row(draw, y, k, v, hot=False):
    draw.text((792, y), k, fill=MUTED, font=FM12)
    if hot:
        rounded(draw, (900, y - 2, 960, y + 18), 4, (80, 30, 24))
        draw.text((910, y), v, fill=HOT, font=FM12)
    else:
        draw.text((900, y), v, fill=TEXT, font=FM12)


def render_scene(t: float) -> Image.Image:
    """t in seconds 0..17"""
    # timeline
    # 0-1 intro
    # 1-2 trigger + buyer hi
    # 2-3 extract
    # 3-4 config
    # 4-8 gemini chat
    # 8-9 send
    # 9-13 sheets fill
    # 13-16 hot email
    # 16-17 success hold

    if t < 1:
        active, progress, badge, status = -1, 0.02, "EXECUTION · IDLE", "Ready"
        img, draw = draw_base(active, progress, status, badge)
        return img

    chats = []
    fields = {}
    email = None

    if t >= 1.0:
        active, progress = 0, 0.08
        badge, status = "EXECUTION · RUNNING", "Inbound WhatsApp message"
        chats.append(("Hi, is the Whitefield 3BHK still available?", True))
    if t >= 2.2:
        active, progress = 1, 0.18
        status = "Extract phone + message text"
    if t >= 3.2:
        active, progress = 2, 0.28
        status = "Load client config (Sharma Properties)"
    if t >= 4.2:
        active, progress = 3, 0.42
        status = "Gemini qualifies & drafts reply"
        chats.append(("Hi! Yes — 3 BHK in Whitefield, ₹1.25 Cr. May I have your name?", False))
    if t >= 5.4:
        chats.append(("Ravi", True))
    if t >= 6.2:
        chats.append(("Thanks Ravi. What’s your budget range?", False))
    if t >= 7.2:
        chats.append(("Around 1.2 Cr, looking within a month", True))
    if t >= 8.2:
        active, progress = 4, 0.58
        status = "Send WhatsApp reply via Cloud API"
        chats.append(("Got it — own stay / investment? And preferred BHK?", False))
    if t >= 9.2:
        chats.append(("Own stay, 3 BHK", True))
    if t >= 10.0:
        active, progress = 5, 0.72
        status = "Upsert lead row in Google Sheets"
        fields["name"] = "Ravi"
    if t >= 10.6:
        fields["phone"] = "9198XXXX210"
        progress = 0.78
    if t >= 11.2:
        fields["budget"] = "1.2 Cr"
        progress = 0.84
    if t >= 11.8:
        fields["timeline"] = "Within 1 month"
        progress = 0.88
    if t >= 12.4:
        fields["score"] = "HOT"
        progress = 0.92
    if t >= 13.2:
        active, progress = 6, 0.96
        status = "Hot lead email → agent Gmail"
        email = "🔥 Hot lead: Ravi\nWhitefield 3BHK · 1.2 Cr · within 1 month\nWhatsApp handoff ready for Rahul Sharma"
    if t >= 15.0:
        badge, status = "EXECUTION · SUCCESS", "Done — lead scored hot & agent notified"
        progress = 1.0
    else:
        badge = "EXECUTION · RUNNING"

    img, draw = draw_base(active, progress, status, badge)

    # chat bubbles (show last that fit)
    y = 196
    for text, buyer in chats[-5:]:
        y += bubble(draw, text, y, buyer=buyer)

    # sheet
    y = 420
    order = [("name", "name"), ("phone", "phone"), ("budget", "budget"), ("timeline", "timeline"), ("score", "score")]
    for key, label in order:
        if key in fields:
            sheet_row(draw, y, label, fields[key], hot=(key == "score"))
            y += 16

    if email:
        for i, line in enumerate(email.split("\n")):
            col = HOT if i == 0 else TEXT
            draw.text((792, 548 + i * 16), line, fill=col, font=F12)

    return img


def main():
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    for old in FRAMES_DIR.glob("*.png"):
        old.unlink()

    duration = 17.0
    n = int(duration * FPS)
    print(f"Rendering {n} frames…")
    for i in range(n):
        t = i / FPS
        # slight ease on hold frames
        frame = render_scene(t)
        frame.save(FRAMES_DIR / f"f_{i:05d}.png")
        if i % 30 == 0:
            print(f"  {i}/{n}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate",
        str(FPS),
        "-i",
        str(FRAMES_DIR / "f_%05d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-movflags",
        "+faststart",
        str(OUT),
    ]
    print("Encoding", OUT)
    subprocess.check_call(cmd)
    print("Wrote", OUT, "size", OUT.stat().st_size)


if __name__ == "__main__":
    main()
