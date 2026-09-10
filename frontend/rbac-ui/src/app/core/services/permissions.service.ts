import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, ModulePermissions, Permission } from '../models/rbac.models';

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:5000/api/permissions';

  getPermissions(): Observable<ApiResponse<Permission[]>> {
    return this.http.get<ApiResponse<Permission[]>>(this.API_URL);
  }

  getGroupedPermissions(): Observable<ApiResponse<ModulePermissions[]>> {
    return this.http.get<ApiResponse<ModulePermissions[]>>(`${this.API_URL}/grouped`);
  }

  createPermission(permission: { code: string; name: string; module: string; description: string }): Observable<ApiResponse<Permission>> {
    return this.http.post<ApiResponse<Permission>>(this.API_URL, permission);
  }
}
