import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilesService } from '../../core/services/files.service';
import { ToastService } from '../../core/services/toast.service';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';
import { FileItem } from '../../core/models/file.models';

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [CommonModule, FormsModule, HasPermissionDirective, PaginationComponent, ConfirmModalComponent],
  template: `
    <div class="files-page">
      <!-- Page Header -->
      <div class="page-header flex-between">
        <div>
          <h1 class="page-title">File Management</h1>
          <p class="page-subtitle">Upload, download, search, and manage system documents and assets.</p>
        </div>
        <button *appHasPermission="'Files.Upload'" class="btn btn-primary" (click)="openUploadModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>Upload File</span>
        </button>
      </div>

      <!-- Filter / Search Toolbar -->
      <div class="card mb-4">
        <div class="filter-bar flex-between">
          <div class="search-box">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              class="form-control" 
              placeholder="Search by file name or uploader..." 
              [ngModel]="searchTerm()"
              (ngModelChange)="onSearchChange($event)">
          </div>

          <div class="badge-total">
            Total Files: <strong>{{ totalCount() }}</strong>
          </div>
        </div>
      </div>

      <!-- Files Table Card -->
      <div class="card">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>File Details</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded By</th>
                <th>Upload Date</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let file of files()">
                <td>
                  <div class="file-cell">
                    <div class="file-icon-badge" [ngClass]="'file-badge-' + getFileCategory(file.extension)">
                      <!-- Word -->
                      <svg *ngIf="getFileCategory(file.extension) === 'word'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <line x1="10" y1="9" x2="8" y2="9"></line>
                      </svg>
                      <!-- PDF -->
                      <svg *ngIf="getFileCategory(file.extension) === 'pdf'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <path d="M9 13h6"></path>
                        <path d="M9 17h4"></path>
                      </svg>
                      <!-- Excel -->
                      <svg *ngIf="getFileCategory(file.extension) === 'excel'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="8" y1="13" x2="16" y2="13"></line>
                        <line x1="8" y1="17" x2="16" y2="17"></line>
                        <line x1="12" y1="10" x2="12" y2="20"></line>
                      </svg>
                      <!-- PowerPoint -->
                      <svg *ngIf="getFileCategory(file.extension) === 'powerpoint'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                      <!-- Image -->
                      <svg *ngIf="getFileCategory(file.extension) === 'image'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                      <!-- Archive -->
                      <svg *ngIf="getFileCategory(file.extension) === 'archive'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        <line x1="12" y1="11" x2="12" y2="17"></line>
                        <line x1="9" y1="14" x2="15" y2="14"></line>
                      </svg>
                      <!-- Code -->
                      <svg *ngIf="getFileCategory(file.extension) === 'code'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                      </svg>
                      <!-- Text -->
                      <svg *ngIf="getFileCategory(file.extension) === 'text'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                      <!-- Generic -->
                      <svg *ngIf="getFileCategory(file.extension) === 'generic'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                    </div>
                    <div class="file-name-container">
                      <span class="file-name" [title]="file.originalFileName">{{ file.originalFileName }}</span>
                      <span class="file-ext-tag">{{ file.extension ? file.extension.toUpperCase() : 'FILE' }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="text-xs text-muted font-mono">{{ file.contentType || 'application/octet-stream' }}</span>
                </td>
                <td>
                  <span class="badge badge-secondary">{{ file.formattedSize }}</span>
                </td>
                <td>
                  <div class="uploader-badge">
                    <span class="uploader-avatar">{{ getInitials(file.uploadedByUserName) }}</span>
                    <span class="font-medium text-sm">{{ file.uploadedByUserName }}</span>
                  </div>
                </td>
                <td class="text-xs text-muted">
                  {{ file.createdAtUtc | date:'medium' }}
                </td>
                <td style="text-align: right;">
                  <div class="action-buttons">
                    <button 
                      *appHasPermission="'Files.Download'" 
                      class="btn btn-secondary btn-sm" 
                      (click)="downloadFile(file)"
                      [disabled]="downloadingId() === file.id"
                      title="Download File">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span>{{ downloadingId() === file.id ? 'Fetching...' : 'Download' }}</span>
                    </button>

                    <button 
                      *appHasPermission="'Files.Delete'" 
                      class="btn btn-danger btn-sm" 
                      (click)="confirmDelete(file)"
                      title="Delete File">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr *ngIf="files().length === 0 && !loading()">
                <td colspan="6" class="empty-state-cell">
                  <div class="empty-state-box">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    <h4>No files found</h4>
                    <p class="text-muted text-sm">Upload files or try adjusting your search filter.</p>
                    <button *appHasPermission="'Files.Upload'" class="btn btn-primary btn-sm mt-3" (click)="openUploadModal()">
                      Upload First File
                    </button>
                  </div>
                </td>
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

    <!-- Upload Modal -->
    <div class="modal-backdrop" *ngIf="isUploadModalOpen" (click)="closeUploadModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Upload File</h3>
          <button class="btn btn-secondary btn-sm btn-icon" (click)="closeUploadModal()">✕</button>
        </div>

        <div class="modal-body">
          <div 
            class="dropzone" 
            [class.dragover]="isDragOver"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFileDrop($event)"
            (click)="fileInput.click()">
            <input 
              #fileInput 
              type="file" 
              class="hidden-file-input" 
              (change)="onFileSelected($event)">
            
            <div class="dropzone-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h4>Drag & drop file here or <span class="browse-link">browse</span></h4>
            <p class="dropzone-hint">Supports PDF, DOCX, XLSX, Images, ZIP, CSV, etc. up to 25 MB.</p>
          </div>

          <!-- Selected File Preview -->
          <div *ngIf="selectedFile" class="selected-file-card mt-3">
            <div class="selected-file-info">
              <div class="file-preview-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <div class="selected-file-meta">
                <span class="selected-file-name">{{ selectedFile.name }}</span>
                <span class="text-xs text-muted">{{ formatBytes(selectedFile.size) }}</span>
              </div>
            </div>
            <button class="btn-remove-file" (click)="removeSelectedFile($event)" title="Remove">✕</button>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="closeUploadModal()" [disabled]="uploading()">Cancel</button>
          <button 
            type="button" 
            class="btn btn-primary" 
            [disabled]="!selectedFile || uploading()" 
            (click)="submitUpload()">
            <span *ngIf="!uploading()">Start Upload</span>
            <span *ngIf="uploading()">Uploading...</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Modal -->
    <app-confirm-modal
      [isOpen]="isDeleteModalOpen"
      title="Delete File"
      [message]="deleteConfirmationMessage"
      confirmText="Delete File"
      confirmButtonClass="btn-danger"
      (confirmed)="executeDelete()"
      (cancelled)="isDeleteModalOpen = false">
    </app-confirm-modal>
  `,
  styles: [`
    .files-page {
      padding-bottom: 2rem;
    }
    .flex-between {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
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
      margin-top: 0.25rem;
    }
    .search-box {
      position: relative;
      width: 320px;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }
    .search-box .form-control {
      padding-left: 2.25rem;
    }
    .badge-total {
      font-size: 0.85rem;
      color: var(--text-muted);
      background: var(--bg-main);
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
    }
    .file-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .file-icon-badge {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #f1f5f9;
      transition: transform 0.15s ease;
    }
    .file-cell:hover .file-icon-badge {
      transform: scale(1.05);
    }
    .file-badge-word {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }
    .file-badge-pdf {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .file-badge-excel {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }
    .file-badge-powerpoint {
      background: #fff7ed;
      color: #ea580c;
      border: 1px solid #fed7aa;
    }
    .file-badge-image {
      background: #f0f9ff;
      color: #0284c7;
      border: 1px solid #bae6fd;
    }
    .file-badge-archive {
      background: #fffbeb;
      color: #d97706;
      border: 1px solid #fde68a;
    }
    .file-badge-code {
      background: #faf5ff;
      color: #9333ea;
      border: 1px solid #e9d5ff;
    }
    .file-badge-text {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .file-badge-generic {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #cbd5e1;
    }
    .file-name-container {
      display: flex;
      flex-direction: column;
      max-width: 280px;
    }
    .file-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-ext-tag {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }
    .uploader-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .uploader-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), #818cf8);
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .action-buttons {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .empty-state-cell {
      text-align: center;
      padding: 3.5rem 1.5rem !important;
    }
    .empty-state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .dropzone {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-lg);
      padding: 2.5rem 1.5rem;
      text-align: center;
      cursor: pointer;
      background: #f8fafc;
      transition: all 0.2s ease;
    }
    .dropzone:hover, .dropzone.dragover {
      border-color: var(--primary);
      background: var(--primary-light);
    }
    .dropzone-icon {
      color: var(--primary);
      margin-bottom: 0.75rem;
    }
    .dropzone h4 {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .browse-link {
      color: var(--primary);
      text-decoration: underline;
    }
    .dropzone-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }
    .hidden-file-input {
      display: none;
    }
    .selected-file-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    .selected-file-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      overflow: hidden;
    }
    .file-preview-icon {
      color: var(--primary);
    }
    .selected-file-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .selected-file-name {
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 320px;
    }
    .btn-remove-file {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .btn-remove-file:hover {
      color: var(--danger);
      background: #fee2e2;
    }
    .mt-3 {
      margin-top: 0.75rem;
    }
    .mb-4 {
      margin-bottom: 1rem;
    }
  `]
})
export class FilesComponent implements OnInit {
  private filesService = inject(FilesService);
  private toastService = inject(ToastService);

