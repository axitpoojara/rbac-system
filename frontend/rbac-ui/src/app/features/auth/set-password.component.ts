import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('newPassword')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!newPassword || !confirmPassword) return null;
    return newPassword !== confirmPassword ? { passwordMismatch: true } : null;
  };
}

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="set-pwd-wrapper">
      <div class="set-pwd-card">
        <div class="header-section">
          <div class="icon-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>Set Permanent Password</h2>
          <p class="subtitle">
            You are logged in with a temporary verification password. Create a strong permanent password to continue.
          </p>
          
          <div *ngIf="userEmail()" class="user-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>{{ userEmail() }}</span>
          </div>
        </div>

        <!-- Alert messages -->
        <div *ngIf="errorMessage()" class="alert-box error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>

        <form [formGroup]="pwdForm" (ngSubmit)="onSubmit()">
          <!-- New Password -->
          <div class="form-group">
            <label class="form-label" for="newPassword">New Password</label>
            <div class="password-input-group">
              <input
                id="newPassword"
                [type]="showNewPassword() ? 'text' : 'password'"
                class="form-control"
                formControlName="newPassword"
                placeholder="Enter new password (min. 6 characters)"
                [class.is-invalid]="f['newPassword'].touched && f['newPassword'].invalid">
              <button
                type="button"
                class="password-toggle-btn"
                (click)="showNewPassword.set(!showNewPassword())"
                [title]="showNewPassword() ? 'Hide password' : 'Show password'">
                <svg *ngIf="!showNewPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg *ngIf="showNewPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
            <div *ngIf="getNewPasswordError()" class="form-error">
              <span>{{ getNewPasswordError() }}</span>
            </div>
          </div>

          <!-- Confirm Password -->
          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm Password</label>
            <div class="password-input-group">
              <input
                id="confirmPassword"
                [type]="showConfirmPassword() ? 'text' : 'password'"
                class="form-control"
                formControlName="confirmPassword"
                placeholder="Re-enter new password"
                [class.is-invalid]="(f['confirmPassword'].touched && f['confirmPassword'].invalid) || (pwdForm.touched && pwdForm.errors?.['passwordMismatch'])">
              <button
                type="button"
                class="password-toggle-btn"
                (click)="showConfirmPassword.set(!showConfirmPassword())"
                [title]="showConfirmPassword() ? 'Hide password' : 'Show password'">
                <svg *ngIf="!showConfirmPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg *ngIf="showConfirmPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
            <div *ngIf="getConfirmPasswordError()" class="form-error">
              <span>{{ getConfirmPasswordError() }}</span>
            </div>
          </div>

          <!-- Password Requirements List -->
          <div class="requirements-box">
            <div class="req-item" [class.valid]="(f['newPassword'].value?.length || 0) >= 6">
              <span class="dot"></span> At least 6 characters
            </div>
            <div class="req-item" [class.valid]="f['newPassword'].value && f['confirmPassword'].value && f['newPassword'].value === f['confirmPassword'].value">
              <span class="dot"></span> Passwords match
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            <span *ngIf="!loading()">Set Password & Access Portal</span>
            <span *ngIf="loading()">Updating Password...</span>
          </button>
        </form>

        <div class="footer-actions">
          <button type="button" class="btn-link" (click)="onLogout()">
            Sign out & return to login
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .set-pwd-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      padding: 1.5rem;
    }
    .set-pwd-card {
      background: #ffffff;
      border-radius: var(--radius-lg, 12px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 460px;
      padding: 2.5rem;
    }
    .header-section {
      text-align: center;
      margin-bottom: 2rem;
    }
    .icon-circle {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .header-section h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin-top: 0.5rem;
      line-height: 1.4;
    }
    .user-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #f1f5f9;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      margin-top: 1rem;
      border: 1px solid #e2e8f0;
    }
    .alert-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .alert-box.error {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #334155;
      margin-bottom: 0.4rem;
    }
    .password-input-group {
      position: relative;
      display: flex;
      align-items: center;
    }
    .form-control {
      width: 100%;
      padding: 0.65rem 2.5rem 0.65rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      outline: none;
    }
    .form-control:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    .form-control.is-invalid {
      border-color: #ef4444;
      background-color: #fffbfa;
    }
    .password-toggle-btn {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .password-toggle-btn:hover {
      color: #475569;
    }
    .form-error {
      color: #dc2626;
      font-size: 0.775rem;
      margin-top: 0.35rem;
    }
    .requirements-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .req-item {
      font-size: 0.775rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: color 0.15s ease;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #cbd5e1;
      display: inline-block;
    }
    .req-item.valid {
      color: #059669;
      font-weight: 500;
    }
    .req-item.valid .dot {
      background-color: #10b981;
    }
    .btn-block {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #ffffff;
      background-color: #4f46e5;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .btn-block:hover:not(:disabled) {
      background-color: #4338ca;
    }
    .btn-block:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .footer-actions {
      margin-top: 1.5rem;
      text-align: center;
    }
    .btn-link {
      background: none;
      border: none;
      color: #64748b;
      font-size: 0.85rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .btn-link:hover {
      color: #1e293b;
    }
  `]
})
export class SetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  userEmail = signal<string>('');

  pwdForm: FormGroup = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: [passwordMatchValidator()] }
  );

  constructor() {
    const user = this.authService.currentUser();
    if (user?.email) {
      this.userEmail.set(user.email);
    }

    this.pwdForm.valueChanges.subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });
  }

  get f() {
    return this.pwdForm.controls;
  }

  getNewPasswordError(): string | null {
    const control = this.f['newPassword'];
    if (!control || !control.touched || !control.errors) return null;
    if (control.errors['required']) return 'New password is required.';
    if (control.errors['minlength']) return 'Password must be at least 6 characters.';
    return null;
  }

  getConfirmPasswordError(): string | null {
    const control = this.f['confirmPassword'];
    if (control && control.touched && control.errors?.['required']) {
      return 'Please confirm your new password.';
    }
    if (this.pwdForm.errors?.['passwordMismatch'] && (control?.touched || this.pwdForm.touched)) {
      return 'Passwords do not match.';
    }
    return null;
  }

  onSubmit(): void {
    this.pwdForm.markAllAsTouched();
    if (this.pwdForm.invalid) {
      return;
    }

    const newPassword = this.pwdForm.get('newPassword')?.value;
    const confirmPassword = this.pwdForm.get('confirmPassword')?.value;

    if (!newPassword || !confirmPassword || newPassword !== confirmPassword) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.setNewPassword({ newPassword, confirmPassword }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.toastService.success('Your permanent password has been set! Welcome to the portal.');
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Failed to set password. Please try again.';
        this.errorMessage.set(msg);
      }
    });
  }

  onLogout(): void {
    this.authService.logout();
  }
}
