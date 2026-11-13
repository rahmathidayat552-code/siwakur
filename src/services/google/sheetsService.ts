import { CurriculumTask, TaskSubmission, WhitelistedTeacher } from '@/src/types';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface ExportRecapParams {
  task: CurriculumTask;
  teachers: WhitelistedTeacher[];
  submissions: TaskSubmission[];
  accessToken: string;
}

export interface ExportedSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export async function exportRecapToSheets({
  task,
  teachers,
  submissions,
  accessToken,
}: ExportRecapParams): Promise<ExportedSheetResult> {
  const todayLabel = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const sheetTitle = 'Rekap Pengumpulan';
  const createRes = await fetch(SHEETS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Rekap SIWAKUR - ${task.title} (${todayLabel})`,
      },
      sheets: [
        {
          properties: {
            title: sheetTitle,
            gridProperties: {
              frozenRowCount: 5,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => '');
    if (createRes.status === 401) {
      throw new Error('Sesi Google Sheets berakhir. Silakan hubungkan kembali akun Google Anda.');
    }
    throw new Error(`Gagal membuat Google Spreadsheet (${createRes.status}): ${errText}`);
  }

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets: Array<{ properties: { sheetId: number; title: string } }>;
  };

  const spreadsheetId = created.spreadsheetId;
  const actualTabName = created.sheets?.[0]?.properties?.title || sheetTitle;
  const numericSheetId = created.sheets?.[0]?.properties?.sheetId ?? 0;

  const submissionByEmail = new Map<string, TaskSubmission>();
  const submissionByUid = new Map<string, TaskSubmission>();
  submissions
    .filter((s) => s.taskId === task.id)
    .forEach((s) => {
      submissionByEmail.set(s.teacherEmail.toLowerCase(), s);
      submissionByUid.set(s.teacherUid, s);
    });

  const rows: (string | number)[][] = [
    ['SISTEM INFORMASI WAKIL KURIKULUM (SIWAKUR) - SMKN 9 BULUKUMBA'],
    [`Tugas Perangkat Ajar: ${task.title}`, '', '', `Batas Waktu: ${task.deadline}`],
    [`Diekspor pada: ${new Date().toLocaleString('id-ID')}`, '', '', `Total Guru Terdaftar: ${teachers.length}`],
    [],
    [
      'No',
      'NIP',
      'Nama Lengkap Guru',
      'Email',
      'Mata Pelajaran',
      'Status Aktivasi Akun',
      'Status Setoran',
      'Nama File / Dokumen',
      'Tautan Berkas',
      'Catatan Revisi',
      'Terakhir Diperbarui',
    ],
  ];

  teachers.forEach((teacher, idx) => {
    const sub =
      (teacher.uid ? submissionByUid.get(teacher.uid) : undefined) ||
      submissionByEmail.get(teacher.email.toLowerCase());

    const updatedStr = sub?.updatedAt?.toDate
      ? sub.updatedAt.toDate().toLocaleString('id-ID')
      : '-';

    rows.push([
      idx + 1,
      teacher.nip,
      teacher.fullName,
      teacher.email,
      teacher.subject,
      teacher.isRegistered ? 'Sudah Aktivasi' : 'Belum Aktivasi',
      sub ? sub.status : 'Belum Menyetor',
      sub ? sub.fileName : '-',
      sub ? sub.fileUrl : '-',
      sub?.revisionNote || '-',
      updatedStr,
    ]);
  });

  const range = encodeURIComponent(`'${actualTabName}'!A1:K${rows.length}`);
  const updateRes = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'${actualTabName}'!A1:K${rows.length}`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text().catch(() => '');
    throw new Error(`Gagal menulis data ke Google Sheets (${updateRes.status}): ${errText}`);
  }

  // Format header & auto-resize columns
  await fetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: numericSheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 11,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true, fontSize: 12 },
              },
            },
            fields: 'userEnteredFormat.textFormat',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: numericSheetId,
              startRowIndex: 4,
              endRowIndex: 5,
              startColumnIndex: 0,
              endColumnIndex: 11,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.059, green: 0.463, blue: 0.431 },
                textFormat: {
                  bold: true,
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: numericSheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 11,
            },
          },
        },
      ],
    }),
  }).catch(() => undefined);

  return {
    spreadsheetId,
    spreadsheetUrl:
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}
