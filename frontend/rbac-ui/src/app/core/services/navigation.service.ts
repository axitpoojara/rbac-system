import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse, NavMenuItem } from '../models/rbac.models';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:5000/api/menus';

  private _navMenus = signal<NavMenuItem[]>([]);
  public navMenus = this._navMenus.asReadonly();

  private _loading = signal<boolean>(false);
  public loading = this._loading.asReadonly();

  loadNavMenus(): Observable<ApiResponse<NavMenuItem[]>> {
    this._loading.set(true);
    return this.http.get<ApiResponse<NavMenuItem[]>>(`${this.API_URL}/nav`).pipe(
      tap({
        next: (res) => {
          this._loading.set(false);
          if (res.success && res.data) {
            this._navMenus.set(res.data);
          }
        },
        error: () => {
          this._loading.set(false);
          this._navMenus.set([]);
        }
      })
    );
  }

  clearMenus(): void {
    this._navMenus.set([]);
  }
}
