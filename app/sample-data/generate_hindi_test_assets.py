import os
from pathlib import Path


def find_devanagari_font() -> str | None:
    # Common macOS font locations
    roots = [
        Path("/System/Library/Fonts"),
        Path("/System/Library/Fonts/Supplemental"),
        Path("/Library/Fonts"),
        Path.home() / "Library/Fonts",
    ]

    keywords = [
        "devanagari",
        "kohinoor",
        "sangam",
        "noto",
        "mangal",
        "nirmala",
        "arial unicode",
    ]

    candidates: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for dirpath, _dirnames, filenames in os.walk(root):
            for name in filenames:
                lower = name.lower()
                if not lower.endswith((".ttf", ".ttc", ".otf")):
                    continue
                if any(k in lower for k in keywords):
                    candidates.append(Path(dirpath) / name)

    # Prefer explicit Devanagari fonts first
    def score(p: Path) -> int:
        n = p.name.lower()
        if "noto" in n and "devanagari" in n:
            return 0
        if "kohinoor" in n and "devanagari" in n:
            return 1
        if "devanagari" in n:
            return 2
        if "arial unicode" in n:
            return 3
        return 4

    candidates.sort(key=score)
    return str(candidates[0]) if candidates else None


def main() -> None:
    from PIL import Image, ImageDraw, ImageFont

    out_dir = Path(__file__).resolve().parent / "test-assets"
    out_dir.mkdir(parents=True, exist_ok=True)

    font_path = find_devanagari_font()
    if not font_path:
        raise SystemExit(
            "Could not find a Devanagari-capable font on this machine. "
            "Install a font like Noto Sans Devanagari and re-run."
        )

    # Image canvas
    width, height = 1400, 900
    img = Image.new("RGB", (width, height), color=(8, 10, 18))
    draw = ImageDraw.Draw(img)

    title_font = ImageFont.truetype(font_path, 56)
    body_font = ImageFont.truetype(font_path, 36)
    small_font = ImageFont.truetype(font_path, 28)

    x, y = 60, 50
    draw.text((x, y), "Hindi NER Studio — OCR Test", fill=(210, 220, 255), font=title_font)
    y += 90

    lines = [
        "राहुल शर्मा ने 21 अप्रैल 2026 को नई दिल्ली में IIT Delhi के सेमिनार में भाषण दिया।",
        "उन्होंने Google India और भारतीय रिज़र्व बैंक (RBI) के साथ एक प्रोजेक्ट पर काम किया।",
        "मीटिंग का स्थान: कनॉट प्लेस, नई दिल्ली — समय: 3:30 PM।",
        "संपर्क: +91 98765 43210 | ईमेल: rahul.sharma@example.com",
        "बजट: ₹ 12,50,000 और अंतिम तारीख: 30/04/2026।",
        "टीम में अंजलि वर्मा, मोहम्मद अली और प्रिया सिंह शामिल थे।",
    ]

    for line in lines:
        draw.text((x, y), line, fill=(235, 238, 245), font=body_font)
        y += 58

    y += 18
    draw.text(
        (x, y),
        "Tip: This PNG is meant for upload → OCR (hin+eng).",
        fill=(160, 170, 200),
        font=small_font,
    )

    png_path = out_dir / "hindi_ocr_test.png"
    img.save(png_path)

    # Create a scanned-style PDF (image-only PDF) to trigger your PDF OCR fallback.
    pdf_path = out_dir / "hindi_scanned_test.pdf"
    img_rgb = img.convert("RGB")
    img_rgb.save(pdf_path, "PDF", resolution=200)

    # Also create a plain text file with copy/paste Hindi samples.
    text_path = out_dir / "hindi_samples.txt"
    samples = """1) समाचार शैली
आज मुंबई में टाटा कंसल्टेंसी सर्विसेज (TCS) ने एक नया AI केंद्र शुरू किया। उद्घाटन में रतन टाटा फाउंडेशन के प्रतिनिधि और महाराष्ट्र सरकार के अधिकारी उपस्थित थे।

2) यात्रा + व्यक्ति/स्थान
मैं 15 मई 2025 को जयपुर से दिल्ली गया और फिर आगरा में ताजमहल देखा। मेरे साथ नेहा गुप्ता और अर्जुन मेहता थे।

3) शिक्षा/संस्था
अलीगढ़ मुस्लिम विश्वविद्यालय (AMU) के प्रोफेसर सैयद अहमद ने "भाषा प्रसंस्करण" पर एक कार्यशाला आयोजित की।

4) मिश्रित जानकारी (तारीख/राशि/फोन)
कंपनी ने 01/03/2026 को पुणे में ₹ 5,00,000 का अनुदान दिया। संपर्क नंबर: +91 99887 77665.

5) खेल
भारत ने 2023 में अहमदाबाद में ऑस्ट्रेलिया के खिलाफ मैच खेला। कप्तान रोहित शर्मा थे।
"""
    text_path.write_text(samples, encoding="utf-8")

    print("Generated:")
    print("-", png_path)
    print("-", pdf_path)
    print("-", text_path)
    print("Font used:", font_path)


if __name__ == "__main__":
    main()
