import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/rbac.models';
import { EmailTemplate, CreateEmailTemplateDto, UpdateEmailTemplateDto, SendTestEmailRequest } from '../models/email-template.models';

@Injectable({
  providedIn: 'root'
})
export class EmailTemplatesService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:5000/api/email-templates';

  getEmailTemplates(): Observable<ApiResponse<EmailTemplate[]>> {
    return this.http.get<ApiResponse<EmailTemplate[]>>(this.API_URL);
  }

  getEmailTemplateById(id: string): Observable<ApiResponse<EmailTemplate>> {
    return this.http.get<ApiResponse<EmailTemplate>>(`${this.API_URL}/${id}`);
  }

  createEmailTemplate(dto: CreateEmailTemplateDto): Observable<ApiResponse<EmailTemplate>> {
    return this.http.post<ApiResponse<EmailTemplate>>(this.API_URL, dto);
  }

  updateEmailTemplate(id: string, dto: UpdateEmailTemplateDto): Observable<ApiResponse<EmailTemplate>> {
    return this.http.put<ApiResponse<EmailTemplate>>(`${this.API_URL}/${id}`, dto);
  }

  deleteEmailTemplate(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.API_URL}/${id}`);
  }

  sendTestEmail(request: SendTestEmailRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.API_URL}/send-test`, request);
  }
}
