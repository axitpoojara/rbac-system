import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, CreateMenuDto, Menu, UpdateMenuDto } from '../models/rbac.models';

@Injectable({
  providedIn: 'root'
})
export class MenusService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:5000/api/menus';

  getMenus(): Observable<ApiResponse<Menu[]>> {
    return this.http.get<ApiResponse<Menu[]>>(this.API_URL);
  }

  createMenu(dto: CreateMenuDto): Observable<ApiResponse<Menu>> {
    return this.http.post<ApiResponse<Menu>>(this.API_URL, dto);
  }

  updateMenu(id: string, dto: UpdateMenuDto): Observable<ApiResponse<Menu>> {
    return this.http.put<ApiResponse<Menu>>(`${this.API_URL}/${id}`, dto);
  }

  deleteMenu(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.API_URL}/${id}`);
  }
}
