import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { NavigationService } from '../core/services/navigation.service';
import { ToastService } from '../core/services/toast.service';
import { NavMenuItem } from '../core/models/rbac.models';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-container">
      <!-- Dynamic Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div class="sidebar-brand-text">
            <div class="sidebar-brand-row">
              <span class="sidebar-brand-title">Enterprise RBAC</span>
              <span class="sidebar-version-pill">v2.4</span>
            </div>
            <div class="sidebar-brand-sub">Access & Identity</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-title">Navigation Menu</div>

          <!-- Dynamic Menu Iteration -->
          <ng-container *ngFor="let item of navMenus()">
            <!-- Leaf Item (no children) -->
            <a *ngIf="!item.children || item.children.length === 0" 
               [routerLink]="item.route" 
               routerLinkActive="active" 
               class="nav-item">
              <span class="nav-item-icon" [innerHTML]="getMenuIcon(item.icon)"></span>
              <span class="nav-item-title">{{ item.title }}</span>
            </a>

            <!-- Parent Item (with children) -->
            <div *ngIf="item.children && item.children.length > 0" class="nav-group">
              <div class="nav-item nav-item-parent" (click)="toggleSubmenu(item.id)">
                <span class="nav-item-icon" [innerHTML]="getMenuIcon(item.icon)"></span>
                <span class="nav-item-title">{{ item.title }}</span>
                <span class="nav-item-arrow" [class.open]="isSubmenuOpen(item.id)">▶</span>
              </div>
              <div class="subnav-list" *ngIf="isSubmenuOpen(item.id)">
                <a *ngFor="let child of item.children" 
                   [routerLink]="child.route" 
                   routerLinkActive="active" 
                   class="subnav-item">
                  <span class="nav-item-icon" [innerHTML]="getMenuIcon(child.icon)"></span>
                  <span>{{ child.title }}</span>
                </a>
              </div>
            </div>
          </ng-container>

          <div *ngIf="navMenus().length === 0 && !navLoading()" class="no-menus-hint">
            No menus assigned to your role.
          </div>
        </nav>

        <!-- Sidebar Footer Status -->
        <div class="sidebar-footer">
          <div class="sidebar-user-card">
            <div class="sidebar-avatar">{{ userInitials }}</div>
            <div class="sidebar-user-details">
              <div class="sidebar-user-name">{{ currentUser()?.fullName || currentUser()?.userName }}</div>
              <div class="sidebar-session-status">
                <span class="live-dot-green"></span>
                <span>Session Active</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Layout -->
      <div class="main-wrapper">
        <!-- Modern Executive Topbar -->
        <header class="topbar">
          <!-- Left: Breadcrumb Navigation & Route Context -->
          <div class="topbar-left">
            <div class="topbar-context">
              <div class="topbar-breadcrumb">
                <span class="breadcrumb-item breadcrumb-home">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  RBAC Console
                </span>
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-item breadcrumb-section">{{ pageMeta().section }}</span>
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-item breadcrumb-current">{{ pageMeta().title }}</span>
              </div>
              <div class="topbar-title-row">
                <h1 class="topbar-heading">{{ pageMeta().title }}</h1>
                <div class="system-status-pill" title="Backend API connected & Token auto-refresh active">
                  <span class="pulse-dot"></span>
                  <span class="system-status-label">RBAC Live</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Security Pill, User Profile Capsule & Logout Button -->
          <div class="topbar-right">
            <!-- Security / Token Shield Badge -->
            <div class="token-guard-badge" title="Access Token (15m) + Silent Auto-Refresh Enabled">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>JWT Guarded</span>
            </div>

            <div class="topbar-divider"></div>

            <!-- Profile Capsule -->
            <div class="profile-capsule" title="Logged-in Account Details">
              <div class="profile-avatar">
                {{ userInitials }}
              </div>
              <div class="profile-info">
                <div class="profile-name-row">
                  <span class="profile-name">{{ currentUser()?.fullName || currentUser()?.userName }}</span>
                  <span class="role-pill-badge" [class.superadmin]="primaryRole === 'SuperAdmin'">{{ primaryRole }}</span>
                </div>
                <div class="profile-email">{{ currentUser()?.email }}</div>
              </div>
            </div>

            <!-- Logout Button -->
            <button class="btn-topbar-logout" (click)="logout()" title="Securely Sign Out">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main class="content-container">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <!-- Toast Notifications Container -->
    <div class="toast-container">
      <div *ngFor="let t of toasts()" [class]="'toast-item toast-' + t.type">
        <span>{{ t.message }}</span>
        <button class="btn-close" (click)="removeToast(t.id)">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .no-menus-hint {
      padding: 1rem;
      font-size: 0.8rem;
      color: #64748b;
      font-style: italic;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 0.9rem;
      cursor: pointer;
      opacity: 0.7;
    }
    .btn-close:hover {
      opacity: 1;
    }
  `]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private navService = inject(NavigationService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  roles = this.authService.roles;
  navMenus = this.navService.navMenus;
  navLoading = this.navService.loading;
  toasts = this.toastService.toasts;

  currentUrl = signal<string>(this.router.url);
  private routerSub?: Subscription;

  openSubmenus: { [key: string]: boolean } = {};

  pageMeta = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/users')) {
      return {
        title: 'User Management',
        section: 'Access Control',
        icon: 'users',
        description: 'System user accounts, credentials & status'
      };
    }
    if (url.includes('/roles')) {
      return {
        title: 'Role & Access Matrix',
        section: 'Access Control',
        icon: 'shield',
        description: 'Hierarchical roles & granular permission mapping'
      };
    }
    if (url.includes('/system/menus')) {
      return {
        title: 'Dynamic Menus',
        section: 'System Settings',
        icon: 'menu',
        description: 'Role-driven navigation tree configuration'
      };
    }
    if (url.includes('/system/permissions')) {
      return {
        title: 'Permissions Registry',
        section: 'System Settings',
        icon: 'key',
        description: 'Granular security claims & policy enforcement'
      };
    }
    return {
      title: 'Executive Dashboard',
      section: 'Overview',
      icon: 'dashboard',
      description: 'System metrics, active sessions & security posture'
    };
  });

  ngOnInit(): void {
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => {
      this.currentUrl.set(e.urlAfterRedirects || e.url);
    });

    this.navService.loadNavMenus().subscribe({
      next: (res) => {
        if (res.data) {
          // Open parent menus with active children by default
          res.data.forEach(item => {
            if (item.children && item.children.length > 0) {
              this.openSubmenus[item.id] = true;
            }
          });
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  get userInitials(): string {
    const u = this.currentUser();
    if (!u) return 'U';
    if (u.firstName && u.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    return (u.userName || 'U').substring(0, 2).toUpperCase();
  }

  get primaryRole(): string {
    const roles = this.roles();
    return roles.length > 0 ? roles[0] : 'User';
  }

  toggleSubmenu(id: string): void {
    this.openSubmenus[id] = !this.openSubmenus[id];
  }

  isSubmenuOpen(id: string): boolean {
    return !!this.openSubmenus[id];
  }

  logout(): void {
    this.toastService.info('Logging out...');
    this.authService.logout();
  }

  removeToast(id: number): void {
    this.toastService.remove(id);
  }

  getMenuIcon(iconKey: string): string {
    switch (iconKey?.toLowerCase()) {
      case 'dashboard':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
      case 'users':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
      case 'user':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      case 'shield':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
      case 'settings':
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
      case 'menu':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
      case 'key':
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path><path d="m15.5 7.5 3 3L22 7l-3-3"></path></svg>`;
      default:
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
  }
}
