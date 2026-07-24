import { api } from './client';
import type { UploadedFile } from './types';

/** Allowed upload extensions (per FILE_UPLOAD.md). */
export const UPLOAD_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.heic';
export const UPLOAD_MAX_MB = 10;

/** POST /files (multipart) -> uploaded file with a public URL. */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const fd = new FormData();
  fd.append('file', file);
  return (
    await api.post<UploadedFile>('/files', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data;
}

/** POST /files/batch (multipart files[]) -> uploaded files. */
export async function uploadFiles(files: File[]): Promise<UploadedFile[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  return (
    await api.post<UploadedFile[]>('/files/batch', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data;
}