  files = signal<FileItem[]>([]);
  loading = signal(false);
  uploading = signal(false);
  downloadingId = signal<string | null>(null);

  pageNumber = signal(1);
  pageSize = signal(10);
  totalCount = signal(0);
  totalPages = signal(1);
  searchTerm = signal('');

  // Upload modal state
  isUploadModalOpen = false;
  isDragOver = false;
  selectedFile: File | null = null;

  // Delete modal state
  isDeleteModalOpen = false;
  fileToDelete: FileItem | null = null;

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading.set(true);
    this.filesService.getFiles(this.pageNumber(), this.pageSize(), this.searchTerm()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.files.set(res.data.items);
          this.totalCount.set(res.data.totalCount);
          this.totalPages.set(res.data.totalPages);
        }
      },
      error: () => {
        this.loading.set(false);
        this.toastService.error('Failed to load files.');
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.pageNumber.set(1);
    this.loadFiles();
  }

  onPageChange(page: number): void {
    this.pageNumber.set(page);
    this.loadFiles();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.loadFiles();
  }

  // Upload modal methods
  openUploadModal(): void {
    this.selectedFile = null;
    this.isDragOver = false;
    this.isUploadModalOpen = true;
  }

  closeUploadModal(): void {
    this.isUploadModalOpen = false;
    this.selectedFile = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0]);
    }
  }

  handleFileSelected(file: File): void {
    const maxSizeBytes = 25 * 1024 * 1024; // 25 MB
    if (file.size > maxSizeBytes) {
      this.toastService.error('File size exceeds the 25 MB limit.');
      return;
    }
    this.selectedFile = file;
  }

  removeSelectedFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
  }

  submitUpload(): void {
    if (!this.selectedFile) return;

    this.uploading.set(true);
    this.filesService.uploadFile(this.selectedFile).subscribe({
      next: (res) => {
        this.uploading.set(false);
        if (res.success) {
          this.toastService.success(`"${res.data.originalFileName}" uploaded successfully!`);
          this.closeUploadModal();
          this.loadFiles();
        }
      },
      error: (err) => {
        this.uploading.set(false);
        const msg = err.error?.message || 'Failed to upload file.';
        this.toastService.error(msg);
      }
    });
  }

  // Download
  downloadFile(file: FileItem): void {
    this.downloadingId.set(file.id);
    this.filesService.downloadFile(file.id, file.originalFileName).subscribe({
      next: (blob) => {
        this.downloadingId.set(null);
        this.filesService.triggerBrowserDownload(blob, file.originalFileName);
        this.toastService.success(`Downloaded "${file.originalFileName}"`);
      },
      error: () => {
        this.downloadingId.set(null);
        this.toastService.error(`Failed to download "${file.originalFileName}"`);
      }
    });
  }

  // Delete
  confirmDelete(file: FileItem): void {
    this.fileToDelete = file;
    this.isDeleteModalOpen = true;
  }

  executeDelete(): void {
    if (!this.fileToDelete) return;

    const file = this.fileToDelete;
    this.filesService.deleteFile(file.id).subscribe({
      next: (res) => {
        this.isDeleteModalOpen = false;
        this.fileToDelete = null;
        if (res.success) {
          this.toastService.success(`File "${file.originalFileName}" deleted successfully.`);
          this.loadFiles();
        }
      },
      error: (err) => {
        this.isDeleteModalOpen = false;
        this.fileToDelete = null;
        const msg = err.error?.message || 'Failed to delete file.';
        this.toastService.error(msg);
      }
    });
  }

  get deleteConfirmationMessage(): string {
    const name = this.fileToDelete?.originalFileName || 'this file';
    return `Are you sure you want to delete "${name}"?`;
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  getFileCategory(extension: string): string {
    const ext = (extension || '').toLowerCase().trim();
    switch (ext) {
      case '.doc':
      case '.docx':
        return 'word';
      case '.pdf':
        return 'pdf';
      case '.xls':
      case '.xlsx':
      case '.csv':
        return 'excel';
      case '.ppt':
      case '.pptx':
        return 'powerpoint';
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.svg':
      case '.webp':
      case '.bmp':
      case '.ico':
        return 'image';
      case '.zip':
      case '.rar':
      case '.7z':
      case '.tar':
      case '.gz':
      case '.bz2':
        return 'archive';
      case '.ts':
      case '.js':
      case '.json':
      case '.cs':
      case '.html':
      case '.css':
      case '.scss':
      case '.py':
      case '.java':
      case '.cpp':
      case '.c':
      case '.xml':
      case '.yaml':
      case '.yml':
      case '.sql':
        return 'code';
      case '.txt':
      case '.md':
      case '.log':
      case '.rtf':
        return 'text';
      default:
        return 'generic';
    }
  }
}
