import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, PagedResult } from '../models/rbac.models';
import { FileItem } from '../models/file.models';

@Injectable({
  providedIn: 'root'
})
export class FilesService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:5000/api/files';

  getFiles(pageNumber = 1, pageSize = 10, searchTerm = ''): Observable<ApiResponse<PagedResult<FileItem>>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (searchTerm) {
      params = params.set('searchTerm', searchTerm);
    }

    return this.http.get<ApiResponse<PagedResult<FileItem>>>(this.API_URL, { params });
  }

  uploadFile(file: File): Observable<ApiResponse<FileItem>> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ApiResponse<FileItem>>(`${this.API_URL}/upload`, formData);
  }

  downloadFile(id: string, fileName: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/${id}/download`, {
      responseType: 'blob'
    });
  }

  deleteFile(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.API_URL}/${id}`);
  }

  triggerBrowserDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
