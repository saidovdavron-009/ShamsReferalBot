import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

/**
 * The file can be overridden with EXCEL_FILE in .env (absolute or relative
 * path). By default it is stored next to the directory from which the bot is
 * started.
 */
export const EXCEL_FILE = path.resolve(process.env.EXCEL_FILE ?? path.join(process.cwd(), "royxat.xlsx"));

const WORKSHEET_NAME = "Ro'yxatdan o'tganlar";

const HEADERS = [
  "Sana",
  "Telegram ID",
  "Username",
  "Ism",
  "Telefon",
  "Yosh",
  "Arab tili darajasi",
  "Jins",
  "Ta'lim shakli",
  "Tarif",
] as const;

export interface RegistrationExcelRow {
  telegramId: string;
  username: string | null;
  fullName: string | null;
  phone: string | null;
  age: number | null;
  arabicLevel: string | null;
  gender: string | null;
  studyForm: string | null;
  tariff: string | null;
}

// ExcelJS reads/writes the entire workbook. A process-local queue prevents
// simultaneous Telegram updates from overwriting one another's rows.
let writeQueue: Promise<void> = Promise.resolve();

function formatLocalDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getOrCreateWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  let worksheet = workbook.getWorksheet(WORKSHEET_NAME);
  if (!worksheet) {
    worksheet = workbook.addWorksheet(WORKSHEET_NAME);
    const headerRow = worksheet.addRow(HEADERS);
    headerRow.font = { bold: true };
    worksheet.columns = [
      { width: 21 }, { width: 18 }, { width: 22 }, { width: 30 }, { width: 20 },
      { width: 10 }, { width: 22 }, { width: 14 }, { width: 20 }, { width: 14 },
    ];
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }
  return worksheet;
}

async function loadWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS reports a missing file with a plain Error rather than ENOENT.
  // A 0-byte file can remain if the process was stopped while its first
  // workbook was being created; it is safe to recreate because it has no rows.
  if (fs.existsSync(EXCEL_FILE) && fs.statSync(EXCEL_FILE).size > 0) {
    await workbook.xlsx.readFile(EXCEL_FILE);
  }
  return workbook;
}

async function saveWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
  // Write the complete archive to a temporary file first. This preserves the
  // old workbook if the process stops or Excel locks the destination mid-save.
  const temporaryFile = `${EXCEL_FILE}.tmp`;
  const data = await workbook.xlsx.writeBuffer();

  try {
    await fs.promises.writeFile(temporaryFile, new Uint8Array(data));
    await fs.promises.rename(temporaryFile, EXCEL_FILE);
  } finally {
    // If write/rename failed, leave the original workbook untouched and avoid
    // a stale temporary file. Errors are handled by the queue caller.
    await fs.promises.rm(temporaryFile, { force: true }).catch(() => undefined);
  }
}

async function writeRegistration(row: RegistrationExcelRow): Promise<void> {
  const workbook = await loadWorkbook();
  const worksheet = getOrCreateWorksheet(workbook);
  worksheet.addRow([
    formatLocalDateTime(new Date()),
    row.telegramId,
    row.username ?? "-",
    row.fullName ?? "-",
    row.phone ?? "-",
    row.age ?? "-",
    row.arabicLevel ?? "-",
    row.gender ?? "-",
    row.studyForm ?? "-",
    row.tariff ?? "-",
  ]);
  await saveWorkbook(workbook);
}

function enqueue(task: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue
    .then(task)
    .catch((error) => {
      // A locked/corrupt file must not stop the Telegram bot or block later
      // registrations. The error stays visible in the server logs.
      console.error(`Excel fayliga yozib bo'lmadi (${EXCEL_FILE}):`, error);
    });
  return writeQueue;
}

/** Creates royxat.xlsx and its header row when the bot starts. */
export function ensureExcelFile(): Promise<void> {
  return enqueue(async () => {
    const fileAlreadyExists = fs.existsSync(EXCEL_FILE) && fs.statSync(EXCEL_FILE).size > 0;
    const workbook = await loadWorkbook();
    const worksheetAlreadyExists = Boolean(workbook.getWorksheet(WORKSHEET_NAME));
    getOrCreateWorksheet(workbook);

    // Do not rewrite a healthy existing file when the bot restarts.
    if (!fileAlreadyExists || !worksheetAlreadyExists) {
      await saveWorkbook(workbook);
    }
  });
}

/** Adds one completed registration as a new row without altering older rows. */
export function excelgaQoshish(row: RegistrationExcelRow): Promise<void> {
  return enqueue(() => writeRegistration(row));
}
