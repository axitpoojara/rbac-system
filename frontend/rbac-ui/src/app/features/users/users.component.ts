import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../core/services/users.service';
import { RolesService } from '../../core/services/roles.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';
import { Role } from '../../core/models/rbac.models';
import { User } from '../../core/models/auth.models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, PaginationComponent, ConfirmModalComponent],
  template: `
    <div class="users-page">
      <div class="page-header flex-between">
        <div>
          <h1 class="page-title">User Management</h1>
          <p class="page-subtitle">Manage system users, status, and role assignments.</p>
        </div>
        <button *appHasPermission="'Users.Create'" class="btn btn-primary" (click)="openCreateModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add New User
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="card toolbar-card">
        <div class="filter-row">
          <div class="search-box">
            <input 
              type="text" 
              class="form-control" 
              placeholder="Search by name, username, email..." 
              [value]="searchTerm()" 
              (input)="onSearchChange($event)">
          </div>

          <div class="filter-box">
            <select class="form-control" (change)="onStatusFilterChange($event)">
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>

          <div class="filter-box">
            <select class="form-control" (change)="onRoleFilterChange($event)">
              <option value="">All Roles</option>
              <option *ngFor="let role of roles()" [value]="role.id">{{ role.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Username</th>
                <th>Assigned Roles</th>
                <th>Status</th>
                <th>Created</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users()">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar-sm">{{ getInitials(user) }}</div>
                    <div>
                      <div class="font-semibold">{{ user.fullName || user.userName }}</div>
                      <div class="text-muted text-xs">{{ user.email }}</div>
                    </div>
                  </div>
                </td>
                <td><code>{{ user.userName }}</code></td>
                <td>
                  <div class="roles-pills">
                    <span *ngFor="let r of user.roles" class="badge badge-primary">{{ r }}</span>
                    <span *ngIf="user.roles.length === 0" class="text-muted text-xs">None</span>
                  </div>
                </td>
                <td>
                  <button 
                    *appHasPermission="'Users.Edit'"
                    class="badge btn-status" 
                    [class.badge-success]="user.isActive" 
                    [class.badge-danger]="!user.isActive"
                    [disabled]="isSelf(user)"
                    (click)="toggleStatus(user)"
                    [title]="isSelf(user) ? 'You cannot deactivate your own account' : 'Click to toggle status'">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </button>
                  <span 
                    *ngIf="!canEditUsers()" 
                    class="badge" 
                    [class.badge-success]="user.isActive" 
                    [class.badge-danger]="!user.isActive">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-xs text-muted">{{ user.createdAtUtc | date:'mediumDate' }}</td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button 
                      *appHasPermission="'Users.Edit'" 
                      class="btn btn-secondary btn-sm" 
                      (click)="openEditModal(user)">
                      Edit
                    </button>
                    <button 
                      *appHasPermission="'Users.Delete'" 
                      class="btn btn-danger btn-sm" 
                      [disabled]="isSelf(user) || isSuperAdminUser(user)"
                      (click)="confirmDelete(user)">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="users().length === 0">
                <td colspan="6" class="text-center py-4 text-muted">No users found matching criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-pagination
          [pageNumber]="pageNumber()"
          [pageSize]="pageSize()"
          [totalCount]="totalCount()"
          [totalPages]="totalPages()"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>
    </div>

    <!-- Create User Modal -->
    <div class="modal-backdrop" *ngIf="isCreateModalOpen" (click)="closeCreateModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Add New User</h3>
          <button class="btn btn-secondary btn-sm btn-icon" (click)="closeCreateModal()">✕</button>
        </div>
        <form [formGroup]="createForm" (ngSubmit)="submitCreate()">
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input type="text" class="form-control" formControlName="firstName" placeholder="First Name">
              </div>
              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input type="text" class="form-control" formControlName="lastName" placeholder="Last Name">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Username *</label>
              <input type="text" class="form-control" formControlName="userName" placeholder="e.g. john_doe">
              <div *ngIf="createForm.get('userName')?.touched && createForm.get('userName')?.invalid" class="form-error">
                Username is required.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email *</label>
              <input type="email" class="form-control" formControlName="email" placeholder="user@gmail.com">
              <div *ngIf="createForm.get('email')?.touched && createForm.get('email')?.invalid" class="form-error">
                Valid email is required.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Password *</label>
              <div class="password-input-group">
                <input 
                  [type]="showPassword() ? 'text' : 'password'" 
                  class="form-control" 
                  formControlName="password" 
                  placeholder="Password (min 6 characters)">
                <button 
                  type="button" 
                  class="password-toggle-btn" 
                  (click)="showPassword.set(!showPassword())"
                  [title]="showPassword() ? 'Hide password' : 'Show password'">
                  <svg *ngIf="!showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg *ngIf="showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
              <div *ngIf="createForm.get('password')?.touched && createForm.get('password')?.invalid" class="form-error">
                Password is required (min 6 chars).
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Assign Roles</label>
              <div class="roles-checklist">
                <label *ngFor="let role of roles()" class="checkbox-label">
                  <input type="checkbox" [value]="role.id" (change)="onRoleCheckboxToggle(role.id, $event, true)">
                  <span>{{ role.name }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="isActive">
                <span>Active Account</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeCreateModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="createForm.invalid">Create User</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div class="modal-backdrop" *ngIf="isEditModalOpen" (click)="closeEditModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Edit User: {{ selectedUser?.userName }}</h3>
          <button class="btn btn-secondary btn-sm btn-icon" (click)="closeEditModal()">✕</button>
        </div>
        <form [formGroup]="editForm" (ngSubmit)="submitEdit()">
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input type="text" class="form-control" formControlName="firstName">
              </div>
              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input type="text" class="form-control" formControlName="lastName">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email *</label>
              <input type="email" class="form-control" formControlName="email">
            </div>

            <div class="form-group">
              <label class="form-label">Assign Roles</label>
              <div class="roles-checklist">
                <label *ngFor="let role of roles()" class="checkbox-label">
                  <input type="checkbox" 
                         [checked]="selectedEditRoleIds.includes(role.id)"
                         (change)="onRoleCheckboxToggle(role.id, $event, false)">
                  <span>{{ role.name }}</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="isActive" [disabled]="isSelf(selectedUser)">
                <span>Active Account</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeEditModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="editForm.invalid">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <app-confirm-modal
      [isOpen]="isDeleteModalOpen"
      title="Delete User"
      [message]="'Are you sure you want to permanently delete user ' + (userToDelete?.userName || '') + '?'"
      confirmText="Delete"
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
    .toolbar-card {
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .filter-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .search-box {
      flex: 2;
      min-width: 250px;
    }
    .filter-box {
      flex: 1;
      min-width: 160px;
    }
    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-avatar-sm {
      width: 32px;
      height: 32px;
      background: #e0e7ff;
      color: #4338ca;
      font-weight: 600;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }
    .roles-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .btn-status {
      cursor: pointer;
      border: none;
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
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      cursor: pointer;
      user-select: none;
    }
    .roles-checklist {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      padding: 0.5rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    .font-semibold { font-weight: 600; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.85rem; }
  `]
})
export class UsersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private rolesService = inject(RolesService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  totalCount = signal(0);
  pageNumber = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);
  searchTerm = signal('');
  isActiveFilter = signal<boolean | undefined>(undefined);
  roleIdFilter = signal<string | undefined>(undefined);

  isCreateModalOpen = false;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  selectedUser: User | null = null;
  userToDelete: User | null = null;
  selectedEditRoleIds: string[] = [];
  selectedCreateRoleIds: string[] = [];
  showPassword = signal(false);

  createForm: FormGroup = this.fb.group({
    userName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    firstName: [''],
    lastName: [''],
    isActive: [true]
  });

  editForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: [''],
    lastName: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
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

  loadUsers(): void {
    this.usersService.getUsers(
      this.pageNumber(),
      this.pageSize(),
      this.searchTerm(),
      this.isActiveFilter(),
      this.roleIdFilter()
    ).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.users.set(res.data.items);
          this.totalCount.set(res.data.totalCount);
          this.totalPages.set(res.data.totalPages);
        }
      },
      error: (err) => {
        this.toastService.error('Failed to load users: ' + (err.error?.message || err.message));
      }
    });
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  onStatusFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.isActiveFilter.set(val === '' ? undefined : val === 'true');
    this.pageNumber.set(1);
    this.loadUsers();
  }

  onRoleFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.roleIdFilter.set(val === '' ? undefined : val);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadUsers();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.loadUsers();
  }

  getInitials(user: User): string {
    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    return (user.userName || 'U').substring(0, 2).toUpperCase();
  }

  isSelf(user: User | null): boolean {
    if (!user) return false;
    return this.authService.currentUser()?.id === user.id;
  }

  isSuperAdminUser(user: User | null): boolean {
    if (!user) return false;
    return user.roles.includes('SuperAdmin');
  }

  canEditUsers(): boolean {
    return this.authService.hasPermission('Users.Edit');
  }

  toggleStatus(user: User): void {
    if (this.isSelf(user)) return;

    const newStatus = !user.isActive;
    this.usersService.toggleStatus(user.id, newStatus).subscribe({
      next: (res) => {
        if (res.success) {
          user.isActive = newStatus;
          this.toastService.success(`User '${user.userName}' set to ${newStatus ? 'Active' : 'Inactive'}`);
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to update user status');
      }
    });
  }

  // Create Modal
  openCreateModal(): void {
    this.createForm.reset({ isActive: true });
    this.selectedCreateRoleIds = [];
    this.showPassword.set(false);
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  onRoleCheckboxToggle(roleId: string, event: Event, isCreate: boolean): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (isCreate) {
      if (checked) {
        this.selectedCreateRoleIds.push(roleId);
      } else {
        this.selectedCreateRoleIds = this.selectedCreateRoleIds.filter(id => id !== roleId);
      }
    } else {
      if (checked) {
        this.selectedEditRoleIds.push(roleId);
      } else {
        this.selectedEditRoleIds = this.selectedEditRoleIds.filter(id => id !== roleId);
      }
    }
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;

    const dto = {
      ...this.createForm.value,
      roleIds: this.selectedCreateRoleIds
    };

    this.usersService.createUser(dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('User created successfully');
          this.closeCreateModal();
          this.loadUsers();
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to create user');
      }
    });
  }

  // Edit Modal
  openEditModal(user: User): void {
    this.selectedUser = user;
    this.selectedEditRoleIds = [...(user.roleIds || [])];
    this.editForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isActive: user.isActive
    });
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedUser = null;
  }

  submitEdit(): void {
    if (!this.selectedUser || this.editForm.invalid) return;

    const dto = {
      ...this.editForm.value,
      roleIds: this.selectedEditRoleIds
    };

    this.usersService.updateUser(this.selectedUser.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success('User updated successfully');
          this.closeEditModal();
          this.loadUsers();
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to update user');
      }
    });
  }

  // Delete
  confirmDelete(user: User): void {
    this.userToDelete = user;
    this.isDeleteModalOpen = true;
  }

  executeDelete(): void {
    if (!this.userToDelete) return;

    this.usersService.deleteUser(this.userToDelete.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`User '${this.userToDelete?.userName}' deleted.`);
          this.isDeleteModalOpen = false;
          this.userToDelete = null;
          this.loadUsers();
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to delete user');
        this.isDeleteModalOpen = false;
      }
    });
  }
}
