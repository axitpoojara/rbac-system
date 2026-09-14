import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EmailTemplatesService } from '../../core/services/email-templates.service';
import { ToastService } from '../../core/services/toast.service';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';
import { RichTextEditorComponent } from '../../shared/components/rich-text-editor.component';
import { EmailTemplate, CreateEmailTemplateDto, UpdateEmailTemplateDto } from '../../core/models/email-template.models';

@Component({
  selector: 'app-email-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HasPermissionDirective,
    ConfirmModalComponent,
    RichTextEditorComponent
  ],
  template: `
    <div class="templates-page">
      <!-- Header -->
      <div class="page-header flex-between">
        <div>
          <h1 class="page-title">Email Template Studio</h1>
          <p class="page-subtitle">
            Customize branding, design transactional HTML emails, and manage dynamic placeholder parameters.
          </p>
        </div>
        <button
          *appHasPermission="'EmailTemplates.Create'"
          class="btn btn-primary"
          (click)="openCreateModal()"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Template
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-state card">
        <div class="spinner"></div>
        <p>Loading email templates...</p>
      </div>

      <!-- Templates Grid -->
      <div *ngIf="!loading()" class="template-cards-grid">
        <div *ngFor="let t of templates()" class="card template-card" [class.card-disabled]="!t.isActive">
          <div class="template-card-header">
            <div class="header-left">
              <div class="template-icon-wrapper" [class.icon-system]="t.isSystemTemplate">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <div>
                <h3 class="template-title">{{ t.name }}</h3>
                <code class="template-key-badge">{{ t.templateKey }}</code>
              </div>
            </div>
            <div class="header-right">
              <span *ngIf="t.isSystemTemplate" class="badge badge-primary">System</span>
              <span *ngIf="!t.isSystemTemplate" class="badge badge-muted">Custom</span>
              <span class="badge" [class.badge-success]="t.isActive" [class.badge-danger]="!t.isActive">
                {{ t.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <p class="template-desc">{{ t.description || 'No description provided.' }}</p>

          <div class="template-subject-preview">
            <span class="subject-label">Subject:</span>
            <span class="subject-text">{{ t.subject }}</span>
          </div>

          <!-- Variable Pills -->
          <div class="variables-section" *ngIf="t.availableVariables">
            <span class="variables-label">Variables:</span>
            <div class="variables-pills">
              <span *ngFor="let v of parseVariables(t.availableVariables)" class="var-pill">
                {{ v }}
              </span>
            </div>
          </div>

          <div class="template-card-footer">
            <div class="text-muted text-xs">
              Updated: {{ t.updatedAtUtc || t.createdAtUtc | date:'mediumDate' }}
            </div>
            <div class="action-buttons">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="openQuickTestModal(t)"
                title="Send Test Email"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Test
              </button>
              <button
                *appHasPermission="'EmailTemplates.Update'"
                type="button"
                class="btn btn-primary btn-sm"
                (click)="openEditModal(t)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Edit & Preview
              </button>
              <ng-container *ngIf="!t.isSystemTemplate">
                <button
                  *appHasPermission="'EmailTemplates.Delete'"
                  type="button"
                  class="btn btn-danger btn-sm btn-icon"
                  (click)="confirmDelete(t)"
                  title="Delete Template"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                  </svg>
                </button>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

      <!-- Full Screen / Large Edit & Preview Modal -->
      <div class="modal-backdrop" *ngIf="showEditorModal">
        <div class="modal-content modal-xl" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">{{ isEditMode ? 'Edit Email Template' : 'Create Email Template' }}</h3>
              <p class="modal-subtitle">{{ formData.name || 'Configure template properties and rich HTML layout' }}</p>
            </div>
            <div class="modal-header-actions">
              <!-- Active Tabs -->
              <div class="tab-switcher">
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'editor'"
                  (click)="activeTab = 'editor'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Template Editor
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'preview'"
                  (click)="activeTab = 'preview'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  Live Preview
                </button>
                <button
                  type="button"
                  class="tab-btn"
                  [class.active]="activeTab === 'test'"
                  (click)="activeTab = 'test'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Send Test Email
                </button>
              </div>
              <button class="btn btn-secondary btn-sm btn-icon" (click)="closeEditorModal()">✕</button>
            </div>
          </div>

          <div class="modal-body modal-body-scrollable">
            <!-- TAB 1: Editor -->
            <div *ngIf="activeTab === 'editor'" class="editor-tab-content">
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label required">Template Identifier Key</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="formData.templateKey"
                    [disabled]="isEditMode"
                    placeholder="e.g. TemporaryPassword"
                  />
                  <small class="form-help">Unique internal key referenced in backend code.</small>
                </div>

                <div class="form-group">
                  <label class="form-label required">Template Display Name</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="formData.name"
                    placeholder="e.g. Temporary Password Notification"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Email Subject Line</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="formData.subject"
                  placeholder="e.g. Your One-Time Login Code - {{ '{{' }}CompanyName{{ '}}' }}"
                />
                <small class="form-help">Supports placeholder variables like <code>{{ '{{' }}UserName{{ '}}' }}</code>, <code>{{ '{{' }}CompanyName{{ '}}' }}</code>.</small>
              </div>

              <div class="form-group">
                <label class="form-label">Available Placeholders (Comma-separated)</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="formData.availableVariables"
                  placeholder="{{ '{{' }}UserName{{ '}}' }}, {{ '{{' }}Email{{ '}}' }}, {{ '{{' }}TempPassword{{ '}}' }}"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Template Description</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="formData.description"
                  placeholder="Brief note about when this email is dispatched."
                />
              </div>

              <div class="form-group-checkbox">
                <label class="checkbox-container">
                  <input type="checkbox" [(ngModel)]="formData.isActive" />
                  <span class="checkbox-label"><strong>Active</strong> (Emails will use this template when dispatched)</span>
                </label>
              </div>

              <!-- Rich Text Editor -->
              <div class="form-group">
                <label class="form-label required">Email Rich HTML Body</label>
                <app-rich-text-editor
                  [(value)]="formData.bodyHtml"
                  [variables]="formData.availableVariables"
                  placeholder="Design your email HTML layout here..."
                ></app-rich-text-editor>
              </div>
            </div>

            <!-- TAB 2: Live Preview -->
            <div *ngIf="activeTab === 'preview'" class="preview-tab-content">
              <div class="preview-toolbar flex-between">
                <div class="preview-device-toggle">
                  <button
                    type="button"
                    class="btn btn-sm"
                    [class.btn-primary]="previewDevice === 'desktop'"
                    [class.btn-secondary]="previewDevice !== 'desktop'"
                    (click)="previewDevice = 'desktop'"
                  >
                    Desktop (600px+)
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm"
                    [class.btn-primary]="previewDevice === 'mobile'"
                    [class.btn-secondary]="previewDevice !== 'mobile'"
                    (click)="previewDevice = 'mobile'"
                  >
                    Mobile (375px)
                  </button>
                </div>
                <div class="preview-subject-pill">
                  <strong>Subject:</strong> {{ renderedPreviewSubject }}
                </div>
              </div>

              <!-- Device Simulation Frame -->
              <div class="preview-viewport-wrapper">
                <div
                  class="preview-viewport"
                  [class.viewport-mobile]="previewDevice === 'mobile'"
                  [class.viewport-desktop]="previewDevice === 'desktop'"
                >
                  <div class="preview-email-frame" [innerHTML]="renderedPreviewHtml"></div>
                </div>
              </div>
            </div>

            <!-- TAB 3: Send Test Email -->
            <div *ngIf="activeTab === 'test'" class="test-tab-content">
              <div class="card test-email-box">
                <div class="test-header">
                  <div class="test-icon">✉️</div>
                  <div>
                    <h4>Send Live Test Email</h4>
                    <p class="text-muted">
                      Verify your design, responsive HTML styling, and formatting directly in your inbox.
                    </p>
                  </div>
                </div>

                <div class="form-group" style="margin-top: 16px;">
                  <label class="form-label required">Recipient Email Address</label>
                  <input
                    type="email"
                    class="form-control"
                    [(ngModel)]="testRecipientEmail"
                    placeholder="poojara.poojara123@gmail.com"
                  />
                  <small class="form-help">
                    The email will be sent via configured Gmail SMTP credentials with test placeholder values substituted.
                  </small>
                </div>

                <div class="test-summary">
                  <p><strong>Subject to Send:</strong> [TEST EMAIL] {{ renderedPreviewSubject }}</p>
                </div>

                <div style="margin-top: 20px;">
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="sendingTestEmail() || !testRecipientEmail"
                    (click)="sendTestEmailNow()"
                  >
                    <span *ngIf="sendingTestEmail()" class="spinner-sm"></span>
                    <span *ngIf="!sendingTestEmail()">Send Test Email Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer flex-between">
            <div>
              <button
                type="button"
                class="btn btn-secondary"
                (click)="activeTab = 'preview'"
                *ngIf="activeTab === 'editor'"
              >
                Preview Output ➔
              </button>
            </div>
            <div class="footer-actions">
              <button type="button" class="btn btn-secondary" (click)="closeEditorModal()">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="saving() || !formData.name || !formData.subject || !formData.bodyHtml"
                (click)="saveTemplate()"
              >
                <span *ngIf="saving()" class="spinner-sm"></span>
                <span *ngIf="!saving()">{{ isEditMode ? 'Save Changes' : 'Create Template' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Test Email Modal -->
      <div class="modal-backdrop" *ngIf="showQuickTestModal">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Send Test: {{ quickTestTemplate?.name }}</h3>
            <button class="btn btn-secondary btn-sm btn-icon" (click)="showQuickTestModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label required">Recipient Email Address</label>
              <input
                type="email"
                class="form-control"
                [(ngModel)]="testRecipientEmail"
                placeholder="poojara.poojara123@gmail.com"
              />
            </div>
            <p class="text-muted text-sm">
              Subject: <strong>{{ quickTestTemplate?.subject }}</strong>
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="showQuickTestModal = false">Cancel</button>
            <button
              class="btn btn-primary"
              [disabled]="sendingTestEmail() || !testRecipientEmail"
              (click)="sendQuickTestEmail()"
            >
              <span *ngIf="sendingTestEmail()" class="spinner-sm"></span>
              <span *ngIf="!sendingTestEmail()">Send Email</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Confirm Delete Modal -->
      <app-confirm-modal
        [isOpen]="showDeleteModal"
        title="Delete Email Template"
        [message]="deleteModalMessage"
        confirmText="Delete Template"
        confirmButtonClass="btn-danger"
        (confirmed)="executeDelete()"
        (cancelled)="showDeleteModal = false"
      ></app-confirm-modal>
    </div>
  `,
  styles: [`
    .templates-page {
      padding-bottom: 40px;
    }

    .template-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .template-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .template-card:hover {
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }

    .card-disabled {
      opacity: 0.65;
      background: #f8fafc;
    }

    .template-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .template-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eef2ff;
      color: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .template-icon-wrapper.icon-system {
      background: #f0fdf4;
      color: #16a34a;
    }

    .template-title {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }

    .template-key-badge {
      font-size: 11px;
      background: #f1f5f9;
      color: #475569;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
    }

    .header-right {
      display: flex;
      gap: 6px;
    }

    .template-desc {
      color: #64748b;
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 16px;
      flex-grow: 1;
    }

    .template-subject-preview {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      margin-bottom: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subject-label {
      font-weight: 600;
      color: #475569;
      margin-right: 6px;
    }

    .subject-text {
      color: #1e293b;
    }

    .variables-section {
      margin-bottom: 16px;
    }

    .variables-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 6px;
    }

    .variables-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .var-pill {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #4f46e5;
      font-size: 11px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .template-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #f1f5f9;
      padding-top: 14px;
      margin-top: auto;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    /* Modal Styling */
    .modal-xl {
      width: 92vw;
      max-width: 1080px;
      height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .modal-header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .tab-switcher {
      display: flex;
      background: #f1f5f9;
      padding: 3px;
      border-radius: 8px;
      gap: 2px;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      transition: all 0.15s;
    }

    .tab-btn:hover {
      color: #0f172a;
    }

    .tab-btn.active {
      background: #ffffff;
      color: #4f46e5;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .modal-body-scrollable {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group-checkbox {
      margin-bottom: 16px;
    }

    .checkbox-container {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }

    /* Preview Tab */
    .preview-toolbar {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 20px;
    }

    .preview-device-toggle {
      display: flex;
      gap: 6px;
    }

    .preview-subject-pill {
      font-size: 13px;
      color: #334155;
    }

    .preview-viewport-wrapper {
      display: flex;
      justify-content: center;
      background: #e2e8f0;
      border-radius: 12px;
      padding: 30px 20px;
      min-height: 500px;
    }

    .preview-viewport {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      width: 100%;
    }

    .viewport-desktop {
      max-width: 680px;
    }

    .viewport-mobile {
      max-width: 375px;
      border: 10px solid #1e293b;
      border-radius: 36px;
      padding: 8px 4px;
    }

    .preview-email-frame {
      padding: 10px;
      min-height: 400px;
    }

    /* Test Tab */
    .test-tab-content {
      display: flex;
      justify-content: center;
      padding: 20px 0;
    }

    .test-email-box {
      max-width: 540px;
      width: 100%;
      padding: 28px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .test-header {
      display: flex;
      gap: 14px;
      align-items: center;
    }

    .test-icon {
      font-size: 32px;
    }

    .test-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      font-size: 13px;
      color: #334155;
      margin-top: 14px;
    }

    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.8s linear infinite;
      margin-right: 6px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class EmailTemplatesComponent implements OnInit {
  private templatesService = inject(EmailTemplatesService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);

  templates = signal<EmailTemplate[]>([]);
  loading = signal(false);
  saving = signal(false);
  sendingTestEmail = signal(false);

  // Editor Modal State
  showEditorModal = false;
  isEditMode = false;
  activeTab: 'editor' | 'preview' | 'test' = 'editor';
  previewDevice: 'desktop' | 'mobile' = 'desktop';

  currentTemplateId: string | null = null;
  formData: {
    templateKey: string;
    name: string;
    description: string;
    subject: string;
    bodyHtml: string;
    availableVariables: string;
    isActive: boolean;
  } = {
    templateKey: '',
    name: '',
    description: '',
    subject: '',
    bodyHtml: '',
    availableVariables: '',
    isActive: true
  };

  // Test email state
  testRecipientEmail = 'poojara.poojara123@gmail.com';

  // Quick test modal
  showQuickTestModal = false;
  quickTestTemplate: EmailTemplate | null = null;

  // Delete modal
  showDeleteModal = false;
  templateToDelete: EmailTemplate | null = null;

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading.set(true);
    this.templatesService.getEmailTemplates().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.templates.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Failed to load email templates.');
        this.loading.set(false);
      }
    });
  }

  parseVariables(varsString: string): string[] {
    if (!varsString) return [];
    return varsString.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.currentTemplateId = null;
    this.activeTab = 'editor';
    this.formData = {
      templateKey: '',
      name: '',
      description: '',
      subject: '',
      bodyHtml: '<p>Hello {{UserName}},</p><p>Your message content here.</p>',
      availableVariables: '{{UserName}}, {{Email}}, {{CompanyName}}',
      isActive: true
    };
    this.showEditorModal = true;
  }

  openEditModal(t: EmailTemplate): void {
    this.isEditMode = true;
    this.currentTemplateId = t.id;
    this.activeTab = 'editor';
    this.formData = {
      templateKey: t.templateKey,
      name: t.name,
      description: t.description || '',
      subject: t.subject,
      bodyHtml: t.bodyHtml,
      availableVariables: t.availableVariables || '',
      isActive: t.isActive
    };
    this.showEditorModal = true;
  }

  closeEditorModal(): void {
    this.showEditorModal = false;
  }

  saveTemplate(): void {
    if (!this.formData.name || !this.formData.subject || !this.formData.bodyHtml) {
      this.toastService.warning('Please fill in all required fields.');
      return;
    }

    this.saving.set(true);

    if (this.isEditMode && this.currentTemplateId) {
      const updateDto: UpdateEmailTemplateDto = {
        name: this.formData.name,
        description: this.formData.description,
        subject: this.formData.subject,
        bodyHtml: this.formData.bodyHtml,
        availableVariables: this.formData.availableVariables,
        isActive: this.formData.isActive
      };

      this.templatesService.updateEmailTemplate(this.currentTemplateId, updateDto).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Email template updated successfully.');
            this.closeEditorModal();
            this.loadTemplates();
          } else {
            this.toastService.error(res.message || 'Failed to update email template.');
          }
        },
        error: () => {
          this.saving.set(false);
          this.toastService.error('Error updating email template.');
        }
      });
    } else {
      const createDto: CreateEmailTemplateDto = {
        templateKey: this.formData.templateKey,
        name: this.formData.name,
        description: this.formData.description,
        subject: this.formData.subject,
        bodyHtml: this.formData.bodyHtml,
        availableVariables: this.formData.availableVariables,
        isActive: this.formData.isActive
      };

      this.templatesService.createEmailTemplate(createDto).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastService.success('Email template created successfully.');
            this.closeEditorModal();
            this.loadTemplates();
          } else {
            this.toastService.error(res.message || 'Failed to create email template.');
          }
        },
        error: () => {
          this.saving.set(false);
          this.toastService.error('Error creating email template.');
        }
      });
    }
  }

  confirmDelete(t: EmailTemplate): void {
    this.templateToDelete = t;
    this.showDeleteModal = true;
  }

  executeDelete(): void {
    if (!this.templateToDelete) return;
    this.templatesService.deleteEmailTemplate(this.templateToDelete.id).subscribe({
      next: (res) => {
        this.showDeleteModal = false;
        if (res.success) {
          this.toastService.success('Email template deleted successfully.');
          this.loadTemplates();
        } else {
          this.toastService.error(res.message || 'Could not delete template.');
        }
      },
      error: () => {
        this.showDeleteModal = false;
        this.toastService.error('Failed to delete email template.');
      }
    });
  }

  openQuickTestModal(t: EmailTemplate): void {
    this.quickTestTemplate = t;
    this.showQuickTestModal = true;
  }

  sendQuickTestEmail(): void {
    if (!this.quickTestTemplate || !this.testRecipientEmail) return;

    this.sendingTestEmail.set(true);
    this.templatesService.sendTestEmail({
      recipientEmail: this.testRecipientEmail.trim(),
      subject: this.quickTestTemplate.subject,
      bodyHtml: this.quickTestTemplate.bodyHtml
    }).subscribe({
      next: (res) => {
        this.sendingTestEmail.set(false);
        this.showQuickTestModal = false;
        if (res.success) {
          this.toastService.success(`Test email sent successfully to ${this.testRecipientEmail}.`);
        } else {
          this.toastService.error(res.message || 'Failed to send test email.');
        }
      },
      error: () => {
        this.sendingTestEmail.set(false);
        this.toastService.error('Error dispatching test email.');
      }
    });
  }

  sendTestEmailNow(): void {
    if (!this.testRecipientEmail) {
      this.toastService.warning('Please specify a recipient email address.');
      return;
    }

    this.sendingTestEmail.set(true);
    this.templatesService.sendTestEmail({
      recipientEmail: this.testRecipientEmail.trim(),
      subject: this.formData.subject,
      bodyHtml: this.formData.bodyHtml
    }).subscribe({
      next: (res) => {
        this.sendingTestEmail.set(false);
        if (res.success) {
          this.toastService.success(`Test email dispatched successfully to ${this.testRecipientEmail}.`);
        } else {
          this.toastService.error(res.message || 'Failed to dispatch test email.');
        }
      },
      error: () => {
        this.sendingTestEmail.set(false);
        this.toastService.error('Failed to dispatch test email.');
      }
    });
  }

  get renderedPreviewSubject(): string {
    let sub = this.formData.subject || '';
    const sample = this.getSampleValues();
    for (const key of Object.keys(sample)) {
      const pattern = new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'gi');
      sub = sub.replace(pattern, sample[key]);
    }
    return sub;
  }

  get renderedPreviewHtml(): SafeHtml {
    let html = this.formData.bodyHtml || '';
    const sample = this.getSampleValues();
    for (const key of Object.keys(sample)) {
      const pattern = new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'gi');
      html = html.replace(pattern, sample[key]);
    }
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private getSampleValues(): Record<string, string> {
    return {
      UserName: 'Alex Morgan',
      Email: this.testRecipientEmail || 'alex.morgan@example.com',
      TempPassword: 'Temp#Secure99!',
      ExpirationMinutes: '30',
      ResetLink: 'http://localhost:4200/reset-password?token=sample_token_123',
      PortalUrl: 'http://localhost:4200',
      LoginUrl: 'http://localhost:4200/login',
      CompanyName: 'Enterprise RBAC'
    };
  }

  get deleteModalMessage(): string {
    const name = this.templateToDelete?.name || 'this template';
    return `Are you sure you want to delete template "${name}"? It will be soft-deleted and can be recovered if necessary.`;
  }
}
