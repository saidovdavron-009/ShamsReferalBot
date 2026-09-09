import fs from "fs";
import path from "path";
import sharp from "sharp";
import QRCode from "qrcode";

const WIDTH = 1918;
const HEIGHT = 633;
const TEMPLATE_PATH = path.resolve(__dirname, "../../../assets/certificate-template.png");

const NAME_X = 705;
const NAME_Y = 532;
const ID_X = 1090;
const ID_Y = 532;
const NAME_FONT_SIZE = 27;
// A long full name would otherwise run past this point and ride over the
// "| ID raqami:" label baked into the template background, so it wraps onto
// a second line beneath the first instead of overlapping it.
const NAME_MAX_WIDTH = ID_X - NAME_X - 60;
const NAME_CHAR_WIDTH_RATIO = 0.62;
const NAME_LINE_HEIGHT = 30;

const QR_BOX_LEFT = 1558;
const QR_BOX_TOP = 175;
const QR_BOX_SIZE = 234;
const QR_SIZE = 210;
const QR_LEFT = QR_BOX_LEFT + Math.round((QR_BOX_SIZE - QR_SIZE) / 2);
const QR_TOP = QR_BOX_TOP + Math.round((QR_BOX_SIZE - QR_SIZE) / 2);

const DATE_VALUE_COLOR = "#fdf6eb";
// Values run in their own column to the LEFT of the "SANA:" / "VAQT:" labels
// (the blank slot the template reserves there), starting level with the top
// of each label, so label and value read as two parallel columns rather than
// one stacked below the other.
const VALUE_COLUMN_X = 132;
const SANA_LABEL_TOP_Y = 108;
const VAQT_LABEL_TOP_Y = 276;
const VALUE_FONT_SIZE = 22;
// Rough average glyph advance width for this font/size, used only to guess
// the rendered string length so the rotated block can be centered — not
// pixel-exact, but close enough for a first pass (verified visually after).
const VALUE_CHAR_WIDTH_RATIO = 0.56;
// Small note squeezed into the gap between the "WWW..." sidebar text and the
// SANA/VAQT value column, vertically centered on the VAQT value so it reads
// as attached to the time specifically (not the date or manzil rows).
const UZB_TIME_NOTE_TEXT = "(UZB vaqti bilan)";
const UZB_TIME_NOTE_X = 110;
const UZB_TIME_NOTE_FONT_SIZE = 12;
const UZB_TIME_NOTE_COLOR = "#d8c9a3";
const PLACEHOLDER_BAR_BG = "#65420a";
const PLACEHOLDER_BAR_X = 112;
const PLACEHOLDER_BAR_WIDTH = 63;
const SANA_BAR_Y = 219;
const VAQT_BAR_Y = 397;
const PLACEHOLDER_BAR_HEIGHT = 12;
// Thin divider lines between the SANA / VAQT / MANZIL rows, drawn below each
// value's own vertical extent so they never cross through the digits.
const DIVIDER_COLOR = "#fdf6eb";
const DIVIDER_X = PLACEHOLDER_BAR_X;
const DIVIDER_WIDTH = PLACEHOLDER_BAR_WIDTH;
const SANA_VAQT_DIVIDER_Y = 255;
const VAQT_MANZIL_DIVIDER_Y = 400;

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Lays the value out as one normal, flat horizontal string (characters
// side by side with the font's own natural spacing) and rotates that whole
// block 90° as a single unit, so it reads as one straight, evenly spaced
// vertical line (top-to-bottom, start of the string at the top) instead of
// individually stacked/spaced characters.
function rotatedValueBlock(
  value: string,
  x: number,
  topY: number,
  fontSize: number,
  color: string
): string {
  const estimatedLength = value.length * fontSize * VALUE_CHAR_WIDTH_RATIO;
  const pivotY = topY + estimatedLength / 2;
  return `<text x="${x}" y="${pivotY}" text-anchor="middle" font-size="${fontSize}" font-family="Arial, sans-serif" fill="${color}"
        transform="rotate(90 ${x} ${pivotY})">${escapeXml(value)}</text>`;
}

// Greedily fills each line with whole words up to NAME_MAX_WIDTH, so an
// overlong name wraps onto a second line below the first rather than
// running into the "ID raqami:" label to its right.
function wrapFullName(fullName: string): string[] {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [fullName];
  }

  const lines: string[] = [];
  let currentLine = words[0];

  for (const word of words.slice(1)) {
    const candidate = `${currentLine} ${word}`;
    const candidateWidth = candidate.length * NAME_FONT_SIZE * NAME_CHAR_WIDTH_RATIO;
    if (candidateWidth > NAME_MAX_WIDTH) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }
  lines.push(currentLine);

  return lines;
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function fallbackBackground(): Buffer {
  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#0a0a0a"/>
      <rect x="12" y="12" width="${WIDTH - 24}" height="${HEIGHT - 24}" fill="none" stroke="#c9a634" stroke-width="2"/>
      <text x="${WIDTH / 2}" y="${HEIGHT / 2}" text-anchor="middle" font-size="40" font-family="Georgia, serif" fill="#c9a634">VAUCHER — 1 000 000 so'm</text>
    </svg>
  `);
}

export async function generateCertificateBuffer(
  fullName: string,
  telegramId: string,
  referralLink: string,
  issuedAt: Date
): Promise<Buffer> {
  const background = fs.existsSync(TEMPLATE_PATH)
    ? sharp(TEMPLATE_PATH).resize(WIDTH, HEIGHT)
    : sharp(fallbackBackground());

  const nameLines = wrapFullName(fullName).map(escapeXml);
  const voucherId = `#SHAMS-${telegramId}`;
  const dateValue = formatDate(issuedAt);
  const timeValue = formatTime(issuedAt);

  const vaqtEstimatedLength = timeValue.length * VALUE_FONT_SIZE * VALUE_CHAR_WIDTH_RATIO;
  const vaqtPivotY = VAQT_LABEL_TOP_Y + vaqtEstimatedLength / 2;
  const uzbTimeNoteEstimatedLength = UZB_TIME_NOTE_TEXT.length * UZB_TIME_NOTE_FONT_SIZE * VALUE_CHAR_WIDTH_RATIO;
  const uzbTimeNoteTopY = vaqtPivotY - uzbTimeNoteEstimatedLength / 2;

  const qrBuffer = await QRCode.toBuffer(referralLink, {
    type: "png",
    width: QR_SIZE,
    margin: 1,
    color: { dark: "#000000", light: "#ffffffff" },
  });

  const overlaySvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${QR_BOX_LEFT}" y="${QR_BOX_TOP}" width="${QR_BOX_SIZE}" height="${QR_BOX_SIZE}" fill="#ffffff"/>

      <rect x="${PLACEHOLDER_BAR_X}" y="${SANA_BAR_Y}" width="${PLACEHOLDER_BAR_WIDTH}" height="${PLACEHOLDER_BAR_HEIGHT}" fill="${PLACEHOLDER_BAR_BG}"/>
      <rect x="${PLACEHOLDER_BAR_X}" y="${VAQT_BAR_Y}" width="${PLACEHOLDER_BAR_WIDTH}" height="${PLACEHOLDER_BAR_HEIGHT}" fill="${PLACEHOLDER_BAR_BG}"/>

      ${rotatedValueBlock(dateValue, VALUE_COLUMN_X, SANA_LABEL_TOP_Y, VALUE_FONT_SIZE, DATE_VALUE_COLOR)}
      ${rotatedValueBlock(timeValue, VALUE_COLUMN_X, VAQT_LABEL_TOP_Y, VALUE_FONT_SIZE, DATE_VALUE_COLOR)}
      ${rotatedValueBlock(UZB_TIME_NOTE_TEXT, UZB_TIME_NOTE_X, uzbTimeNoteTopY, UZB_TIME_NOTE_FONT_SIZE, UZB_TIME_NOTE_COLOR)}

      <line x1="${DIVIDER_X}" y1="${SANA_VAQT_DIVIDER_Y}" x2="${DIVIDER_X + DIVIDER_WIDTH}" y2="${SANA_VAQT_DIVIDER_Y}" stroke="${DIVIDER_COLOR}" stroke-width="2"/>
      <line x1="${DIVIDER_X}" y1="${VAQT_MANZIL_DIVIDER_Y}" x2="${DIVIDER_X + DIVIDER_WIDTH}" y2="${VAQT_MANZIL_DIVIDER_Y}" stroke="${DIVIDER_COLOR}" stroke-width="2"/>

      ${nameLines
        .map(
          (line, index) =>
            `<text x="${NAME_X}" y="${NAME_Y + index * NAME_LINE_HEIGHT}" font-size="${NAME_FONT_SIZE}" font-weight="bold" font-family="Arial, sans-serif" fill="#ffffff">${line}</text>`
        )
        .join("\n      ")}
      <text x="${ID_X}" y="${ID_Y}" font-size="27" font-weight="bold" font-family="Arial, sans-serif" fill="#ffffff">${voucherId}</text>
    </svg>
  `;

  return background
    .composite([
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
      { input: qrBuffer, top: QR_TOP, left: QR_LEFT },
    ])
    .png()
    .toBuffer();
}
