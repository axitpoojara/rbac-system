import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PermissionsService } from '../../core/services/permissions.service';
import { ToastService } from '../../core/services/toast.service';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ModulePermissions, Permission } from '../../core/models/rbac.models';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HasPermissionDirective],
  template: `
    <div class="permissions-page">
      <div class="page-header flex-between">
        <div>
          <h1 class="page-title">Permissions Registry</h1>
          <p class="page-subtitle">Granular system capabilities categorized by business domain module.</p>
        </div>
        <button *appHasPermission="'Permissions.Manage'" class="btn btn-primary" (click)="openCreateModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Register New Permission
        </button>
      </div>

      <!-- Search Toolbar -->
      <div class="card toolbar-card">
        <input 
          type="text" 
          class="form-control" 
          placeholder="Filter permissions by code, name or module..." 
          [value]="searchTerm()" 
          (input)="onSearchChange($event)">
      </div>

      <!-- Modules List -->
      <div class="modules-container">
        <div class="card module-card" *ngFor="let mod of filteredModules()">
          <div class="card-header">
            <div>
              <h2 class="card-title">{{ mod.module }} Module</h2>
              <div class="card-subtitle">{{ mod.permissions.length }} capabilities registered</div>
            </div>
            <span class="badge badge-primary">{{ mod.module }}</span>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Permission Name</th>
                  <th>Permission Code</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let perm of mod.permissions">
                  <td class="font-semibold">{{ perm.name }}</td>
                  <td><code>{{ perm.code }}</code></td>
                  <td class="text-muted text-sm">{{ perm.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div *ngIf="filteredModules().length === 0" class="card text-center py-4 text-muted">
          No permissions match the filter criteria.
        </div>
      </div>
    </div>

    <!-- Create Permission Modal -->
    <div class="modal-backdrop" *ngIf="isCreateModalOpen" (click)="closeCreateModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Register System Permission</h3>
          <button class="btn btn-secondary btn-sm btn-icon" (click)="closeCreateModal()">✕</button>
        </div>
        <form [formGroup]="createPermForm" (ngSubmit)="submitCreate()">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Module / Domain *</label>
              <input type="text" class="form-control" formControlName="module" placeholder="e.g. Invoicing, Inventory, Users">
            </div>

            <div class="form-group">
              <label class="form-label">Permission Name *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="e.g. Approve Invoices">
            </div>

            <div class="form-group">
              <label class="form-label">Permission Code *</label>
              <input type="text" class="form-control" formControlName="code" placeholder="e.g. Invoices.Approve">
              <span class="text-xs text-muted">Must be unique across the entire system.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-control" formControlName="description" rows="2" placeholder="Briefly state what this capability permits"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeCreateModal()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="createPermForm.invalid">Register Permission</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .flex-between {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .toolbar-card {
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .module-card {
      margin-bottom: 1.5rem;
    }
    .font-semibold { font-weight: 600; }
    .text-sm { font-size: 0.85rem; }
    .text-xs { font-size: 0.75rem; }
  `]
})
export class PermissionsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private permsService = inject(PermissionsService);
  private toastService = inject(ToastService);

  groupedModules = signal<ModulePermissions[]>([]);
  searchTerm = signal('');
  isCreateModalOpen = false;

  createPermForm: FormGroup = this.fb.group({
    module: ['', [Validators.required]],
    name: ['', [Validators.required]],
    code: ['', [Validators.required]],
    description: ['']
  });

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.permsService.getGroupedPermissions().subscribe({
      next: (res) => {
        if (res.success) {
          this.groupedModules.set(res.data);
        }
      }
    });
  }

  onSearchChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
  }

  filteredModules(): ModulePermissions[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.groupedModules();

    return this.groupedModules()
      .map(mod => ({
        module: mod.module,
        permissions: mod.permissions.filter(p =>
          p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          p.module.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
        )
      }))
      .filter(mod => mod.permissions.length > 0);
  }

  openCreateModal(): void {
    this.createPermForm.reset();
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  submitCreate(): void {
    if (this.createPermForm.invalid) return;

    this.permsService.createPermission(this.createPermForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`Permission '${res.data.code}' registered.`);
          this.closeCreateModal();
          this.loadPermissions();
        }
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Failed to register permission');
      }
    });
  }
}
