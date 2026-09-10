import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RolesService } from '../../core/services/roles.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { MenusService } from '../../core/services/menus.service';
import { ToastService } from '../../core/services/toast.service';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';
import { Menu, ModulePermissions, Role, RoleDetail } from '../../core/models/rbac.models';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, ConfirmModalComponent],
  template: `
    <div class="roles-page">
      <div class="page-header flex-between">
        <div>
          <h1 class="page-title">Role & Access Management</h1>
          <p class="page-subtitle">Configure roles, granular permission matrices, and dynamic menu assignments.</p>
        </div>
        <button *appHasPermission="'Roles.Manage'" class="btn btn-primary" (click)="openCreateModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create New Role
        </button>
      </div>

      <!-- Roles Table Card -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Role Name</th>
                <th>Description</th>
                <th>Users</th>
                <th>Permissions</th>
                <th>Assigned Menus</th>
                <th>Type</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let role of roles()">
                <td>
                  <div class="role-cell">
                    <span class="role-badge-icon">🛡</span>
                    <strong>{{ role.name }}</strong>
                  </div>
                </td>
                <td class="text-muted">{{ role.description || 'No description provided.' }}</td>
                <td>
                  <span class="badge badge-muted">{{ role.userCount }} users</span>
                </td>
                <td>
                  <span class="badge badge-primary">{{ role.permissionCount }} permissions</span>
                </td>
                <td>
                  <span class="badge badge-muted">{{ role.menuCount }} menus</span>
                </td>
                <td>
                  <span *ngIf="role.isSystemRole" class="badge badge-danger">System Protected</span>
                  <span *ngIf="!role.isSystemRole" class="badge badge-muted">Custom Role</span>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button 
                      *appHasPermission="'Roles.Manage'" 
                      class="btn btn-secondary btn-sm" 
                      (click)="openEditModal(role)">
                      Configure Access
                    </button>
                    <button 
                      *appHasPermission="'Roles.Manage'" 
                      class="btn btn-danger btn-sm" 
                      [disabled]="role.isSystemRole || role.userCount > 0"
                      (click)="confirmDelete(role)"
                      [title]="role.isSystemRole ? 'System roles cannot be deleted' : (role.userCount > 0 ? 'Unassign users first' : 'Delete Role')">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="roles().length === 0">
                <td colspan="7" class="text-center py-4 text-muted">No roles configured.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Configure / Edit Access Modal (Matrix) -->
    <div class="modal-backdrop" *ngIf="isEditModalOpen" (click)="closeEditModal()">
      <div class="modal-content modal-lg" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Configure Role: {{ selectedRole?.name }}</h3>
            <p class="modal-subtitle text-xs text-muted">Assign granular permissions and dynamic navigation menus</p>
          </div>
          <button class="btn btn-secondary btn-sm btn-icon" (click)="closeEditModal()">✕</button>
        </div>

        <form [formGroup]="roleForm" (ngSubmit)="submitEdit()">
          <div class="modal-body">
            <!-- Basic Details -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Role Name *</label>
                <input type="text" class="form-control" formControlName="name" [readonly]="selectedRole?.isSystemRole">
                <span *ngIf="selectedRole?.isSystemRole" class="text-xs text-muted">System role names cannot be modified.</span>
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <input type="text" class="form-control" formControlName="description">
              </div>
            </div>

            <!-- Tabs: Permissions Matrix vs Menu Assignment -->
            <div class="modal-tabs">
              <button type="button" class="modal-tab-btn" [class.active]="activeTab === 'permissions'" (click)="activeTab = 'permissions'">
                Permissions Matrix ({{ selectedPermissionIds.length }} Selected)
              </button>
              <button type="button" class="modal-tab-btn" [class.active]="activeTab === 'menus'" (click)="activeTab = 'menus'">
                Menu Assignment ({{ selectedMenuIds.length }} Selected)
              </button>
            </div>

            <!-- TAB 1: Permissions Matrix Grouped by Module -->
            <div *ngIf="activeTab === 'permissions'" class="tab-content">
              <div class="module-group" *ngFor="let mod of groupedPermissions()">
                <div class="module-group-header">
                  <strong>{{ mod.module }} Module</strong>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="toggleAllInModule(mod)">
                    {{ isModuleAllSelected(mod) ? 'Uncheck All' : 'Select All' }}
                  </button>
                </div>
                <div class="permission-grid">
                  <label *ngFor="let perm of mod.permissions" class="perm-checkbox-item">
                    <input type="checkbox" 
                           [checked]="selectedPermissionIds.includes(perm.id)"
                           (change)="togglePermission(perm.id)">
                    <div>
                      <div class="perm-title">{{ perm.name }}</div>
                      <div class="perm-code"><code>{{ perm.code }}</code></div>
                      <div class="perm-desc">{{ perm.description }}</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <!-- TAB 2: Dynamic Menus Assignment -->
            <div *ngIf="activeTab === 'menus'" class="tab-content">
              <p class="text-sm text-muted mb-3">Check the navigation menus that users with this role are allowed to see in their sidebar:</p>
              <div class="menus-assignment-list">
                <label *ngFor="let menu of allMenus()" class="menu-checkbox-item" [class.is-child]="menu.parentId">
                  <input type="checkbox" 
                         [checked]="selectedMenuIds.includes(menu.id)"
                         (change)="toggleMenu(menu.id)">
                  <span class="menu-title">
                    <span *ngIf="menu.parentId" class="child-indent">↳ </span>
                    {{ menu.title }}
                  </span>
                  <span class="menu-route"><code>{{ menu.route }}</code></span>
                  <span *ngIf="menu.requiredPermission" class="badge badge-muted text-xs">Req: {{ menu.requiredPermission }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeEditModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="roleForm.invalid">Save Role Configuration</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Role Modal -->
    <div class="modal-backdrop" *ngIf="isCreateModalOpen" (click)="closeCreateModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Create New Role</h3>
          <button class="btn btn-secondary btn-sm btn-icon" (click)="closeCreateModal()">✕</button>
        </div>
        <form [formGroup]="createRoleForm" (ngSubmit)="submitCreate()">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Role Name *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="e.g. Auditor, FinanceManager">
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-control" formControlName="description" rows="3" placeholder="Describe role responsibilities"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeCreateModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="createRoleForm.invalid">Create Role</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <app-confirm-modal
      [isOpen]="isDeleteModalOpen"
      title="Delete Role"
      [message]="'Are you sure you want to permanently delete role ' + (roleToDelete?.name || '') + '?'"
      confirmText="Delete Role"
      confirmButtonClass="btn-danger"
      (confirmed)="executeDelete()"
      (cancelled)="isDeleteModalOpen = false">
    </app-confirm-modal>
  `,
  styles: [`
    .flex-between {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .role-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .role-badge-icon {
      font-size: 1.1rem;
    }
    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .modal-tabs {
      display: flex;
      border-bottom: 2px solid var(--border-color);
      margin-bottom: 1.25rem;
      gap: 0.5rem;
    }
    .modal-tab-btn {
      padding: 0.6rem 1rem;
      border: none;
      background: none;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.15s ease;
    }
    .modal-tab-btn.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    .tab-content {
      max-height: 420px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }
    .module-group {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .module-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
      font-size: 0.9rem;
    }
    .permission-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    @media (max-width: 600px) {
      .permission-grid {
        grid-template-columns: 1fr;
      }
    }
    .perm-checkbox-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      background: #ffffff;
      padding: 0.6rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .perm-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .perm-code {
      font-size: 0.7rem;
      color: var(--primary);
    }
    .perm-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.1rem;
    }
    .menus-assignment-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .menu-checkbox-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.85rem;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    .menu-checkbox-item.is-child {
      background: #f8fafc;
      margin-left: 1.5rem;
    }
    .child-indent {
      color: var(--text-muted);
      font-weight: bold;
    }
    .menu-title {
      font-size: 0.875rem;
      font-weight: 500;
      flex: 1;
    }
    .menu-route {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .mb-3 { margin-bottom: 0.75rem; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.85rem; }
  `]
})
export class RolesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private rolesService = inject(RolesService);
  private permsService = inject(PermissionsService);
  private menusService = inject(MenusService);
  private toastService = inject(ToastService);

  roles = signal<Role[]>([]);
  groupedPermissions = signal<ModulePermissions[]>([]);
  allMenus = signal<Menu[]>([]);

  isEditModalOpen = false;
  isCreateModalOpen = false;
  isDeleteModalOpen = false;
  activeTab: 'permissions' | 'menus' = 'permissions';

  selectedRole: RoleDetail | null = null;
  roleToDelete: Role | null = null;
  selectedPermissionIds: string[] = [];
  selectedMenuIds: string[] = [];

  roleForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: ['']
  });

  createRoleForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();
    this.loadMenus();
  }

  loadRoles(): void {
    this.rolesService.getRoles().subscribe({
      next: (res) => {
        if (res.success) {
          this.roles.set(res.data);
        }
      }
    });
  }

  loadPermissions(): void {
    this.permsService.getGroupedPermissions().subscribe({
      next: (res) => {
        if (res.success) {
          this.groupedPermissions.set(res.data);
        }
      }
    });
  }

  loadMenus(): void {
    this.menusService.getMenus().subscribe({
      next: (res) => {
        if (res.success) {
          this.allMenus.set(res.data);
        }
      }
    });
  }

  openCreateModal(): void {
    this.createRoleForm.reset();
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  submitCreate(): void {
    if (this.createRoleForm.invalid) return;

    const dto = {
      name: this.createRoleForm.value.name,
      description: this.createRoleForm.value.description,
      permissionIds: [],
      menuIds: []
    };

    this.rolesService.createRole(dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`Role '${res.data.name}' created.`);
          this.closeCreateModal();
          this.loadRoles();
          // Open edit modal directly so user can configure permissions & menus
          this.openEditModal(res.data);
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to create role');
      }
    });
  }

  openEditModal(role: Role): void {
    this.rolesService.getRoleById(role.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.selectedRole = res.data;
          this.selectedPermissionIds = [...res.data.permissionIds];
          this.selectedMenuIds = [...res.data.menuIds];
          this.roleForm.patchValue({
            name: res.data.name,
            description: res.data.description
          });
          this.activeTab = 'permissions';
          this.isEditModalOpen = true;
        }
      },
      error: (err) => {
        this.toastService.error('Failed to load role details');
      }
    });
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedRole = null;
  }

  togglePermission(permId: string): void {
    if (this.selectedPermissionIds.includes(permId)) {
      this.selectedPermissionIds = this.selectedPermissionIds.filter(id => id !== permId);
    } else {
      this.selectedPermissionIds.push(permId);
    }
  }

  isModuleAllSelected(mod: ModulePermissions): boolean {
    return mod.permissions.every(p => this.selectedPermissionIds.includes(p.id));
  }

  toggleAllInModule(mod: ModulePermissions): void {
    const allSelected = this.isModuleAllSelected(mod);
    const modPermIds = mod.permissions.map(p => p.id);

    if (allSelected) {
      this.selectedPermissionIds = this.selectedPermissionIds.filter(id => !modPermIds.includes(id));
    } else {
      for (const id of modPermIds) {
        if (!this.selectedPermissionIds.includes(id)) {
          this.selectedPermissionIds.push(id);
        }
      }
    }
  }

  toggleMenu(menuId: string): void {
    if (this.selectedMenuIds.includes(menuId)) {
      this.selectedMenuIds = this.selectedMenuIds.filter(id => id !== menuId);
    } else {
      this.selectedMenuIds.push(menuId);
    }
  }

  submitEdit(): void {
    if (!this.selectedRole || this.roleForm.invalid) return;

    const dto = {
      name: this.roleForm.value.name,
      description: this.roleForm.value.description,
      permissionIds: this.selectedPermissionIds,
      menuIds: this.selectedMenuIds
    };

    this.rolesService.updateRole(this.selectedRole.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`Role '${res.data.name}' access configuration updated!`);
          this.closeEditModal();
          this.loadRoles();
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to update role');
      }
    });
  }

  confirmDelete(role: Role): void {
    this.roleToDelete = role;
    this.isDeleteModalOpen = true;
  }

  executeDelete(): void {
    if (!this.roleToDelete) return;

    this.rolesService.deleteRole(this.roleToDelete.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`Role '${this.roleToDelete?.name}' deleted.`);
          this.isDeleteModalOpen = false;
          this.roleToDelete = null;
          this.loadRoles();
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to delete role');
        this.isDeleteModalOpen = false;
      }
    });
  }
}
