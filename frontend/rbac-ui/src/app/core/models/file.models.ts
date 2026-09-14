export interface FileItem {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  uploadedByUserId: string;
  uploadedByUserName: string;
  createdAtUtc: string;
  extension: string;
  formattedSize: string;
}
