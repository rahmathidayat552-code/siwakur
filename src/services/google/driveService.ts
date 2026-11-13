const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const ROOT_FOLDER_NAME = 'SIWAKUR - SMKN 9 Bulukumba';

function sanitizeFileSegment(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ');
}

export function buildSubmissionFileName(
  taskTitle: string,
  teacherName: string,
  subject: string,
  originalFileName?: string
): string {
  const safeTask = sanitizeFileSegment(taskTitle) || 'Tugas';
  const safeTeacher = sanitizeFileSegment(teacherName) || 'Guru';
  const safeSubject = sanitizeFileSegment(subject) || 'Mapel';

  const baseName = `${safeTask}_${safeTeacher}_${safeSubject}`;
  if (!originalFileName || !originalFileName.includes('.')) {
    return baseName;
  }
  const ext = originalFileName.slice(originalFileName.lastIndexOf('.')).toLowerCase();
  return `${baseName}${ext}`;
}

async function driveJsonRequest<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('Sesi Google Drive berakhir. Silakan hubungkan kembali akun Google Anda.');
    }
    throw new Error(`Google Drive API error (${response.status}): ${errText || response.statusText}`);
  }

  return (await response.json()) as T;
}

async function findOrCreateRootFolder(accessToken: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${ROOT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchResult = await driveJsonRequest<{ files: Array<{ id: string }> }>(
    `${DRIVE_FILES_API}?q=${q}&fields=files(id,name)`,
    accessToken
  );

  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  const created = await driveJsonRequest<{ id: string }>(DRIVE_FILES_API, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  return created.id;
}

async function setPublicReadPermission(fileId: string, accessToken: string): Promise<void> {
  await fetch(`${DRIVE_FILES_API}/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  }).catch(() => undefined);
}

export interface CreatedDriveFolder {
  folderId: string;
  folderUrl: string;
}

export async function createTaskFolder(
  taskTitle: string,
  accessToken: string
): Promise<CreatedDriveFolder> {
  const rootId = await findOrCreateRootFolder(accessToken);

  const folderMetadata = {
    name: sanitizeFileSegment(taskTitle),
    mimeType: 'application/vnd.google-apps.folder',
    parents: [rootId],
  };

  const folder = await driveJsonRequest<{ id: string; webViewLink?: string }>(
    `${DRIVE_FILES_API}?fields=id,webViewLink`,
    accessToken,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folderMetadata),
    }
  );

  await setPublicReadPermission(folder.id, accessToken);

  return {
    folderId: folder.id,
    folderUrl: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
  };
}

export interface UploadTeachingFileParams {
  file: File;
  taskTitle: string;
  teacherName: string;
  subject: string;
  folderId?: string;
  accessToken: string;
}

export interface UploadedDriveFile {
  fileId: string;
  fileName: string;
  fileUrl: string;
}

async function executeMultipartUpload(
  file: File,
  formattedName: string,
  accessToken: string,
  parentFolderId?: string
): Promise<UploadedDriveFile> {
  const metadata: { name: string; parents?: string[] } = {
    name: formattedName,
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const response = await fetch(
    `${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const error = new Error(
      response.status === 401
        ? 'Sesi Google Drive berakhir. Silakan hubungkan kembali akun Google Anda.'
        : `Gagal mengunggah berkas ke Google Drive (${response.status}): ${errText}`
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = (await response.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
  };

  await setPublicReadPermission(data.id, accessToken);

  return {
    fileId: data.id,
    fileName: data.name || formattedName,
    fileUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

export async function uploadTeachingFile(
  params: UploadTeachingFileParams
): Promise<UploadedDriveFile> {
  const formattedName = buildSubmissionFileName(
    params.taskTitle,
    params.teacherName,
    params.subject,
    params.file.name
  );

  try {
    return await executeMultipartUpload(
      params.file,
      formattedName,
      params.accessToken,
      params.folderId
    );
  } catch (err) {
    const status = (err as { status?: number })?.status;
    // Jika folder tugas milik Wakur belum diberi izin tulis oleh Guru, unggah ke folder SIWAKUR di Drive Guru
    if (params.folderId && (status === 403 || status === 404)) {
      const teacherRootId = await findOrCreateRootFolder(params.accessToken);
      return executeMultipartUpload(
        params.file,
        formattedName,
        params.accessToken,
        teacherRootId
      );
    }
    throw err;
  }
}
