import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const isWhitespace = (control.value || '').toString().trim().length === 0;
    return isWhitespace ? { whitespaceOnly: true } : null;
  };
}

export function userNameOrEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;

    if (trimmed.includes('@')) {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(trimmed)) {
        return { invalidEmail: true };
      }
    } else {
      if (trimmed.length < 3) {
        return { usernameTooShort: { minLength: 3, actualLength: trimmed.length } };
      }
      if (/\s/.test(trimmed)) {
        return { usernameHasSpaces: true };
      }
    }
    return null;
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-circle">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>Enterprise RBAC Portal</h2>
          <p>Role-Based Authentication & Authorization System</p>
        </div>

        <!-- Mode Tabs -->
        <div class="auth-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab() === 'signin'"
            (click)="setTab('signin')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            <span>Sign In</span>
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab() === 'temp'"
            (click)="setTab('temp')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span>Get Temp Password</span>
          </button>
        </div>

        <!-- ==================== TAB 1: SIGN IN ==================== -->
        <div *ngIf="activeTab() === 'signin'">
          <!-- Error Alert -->
          <div *ngIf="errorMessage()" class="alert-box error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label" for="userNameOrEmail">Username or Email</label>
              <input 
                id="userNameOrEmail"
                type="text" 
                class="form-control" 
                formControlName="userNameOrEmail"
                placeholder="e.g. user@domain.com or admin"
                [class.is-invalid]="f['userNameOrEmail'].touched && f['userNameOrEmail'].invalid">
              <div *ngIf="getUserNameOrEmailError()" class="form-error">
                <span>{{ getUserNameOrEmailError() }}</span>
              </div>
            </div>

            <div class="form-group">
              <div class="label-row">
                <label class="form-label" for="password">Password / Temp Password</label>
              </div>
              <div class="password-input-group">
                <input 
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'" 
                  class="form-control" 
                  formControlName="password"
                  placeholder="Enter password or temporary password"
                  [class.is-invalid]="f['password'].touched && f['password'].invalid">
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
              <div *ngIf="getPasswordError()" class="form-error">
                <span>{{ getPasswordError() }}</span>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
              <span *ngIf="!loading()">Sign In</span>
              <span *ngIf="loading()">Authenticating...</span>
            </button>
          </form>

          <div class="toggle-link-container">
            <span class="text-muted">First time logging in? </span>
            <button type="button" class="link-btn" (click)="setTab('temp')">
              Get temporary password
            </button>
          </div>
        </div>

        <!-- ==================== TAB 2: GET TEMP PASSWORD ==================== -->
        <div *ngIf="activeTab() === 'temp'">
          <div class="temp-intro">
            <div class="info-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Email-Only Verification</span>
            </div>
            <p>
              Enter your email address below. We'll issue a temporary password to your email. You can then sign in and set your new permanent password!
            </p>
          </div>

          <!-- Success Alert -->
          <div *ngIf="tempSuccess()" class="alert-box success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>
              <strong>Email Sent!</strong>
              <div class="alert-details">{{ tempSuccess() }}</div>
            </div>
          </div>

          <!-- Error Alert -->
          <div *ngIf="tempError()" class="alert-box error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ tempError() }}</span>
          </div>

          <form [formGroup]="tempForm" (ngSubmit)="onSendTempPassword()">
            <div class="form-group">
              <label class="form-label" for="tempEmail">Email Address</label>
              <input 
                id="tempEmail"
                type="email" 
                class="form-control" 
                formControlName="email"
                placeholder="e.g. yourname@company.com"
                [class.is-invalid]="tf['email'].touched && tf['email'].invalid">
              <div *ngIf="getTempEmailError()" class="form-error">
                <span>{{ getTempEmailError() }}</span>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-block" [disabled]="tempLoading()">
              <span *ngIf="!tempLoading()">Send Temporary Password</span>
              <span *ngIf="tempLoading()">Sending Verification Email...</span>
            </button>
          </form>

          <div class="toggle-link-container">
            <span class="text-muted">Already received your password? </span>
            <button type="button" class="link-btn" (click)="setTab('signin')">
              Back to Sign In
            </button>
          </div>
        </div>

        <!-- Demo Credentials Quick-Fill -->
        <div class="demo-section">
          <div class="demo-title">Quick Demo Accounts</div>
          <div class="demo-grid">
            <button class="demo-btn admin" (click)="fillDemo('admin@gmail.com', 'Admin@123')">
              <strong>SuperAdmin</strong>
              <span>Full System Access</span>
            </button>
            <button class="demo-btn manager" (click)="fillDemo('manager@gmail.com', 'Manager@123')">
              <strong>Manager</strong>
              <span>User & Role Management</span>
            </button>
            <button class="demo-btn employee" (click)="fillDemo('employee@gmail.com', 'Employee@123')">
              <strong>Employee</strong>
              <span>Dashboard Only</span>
            </button>
            <button class="demo-btn disabled" (click)="fillDemo('disabled@gmail.com', 'User@123')">
              <strong>Disabled User</strong>
              <span>Tests 403 Rejection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      padding: 1.5rem;
    }
    .login-card {
      background: #ffffff;
      border-radius: var(--radius-lg, 12px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 450px;
      padding: 2.25rem;
    }
    .login-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .logo-circle {
      width: 54px;
      height: 54px;
      background: linear-gradient(135deg, #4f46e5, #818cf8);
      color: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.85rem;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .login-header h2 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .login-header p {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 0.35rem;
    }

    /* Tabs */
    .auth-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: #f1f5f9;
      padding: 4px;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      gap: 4px;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0.6rem 0.5rem;
      font-size: 0.825rem;
      font-weight: 600;
      color: #64748b;
      border: none;
      background: transparent;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: #1e293b;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #4f46e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .form-group {
      margin-bottom: 1.2rem;
    }
    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: #334155;
      margin-bottom: 0.35rem;
    }
    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
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
    .password-input-group {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-input-group .form-control {
      padding-right: 2.5rem;
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
    .btn-block {
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.7rem;
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
      opacity: 0.65;
      cursor: not-allowed;
    }
    .alert-box {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
      line-height: 1.4;
    }
    .alert-box.error {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .alert-box.success {
      background-color: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .alert-details {
      font-size: 0.8rem;
      margin-top: 0.2rem;
    }

    .temp-intro {
      margin-bottom: 1.25rem;
    }
    .info-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #eff6ff;
      color: #2563eb;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 20px;
      margin-bottom: 0.6rem;
    }
    .temp-intro p {
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.4;
      margin: 0;
    }
    .toggle-link-container {
      margin-top: 1.25rem;
      text-align: center;
      font-size: 0.825rem;
    }
    .text-muted {
      color: #64748b;
    }
    .link-btn {
      background: none;
      border: none;
      color: #4f46e5;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }
    .link-btn:hover {
      color: #3730a3;
    }

    .demo-section {
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px dashed #e2e8f0;
    }
    .demo-title {
      font-size: 0.725rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 0.6rem;
      text-align: center;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .demo-btn {
      padding: 0.55rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: all 0.15s ease;
    }
    .demo-btn:hover {
      background: #f1f5f9;
      border-color: #4f46e5;
    }
    .demo-btn strong {
      font-size: 0.775rem;
      color: #0f172a;
    }
    .demo-btn span {
      font-size: 0.675rem;
      color: #64748b;
      margin-top: 0.1rem;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  activeTab = signal<'signin' | 'temp'>('signin');

  // Sign In Form
  loginForm: FormGroup = this.fb.group({
    userNameOrEmail: ['', [
      Validators.required,
      noWhitespaceValidator(),
      userNameOrEmailValidator()
    ]],
    password: ['', [
      Validators.required,
      noWhitespaceValidator(),
      Validators.minLength(6)
    ]]
  });

  // Get Temp Password Form
  tempForm: FormGroup = this.fb.group({
    email: ['', [
      Validators.required,
      noWhitespaceValidator(),
      Validators.email
    ]]
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  tempLoading = signal(false);
  tempError = signal<string | null>(null);
  tempSuccess = signal<string | null>(null);

  constructor() {
    this.loginForm.valueChanges.subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });

    this.tempForm.valueChanges.subscribe(() => {
      if (this.tempError()) {
        this.tempError.set(null);
      }
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  get tf() {
    return this.tempForm.controls;
  }

  setTab(tab: 'signin' | 'temp'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.tempError.set(null);
  }

  getUserNameOrEmailError(): string | null {
    const control = this.f['userNameOrEmail'];
    if (!control || !control.touched || !control.errors) return null;
    if (control.errors['required'] || control.errors['whitespaceOnly']) {
      return 'Username or email is required.';
    }
    if (control.errors['invalidEmail']) {
      return 'Please enter a valid email address.';
    }
    if (control.errors['usernameTooShort']) {
      return 'Username must be at least 3 characters.';
    }
    if (control.errors['usernameHasSpaces']) {
      return 'Username cannot contain spaces.';
    }
    return 'Invalid username or email.';
  }

  getPasswordError(): string | null {
    const control = this.f['password'];
    if (!control || !control.touched || !control.errors) return null;
    if (control.errors['required'] || control.errors['whitespaceOnly']) {
      return 'Password is required.';
    }
    if (control.errors['minlength']) {
      return 'Password must be at least 6 characters.';
    }
    return 'Invalid password.';
  }

  getTempEmailError(): string | null {
    const control = this.tf['email'];
    if (!control || !control.touched || !control.errors) return null;
    if (control.errors['required'] || control.errors['whitespaceOnly']) {
      return 'Email address is required.';
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address.';
    }
    return null;
  }

  fillDemo(user: string, pass: string): void {
    this.setTab('signin');
    this.loginForm.patchValue({
      userNameOrEmail: user,
      password: pass
    });
    this.loginForm.markAsUntouched();
    this.loginForm.markAsPristine();
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      return;
    }

    const rawUserNameOrEmail = this.loginForm.get('userNameOrEmail')?.value;
    const rawPassword = this.loginForm.get('password')?.value;

    const userNameOrEmail = typeof rawUserNameOrEmail === 'string' ? rawUserNameOrEmail.trim() : '';
    const password = typeof rawPassword === 'string' ? rawPassword : '';

    if (!userNameOrEmail || !password || password.trim().length === 0 || password.length < 6) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ userNameOrEmail, password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          if (res.data.mustChangePassword) {
            this.toastService.info('Temporary password detected. Please set your new permanent password.');
            this.router.navigate(['/set-password']);
          } else {
            this.toastService.success(`Welcome back, ${res.data.user.fullName || res.data.user.userName}!`);
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Login failed. Please check your credentials.';
        this.errorMessage.set(msg);
      }
    });
  }

  onSendTempPassword(): void {
    this.tempForm.markAllAsTouched();
    if (this.tempForm.invalid) {
      return;
    }

    const email = this.tempForm.get('email')?.value?.trim();
    if (!email) {
      return;
    }

    this.tempLoading.set(true);
    this.tempError.set(null);
    this.tempSuccess.set(null);

    this.authService.requestTemporaryPassword(email).subscribe({
      next: (res) => {
        this.tempLoading.set(false);
        if (res.success) {
          this.toastService.success('Temporary password sent! Check your inbox or dev console.');
          this.tempSuccess.set(`A temporary verification password was generated for ${email}. (In local dev, see the backend terminal logs).`);
          // Prepopulate sign-in form with the email
          this.loginForm.patchValue({
            userNameOrEmail: email,
            password: ''
          });
        }
      },
      error: (err) => {
        this.tempLoading.set(false);
        const msg = err.error?.message || 'Failed to send temporary password. Please try again.';
        this.tempError.set(msg);
      }
    });
  }
}
