import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenusService } from '../../core/services/menus.service';
import { PermissionsService } from '../../core/services/permissions.service';
import { NavigationService } from '../../core/services/navigation.service';
import { ToastService } from '../../core/services/toast.service';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';
import { Menu, Permission } from '../../core/models/rbac.models';

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective, ConfirmModalComponent],
  template: `
    <div class="menus-page">
      <div class="page-header flex-between">
        <div>
          <h1 class="page-title">Navigation Menu Management</h1>
          <p class="page-subtitle">Configure dynamic hierarchical navigation menus and permission gates.</p>
        </div>
        <button *appHasPermission="'Menus.Manage'" class="btn btn-primary" (click)="openCreateModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Menu Item
        </button>
      </div>

      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Menu Item</th>
                <th>Target Route</th>
                <th>Icon</th>
                <th>Order</th>
                <th>Parent Menu</th>
                <th>Required Permission</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let menu of menus()">
                <td>
                  <div class="menu-name-cell">
                    <span *ngIf="menu.parentId" class="tree-indent">↳</span>
                    <strong>{{ menu.title }}</strong>
                  </div>
                </td>
                <td><code>{{ menu.route }}</code></td>
                <td><span class="badge badge-muted">{{ menu.icon || 'default' }}</span></td>
                <td>{{ menu.displayOrder }}</td>
                <td>{{ menu.parentTitle || '— (Root)' }}</td>
                <td>
                  <span *ngIf="menu.requiredPermission" class="badge badge-primary">{{ menu.requiredPermission }}</span>
                  <span *ngIf="!menu.requiredPermission" class="text-muted text-xs">Public to Role</span>
                </td>
                <td>
                  <span class="badge" [class.badge-success]="menu.isActive" [class.badge-danger]="!menu.isActive">
                    {{ menu.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button *appHasPermission="'Menus.Manage'" class="btn btn-secondary btn-sm" (click)="openEditModal(menu)">Edit</button>
                    <button *appHasPermission="'Menus.Manage'" class="btn btn-danger btn-sm" (click)="confirmDelete(menu)">Delete</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="menus().length === 0">
                <td colspan="8" class="text-center py-4 text-muted">No navigation menus found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create Menu Modal -->
    <div class="modal-backdrop" *ngIf="isCreateModalOpen" (click)="closeCreateModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Create Menu Item</h3>
          <button class="btn btn-secondary btn-sm btn-icon" (click)="closeCreateModal()">✕</button>
        </div>
        <form [formGroup]="createMenuForm" (ngSubmit)="submitCreate()">
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Menu Title *</label>
                <input type="text" class="form-control" formControlName="title" placeholder="e.g. Reports">
              </div>
              <div class="form-group">
                <label class="form-label">Route *</label>
                <input type="text" class="form-control" formControlName="route" placeholder="e.g. /reports">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Icon Key</label>
                <select class="form-control" formControlName="icon">
                  <option value="dashboard">dashboard</option>
                  <option value="users">users</option>
                  <option value="user">user</option>
                  <option value="shield">shield</option>
                  <option value="settings">settings</option>
                  <option value="menu">menu</option>
                  <option value="key">key</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Display Order</label>
                <input type="number" class="form-control" formControlName="displayOrder">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Parent Menu</label>
              <select class="form-control" formControlName="parentId">
                <option [ngValue]="null">None (Root Level)</option>
                <option *ngFor="let m of rootMenus()" [value]="m.id">{{ m.title }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Required Permission (Optional)</label>
              <select class="form-control" formControlName="requiredPermission">
                <option value="">None (Accessible to assigned roles)</option>
                <option *ngFor="let p of permissions()" [value]="p.code">{{ p.code }} ({{ p.name }})</option>
              </select>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="isActive">
                <span>Active Menu Item</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeCreateModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="createMenuForm.invalid">Create Menu</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Menu Modal -->
    <div class="modal-backdrop" *ngIf="isEditModalOpen" (click)="closeEditModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Edit Menu Item: {{ selectedMenu?.title }}</h3>
          <button class="btn btn-secondary btn-sm btn-icon" (click)="closeEditModal()">✕</button>
        </div>
        <form [formGroup]="editMenuForm" (ngSubmit)="submitEdit()">
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Menu Title *</label>
                <input type="text" class="form-control" formControlName="title">
              </div>
              <div class="form-group">
                <label class="form-label">Route *</label>
                <input type="text" class="form-control" formControlName="route">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Icon Key</label>
                <select class="form-control" formControlName="icon">
                  <option value="dashboard">dashboard</option>
                  <option value="users">users</option>
                  <option value="user">user</option>
                  <option value="shield">shield</option>
                  <option value="settings">settings</option>
                  <option value="menu">menu</option>
                  <option value="key">key</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Display Order</label>
                <input type="number" class="form-control" formControlName="displayOrder">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Parent Menu</label>
              <select class="form-control" formControlName="parentId">
                <option [ngValue]="null">None (Root Level)</option>
                <option *ngFor="let m of getAvailableParents(selectedMenu?.id)" [value]="m.id">{{ m.title }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Required Permission (Optional)</label>
              <select class="form-control" formControlName="requiredPermission">
                <option value="">None (Accessible to assigned roles)</option>
                <option *ngFor="let p of permissions()" [value]="p.code">{{ p.code }} ({{ p.name }})</option>
              </select>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="isActive">
                <span>Active Menu Item</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeEditModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="editMenuForm.invalid">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <app-confirm-modal
      [isOpen]="isDeleteModalOpen"
      title="Delete Menu Item"
      [message]="'Are you sure you want to delete menu item ' + (menuToDelete?.title || '') + '?'"
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
    .menu-name-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tree-indent {
      color: var(--text-muted);
      font-weight: bold;
      margin-left: 1rem;
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
    .text-xs { font-size: 0.75rem; }
  `]
})
export class MenusComponent implements OnInit {
  private fb = inject(FormBuilder);
  private menusService = inject(MenusService);
  private permsService = inject(PermissionsService);
  private navService = inject(NavigationService);
  private toastService = inject(ToastService);

