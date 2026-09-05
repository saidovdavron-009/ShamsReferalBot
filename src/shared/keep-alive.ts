const PING_INTERVAL_MS = 2 * 60 * 1000;

export function startKeepAlive(selfUrl: string | null): void {
  if (!selfUrl) {
    return;
  }

  const pingUrl = `${selfUrl.replace(/\/$/, "")}/health`;

  setInterval(() => {
    fetch(pingUrl)
      .then(() => console.log("Timeout! self-ping yuborildi:", pingUrl))
      .catch((err) => console.error("Timeout! self-ping xato:", err.message));
  }, PING_INTERVAL_MS);
}
