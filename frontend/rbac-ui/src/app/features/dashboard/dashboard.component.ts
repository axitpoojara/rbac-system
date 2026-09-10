import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { DashboardStats } from '../../core/models/rbac.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, HasPermissionDirective],
  template: `
    <div class="dashboard-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">System Dashboard</h1>
          <p class="page-subtitle">Overview of system metrics, active roles, and assigned permissions.</p>
        </div>
      </div>

      <!-- KPI Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon users">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats()?.totalUsers ?? 0 }}</div>
            <div class="stat-label">Total Users</div>
            <div class="stat-sub">
              <span class="active-dot"></span> {{ stats()?.activeUsers ?? 0 }} Active · {{ stats()?.inactiveUsers ?? 0 }} Inactive
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon roles">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats()?.totalRoles ?? 0 }}</div>
            <div class="stat-label">Configured Roles</div>
            <div class="stat-sub">Role-based Access</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon perms">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="7.5" cy="15.5" r="5.5"></circle>
              <path d="m21 2-9.6 9.6"></path>
              <path d="m15.5 7.5 3 3L22 7l-3-3"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats()?.totalPermissions ?? 0 }}</div>
            <div class="stat-label">System Permissions</div>
            <div class="stat-sub">Granular Policy Registry</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon menus">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats()?.totalMenus ?? 0 }}</div>
            <div class="stat-label">Dynamic Menus</div>
            <div class="stat-sub">Hierarchical Navigation</div>
          </div>
        </div>
      </div>

      <!-- Current User Session Profile & Permissions -->
      <div class="dashboard-split">
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Current Session Details</h2>
              <div class="card-subtitle">Authenticated Identity & Roles</div>
            </div>
          </div>

          <div class="user-session-info">
            <div class="info-row">
              <span class="info-label">Full Name:</span>
              <span class="info-val font-semibold">{{ currentUser()?.fullName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Username:</span>
              <span class="info-val"><code>{{ currentUser()?.userName }}</code></span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-val">{{ currentUser()?.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-val">
                <span class="badge" [class.badge-success]="currentUser()?.isActive" [class.badge-danger]="!currentUser()?.isActive">
                  {{ currentUser()?.isActive ? 'Active' : 'Inactive' }}
                </span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Assigned Roles:</span>
              <div class="roles-badges">
                <span *ngFor="let role of roles()" class="badge badge-primary">{{ role }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Your Effective Permissions</h2>
              <div class="card-subtitle">Evaluated dynamically on both frontend and backend</div>
            </div>
            <span *ngIf="isSuperAdmin()" class="badge badge-success">SuperAdmin Bypass Active</span>
          </div>

          <div class="permissions-container">
            <div *ngIf="isSuperAdmin()" class="superadmin-note">
              As a <strong>SuperAdmin</strong>, you automatically possess all system permissions.
            </div>

            <div class="perms-cloud">
              <span *ngFor="let perm of permissions()" class="perm-pill">
                {{ perm }}
              </span>
              <span *ngIf="permissions().length === 0 && !isSuperAdmin()" class="text-muted text-sm">
                No granular permissions directly assigned.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 1.5rem;
    }
    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon.users { background: #e0e7ff; color: #4338ca; }
    .stat-icon.roles { background: #ecfdf5; color: #047857; }
    .stat-icon.perms { background: #fffbeb; color: #b45309; }
    .stat-icon.menus { background: #f0f9ff; color: #0284c7; }
    .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.2;
    }
    .stat-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .stat-sub {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.2rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .active-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--success);
    }
    .dashboard-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .dashboard-split {
        grid-template-columns: 1fr;
      }
    }
    .info-row {
      display: flex;
      padding: 0.65rem 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
    }
    .info-label {
      width: 140px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .info-val {
      flex: 1;
      color: var(--text-main);
    }
    .roles-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .perms-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      max-height: 250px;
      overflow-y: auto;
      padding-top: 0.5rem;
    }
    .perm-pill {
      background: #f1f5f9;
      border: 1px solid var(--border-color);
      color: #334155;
      font-size: 0.75rem;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      font-family: monospace;
    }
    .superadmin-note {
      background-color: var(--success-light);
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);

  currentUser = this.authService.currentUser;
  roles = this.authService.roles;
  permissions = this.authService.permissions;
  stats = signal<DashboardStats | null>(null);

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe({
      next: (res) => {
        if (res.success) {
          this.stats.set(res.data);
        }
      }
    });
  }

  isSuperAdmin(): boolean {
    return this.authService.hasRole('SuperAdmin');
  }
}
