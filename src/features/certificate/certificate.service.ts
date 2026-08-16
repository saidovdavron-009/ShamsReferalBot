import fs from "fs";
import path from "path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 850;
const TEMPLATE_PATH = path.resolve(__dirname, "../../../assets/certificate-template.png");

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fallbackBackground(): Buffer {
  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1e3a5f"/>
          <stop offset="100%" stop-color="#0f1f33"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="30" y="30" width="${WIDTH - 60}" height="${HEIGHT - 60}" fill="none" stroke="#d4af37" stroke-width="6"/>
      <rect x="45" y="45" width="${WIDTH - 90}" height="${HEIGHT - 90}" fill="none" stroke="#d4af37" stroke-width="1.5"/>
    </svg>
  `);
}

export async function generateCertificateBuffer(fullName: string): Promise<Buffer> {
  const background = fs.existsSync(TEMPLATE_PATH)
    ? sharp(TEMPLATE_PATH).resize(WIDTH, HEIGHT)
    : sharp(fallbackBackground());

  const safeName = escapeXml(fullName);

  const overlaySvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="26%" text-anchor="middle" font-size="56" font-family="Georgia, 'Times New Roman', serif" fill="#d4af37" letter-spacing="6">SERTIFIKAT</text>
      <text x="50%" y="38%" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#e6e6e6">ushbu sertifikat quyidagi shaxsga taqdim etiladi</text>
      <text x="50%" y="54%" text-anchor="middle" font-size="48" font-family="Georgia, 'Times New Roman', serif" font-style="italic" fill="#ffffff">${safeName}</text>
      <text x="50%" y="64%" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" fill="#cccccc">do'stini botga taklif qilib, ro'yxatdan o'tkazgani uchun</text>
      <line x1="32%" y1="80%" x2="68%" y2="80%" stroke="#d4af37" stroke-width="2"/>
      <text x="50%" y="85%" text-anchor="middle" font-size="26" font-family="Georgia, 'Times New Roman', serif" font-style="italic" fill="#ffffff">${safeName}</text>
      <text x="50%" y="90%" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" fill="#999999">imzo</text>
    </svg>
  `;

  return background
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
