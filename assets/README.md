# Voucher template

Drop your voucher/ticket background image here as `certificate-template.png` (recommended size: 1920x640px, landscape).

If this file doesn't exist, the bot generates a default gold-and-black ticket design automatically — no setup required.

The name, ID, date/time and QR code are overlaid by `src/features/certificate/certificate.service.ts` on top of whichever background is used. To match a specific design pixel-for-pixel (e.g. a designer-made ticket graphic), drop that exact PNG here at 1920x640 — the overlay text/QR positions are tuned for that layout (left info panel ~0-300px, main ticket body ~300-1560px, QR panel ~1560-1920px).
