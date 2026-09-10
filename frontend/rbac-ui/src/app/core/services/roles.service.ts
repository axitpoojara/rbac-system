import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, CreateRoleDto, Role, RoleDetail, UpdateRoleDto } from '../models/rbac.models';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:5000/api/roles';

  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(this.API_URL);
  }

  getRoleById(id: string): Observable<ApiResponse<RoleDetail>> {
    return this.http.get<ApiResponse<RoleDetail>>(`${this.API_URL}/${id}`);
  }

  createRole(dto: CreateRoleDto): Observable<ApiResponse<RoleDetail>> {
    return this.http.post<ApiResponse<RoleDetail>>(this.API_URL, dto);
  }

  updateRole(id: string, dto: UpdateRoleDto): Observable<ApiResponse<RoleDetail>> {
    return this.http.put<ApiResponse<RoleDetail>>(`${this.API_URL}/${id}`, dto);
  }

  deleteRole(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.API_URL}/${id}`);
  }
}
