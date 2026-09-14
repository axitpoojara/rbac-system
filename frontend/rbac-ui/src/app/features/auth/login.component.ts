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

        <!-- Error Message Alert -->
        <div *ngIf="errorMessage()" class="alert-box error">
          <span>{{ errorMessage() }}</span>
        </div>

        <!-- Login Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label" for="userNameOrEmail">Username or Email</label>
            <input 
              id="userNameOrEmail"
              type="text" 
              class="form-control" 
              formControlName="userNameOrEmail"
              placeholder="e.g. admin@gmail.com"
              [class.is-invalid]="f['userNameOrEmail'].touched && f['userNameOrEmail'].invalid">
            <div *ngIf="getUserNameOrEmailError()" class="form-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ getUserNameOrEmailError() }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <div class="password-input-group">
              <input 
                id="password"
                [type]="showPassword() ? 'text' : 'password'" 
                class="form-control" 
                formControlName="password"
                placeholder="Enter your password"
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ getPasswordError() }}</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading()">
            <span *ngIf="!loading()">Sign In</span>
            <span *ngIf="loading()">Authenticating...</span>
          </button>
        </form>

        <!-- Demo Credentials Quick-Fill -->
        <div class="demo-section">
          <div class="demo-title">Test Demo Accounts</div>
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
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 440px;
      padding: 2.5rem;
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .logo-circle {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--primary), #818cf8);
      color: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .login-header h2 {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .login-header p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
    }
    .btn-block {
      width: 100%;
      margin-top: 0.75rem;
      padding: 0.7rem;
      font-size: 0.95rem;
    }
    .alert-box {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .alert-box.error {
      background-color: var(--danger-light);
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .demo-section {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px dashed var(--border-color);
    }
    .demo-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 700;
      margin-bottom: 0.75rem;
      text-align: center;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .demo-btn {
      padding: 0.6rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: #f8fafc;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      transition: all 0.15s ease;
    }
    .demo-btn:hover {
      background: #f1f5f9;
      border-color: var(--primary);
    }
    .demo-btn strong {
      font-size: 0.8rem;
      color: var(--text-main);
    }
    .demo-btn span {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.1rem;
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

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

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  constructor() {
    this.loginForm.valueChanges.subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });
  }

  get f() {
    return this.loginForm.controls;
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

  fillDemo(user: string, pass: string): void {
    this.loginForm.patchValue({
      userNameOrEmail: user,
      password: pass
    });
    this.loginForm.markAsUntouched();
    this.loginForm.markAsPristine();
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    // 1. Mark all fields as touched to trigger inline error messages
    this.loginForm.markAllAsTouched();

    // 2. Strict frontend validation gate: abort before API call if invalid
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

    // 3. Dispatch API call only when all validations pass
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ userNameOrEmail, password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.toastService.success(`Welcome back, ${res.data.user.fullName || res.data.user.userName}!`);
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Login failed. Please check your credentials.';
        this.errorMessage.set(msg);
      }
    });
  }
}