  menus = signal<Menu[]>([]);
  permissions = signal<Permission[]>([]);

  isCreateModalOpen = false;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  selectedMenu: Menu | null = null;
  menuToDelete: Menu | null = null;

  createMenuForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    route: ['', [Validators.required]],
    icon: ['menu'],
    displayOrder: [1],
    parentId: [null],
    requiredPermission: [''],
    isActive: [true]
  });

  editMenuForm: FormGroup = this.fb.group({
    title: ['', [Validators.required]],
    route: ['', [Validators.required]],
    icon: ['menu'],
    displayOrder: [1],
    parentId: [null],
    requiredPermission: [''],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadMenus();
    this.loadPermissions();
  }

  loadMenus(): void {
    this.menusService.getMenus().subscribe({
      next: (res) => {
        if (res.success) {
          this.menus.set(res.data);
        }
      }
    });
  }

  loadPermissions(): void {
    this.permsService.getPermissions().subscribe({
      next: (res) => {
        if (res.success) {
          this.permissions.set(res.data);
        }
      }
    });
  }

  rootMenus(): Menu[] {
    return this.menus().filter(m => !m.parentId);
  }

  getAvailableParents(currentMenuId?: string): Menu[] {
    return this.menus().filter(m => !m.parentId && m.id !== currentMenuId);
  }

  openCreateModal(): void {
    this.createMenuForm.reset({ icon: 'menu', displayOrder: 1, isActive: true, parentId: null, requiredPermission: '' });
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  submitCreate(): void {
    if (this.createMenuForm.invalid) return;

    const val = this.createMenuForm.value;
    const dto = {
      title: val.title,
      route: val.route,
      icon: val.icon,
      displayOrder: Number(val.displayOrder),
      parentId: val.parentId || null,
      requiredPermission: val.requiredPermission || null,
      isActive: !!val.isActive
    };

    this.menusService.createMenu(dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`Menu item '${res.data.title}' created.`);
          this.closeCreateModal();
          this.loadMenus();
          this.navService.loadNavMenus().subscribe(); // refresh active sidebar
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to create menu item');
      }
    });
  }

  openEditModal(menu: Menu): void {
    this.selectedMenu = menu;
    this.editMenuForm.patchValue({
      title: menu.title,
      route: menu.route,
      icon: menu.icon,
      displayOrder: menu.displayOrder,
      parentId: menu.parentId,
      requiredPermission: menu.requiredPermission || '',
      isActive: menu.isActive
    });
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedMenu = null;
  }

  submitEdit(): void {
    if (!this.selectedMenu || this.editMenuForm.invalid) return;

    const val = this.editMenuForm.value;
    const dto = {
      title: val.title,
      route: val.route,
      icon: val.icon,
      displayOrder: Number(val.displayOrder),
      parentId: val.parentId || null,
      requiredPermission: val.requiredPermission || null,
      isActive: !!val.isActive
    };

    this.menusService.updateMenu(this.selectedMenu.id, dto).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`Menu item '${res.data.title}' updated.`);
          this.closeEditModal();
          this.loadMenus();
          this.navService.loadNavMenus().subscribe(); // refresh active sidebar
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to update menu item');
      }
    });
  }

  confirmDelete(menu: Menu): void {
    this.menuToDelete = menu;
    this.isDeleteModalOpen = true;
  }

  executeDelete(): void {
    if (!this.menuToDelete) return;

    this.menusService.deleteMenu(this.menuToDelete.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`Menu item '${this.menuToDelete?.title}' deleted.`);
          this.isDeleteModalOpen = false;
          this.menuToDelete = null;
          this.loadMenus();
          this.navService.loadNavMenus().subscribe(); // refresh active sidebar
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to delete menu item');
        this.isDeleteModalOpen = false;
      }
    });
  }
}
