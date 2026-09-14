import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { AuthResponse, LoginRequest, RefreshTokenRequest, RequestTempPasswordRequest, SetNewPasswordRequest, User } from '../models/auth.models';
import { ApiResponse } from '../models/rbac.models';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenService = inject(TokenService);

  private readonly API_URL = 'http://localhost:5000/api/auth';

  private _currentUser = signal<User | null>(null);
  public currentUser = this._currentUser.asReadonly();

  private _roles = signal<string[]>([]);
  public roles = this._roles.asReadonly();

  private _permissions = signal<string[]>([]);
  public permissions = this._permissions.asReadonly();

  private _mustChangePassword = signal<boolean>(false);
  public mustChangePassword = this._mustChangePassword.asReadonly();

  public isAuthenticated = computed(() => !!this._currentUser() && !!this.tokenService.getAccessToken());

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    const savedUser = localStorage.getItem('rbac_user');
    const savedRoles = localStorage.getItem('rbac_roles');
    const savedPermissions = localStorage.getItem('rbac_permissions');
    const savedMustChange = localStorage.getItem('rbac_must_change');

    if (savedUser && this.tokenService.hasToken()) {
      try {
        this._currentUser.set(JSON.parse(savedUser));
        if (savedRoles) this._roles.set(JSON.parse(savedRoles));
        if (savedPermissions) this._permissions.set(JSON.parse(savedPermissions));
        if (savedMustChange === 'true') this._mustChangePassword.set(true);
      } catch {
        this.clearLocalData();
      }
    }
  }

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, request).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.handleAuthSuccess(res.data);
        }
      })
    );
  }

  refreshToken(): Observable<ApiResponse<AuthResponse>> {
    const accessToken = this.tokenService.getAccessToken() || '';
    const refreshToken = this.tokenService.getRefreshToken() || '';

    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    const payload: RefreshTokenRequest = { accessToken, refreshToken };

    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/refresh-token`, payload).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.handleAuthSuccess(res.data);
        }
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    if (this.tokenService.hasToken()) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe({
        error: () => {} // silently ignore error on logout API
      });
    }

    this.clearLocalData();
    this.router.navigate(['/login']);
  }

  loadCurrentUser(): Observable<ApiResponse<AuthResponse>> {
    return this.http.get<ApiResponse<AuthResponse>>(`${this.API_URL}/me`).pipe(
      tap(res => {
        if (res.success && res.data) {
          this._currentUser.set(res.data.user);
          this._roles.set(res.data.roles);
          this._permissions.set(res.data.permissions);
          const mustChange = !!res.data.mustChangePassword;
          this._mustChangePassword.set(mustChange);

          localStorage.setItem('rbac_user', JSON.stringify(res.data.user));
          localStorage.setItem('rbac_roles', JSON.stringify(res.data.roles));
          localStorage.setItem('rbac_permissions', JSON.stringify(res.data.permissions));
          localStorage.setItem('rbac_must_change', String(mustChange));
        }
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  requestTemporaryPassword(email: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.API_URL}/request-temp-password`, { email });
  }

  setNewPassword(request: SetNewPasswordRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.API_URL}/set-new-password`, request).pipe(
      tap(res => {
        if (res.success) {
          this._mustChangePassword.set(false);
          localStorage.setItem('rbac_must_change', 'false');
          if (this._currentUser()) {
            this._currentUser.update(user => user ? { ...user, mustChangePassword: false } : null);
          }
        }
      })
    );
  }

  private handleAuthSuccess(data: AuthResponse): void {
    this.tokenService.setTokens(data.accessToken, data.refreshToken);
    this._currentUser.set(data.user);
    this._roles.set(data.roles);
    this._permissions.set(data.permissions);
    const mustChange = !!data.mustChangePassword;
    this._mustChangePassword.set(mustChange);

    localStorage.setItem('rbac_user', JSON.stringify(data.user));
    localStorage.setItem('rbac_roles', JSON.stringify(data.roles));
    localStorage.setItem('rbac_permissions', JSON.stringify(data.permissions));
    localStorage.setItem('rbac_must_change', String(mustChange));
  }

  private clearLocalData(): void {
    this.tokenService.clearTokens();
    this._currentUser.set(null);
    this._roles.set([]);
    this._permissions.set([]);
    this._mustChangePassword.set(false);
    localStorage.removeItem('rbac_user');
    localStorage.removeItem('rbac_roles');
    localStorage.removeItem('rbac_permissions');
    localStorage.removeItem('rbac_must_change');
  }

  hasPermission(permission: string): boolean {
    if (this._roles().includes('SuperAdmin')) {
      return true;
    }
    return this._permissions().some(p => p.toLowerCase() === permission.toLowerCase());
  }

  hasAnyPermission(perms: string[]): boolean {
    if (this._roles().includes('SuperAdmin')) {
      return true;
    }
    return perms.some(p => this.hasPermission(p));
  }

  hasRole(role: string): boolean {
    return this._roles().includes(role);
  }
}
