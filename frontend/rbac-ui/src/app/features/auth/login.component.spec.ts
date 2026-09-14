import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('LoginComponent - Frontend Validation', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create login component with an invalid initial form', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.valid).toBeFalse();
  });

  describe('Username or Email Validation', () => {
    it('should be invalid when empty', () => {
      const control = component.loginForm.controls['userNameOrEmail'];
      control.setValue('');
      control.markAsTouched();

      expect(control.valid).toBeFalse();
      expect(component.getUserNameOrEmailError()).toBe('Username or email is required.');
    });

    it('should be invalid when containing only whitespace', () => {
      const control = component.loginForm.controls['userNameOrEmail'];
      control.setValue('   ');
      control.markAsTouched();

      expect(control.valid).toBeFalse();
      expect(component.getUserNameOrEmailError()).toBe('Username or email is required.');
    });

    it('should reject invalid email format when @ is included', () => {
      const control = component.loginForm.controls['userNameOrEmail'];
      control.setValue('admin@');
      control.markAsTouched();

      expect(control.valid).toBeFalse();
      expect(component.getUserNameOrEmailError()).toBe('Please enter a valid email address.');
    });

    it('should reject usernames shorter than 3 characters', () => {
      const control = component.loginForm.controls['userNameOrEmail'];
      control.setValue('ab');
      control.markAsTouched();

      expect(control.valid).toBeFalse();
      expect(component.getUserNameOrEmailError()).toBe('Username must be at least 3 characters.');
    });

    it('should reject usernames containing spaces', () => {
      const control = component.loginForm.controls['userNameOrEmail'];
      control.setValue('my user');
      control.markAsTouched();

      expect(control.valid).toBeFalse();
      expect(component.getUserNameOrEmailError()).toBe('Username cannot contain spaces.');
    });

    it('should accept valid username (>= 3 chars without spaces)', () => {
      const control = component.loginForm.controls['userNameOrEmail'];
      control.setValue('super_admin');
      control.markAsTouched();

      expect(control.valid).toBeTrue();
      expect(component.getUserNameOrEmailError()).toBeNull();
    });

    it('should accept valid email format', () => {
      const control = component.loginForm.controls['userNameOrEmail'];
      control.setValue('admin@gmail.com');
      control.markAsTouched();

      expect(control.valid).toBeTrue();
      expect(component.getUserNameOrEmailError()).toBeNull();
    });
  });

  describe('Password Validation', () => {
    it('should be invalid when empty', () => {
      const control = component.loginForm.controls['password'];
      control.setValue('');
      control.markAsTouched();

      expect(control.valid).toBeFalse();
      expect(component.getPasswordError()).toBe('Password is required.');
    });

    it('should be invalid when whitespace only', () => {
      const control = component.loginForm.controls['password'];
      control.setValue('      ');
      control.markAsTouched();

      expect(control.valid).toBeFalse();
      expect(component.getPasswordError()).toBe('Password is required.');
    });

    it('should reject passwords shorter than 6 characters', () => {
      const control = component.loginForm.controls['password'];
      control.setValue('12345');
      control.markAsTouched();

      expect(control.valid).toBeFalse();
      expect(component.getPasswordError()).toBe('Password must be at least 6 characters.');
    });

    it('should accept passwords with at least 6 characters', () => {
      const control = component.loginForm.controls['password'];
      control.setValue('Secret@123');
      control.markAsTouched();

      expect(control.valid).toBeTrue();
      expect(component.getPasswordError()).toBeNull();
    });
  });

  describe('API Call Gating on Submit', () => {
    it('should NOT call authService.login when form is empty', () => {
      component.onSubmit();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(component.f['userNameOrEmail'].touched).toBeTrue();
      expect(component.f['password'].touched).toBeTrue();
      expect(component.getUserNameOrEmailError()).toBe('Username or email is required.');
      expect(component.getPasswordError()).toBe('Password is required.');
    });

    it('should NOT call authService.login when password is too short', () => {
      component.loginForm.patchValue({
        userNameOrEmail: 'admin@gmail.com',
        password: '123'
      });

      component.onSubmit();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(component.getPasswordError()).toBe('Password must be at least 6 characters.');
    });

    it('should NOT call authService.login when email format is invalid', () => {
      component.loginForm.patchValue({
        userNameOrEmail: 'bad-email@',
        password: 'Password@123'
      });

      component.onSubmit();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(component.getUserNameOrEmailError()).toBe('Please enter a valid email address.');
    });

    it('should call authService.login with trimmed username when form is valid', () => {
      authServiceSpy.login.and.returnValue(of({
        success: true,
        message: 'Success',
        data: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: new Date(),
          user: { id: '1', userName: 'admin', email: 'admin@gmail.com', firstName: 'Admin', lastName: 'User', isActive: true, roles: [], roleIds: [], createdAtUtc: new Date() },
          roles: ['SuperAdmin'],
          permissions: []
        }
      }));

      component.loginForm.patchValue({
        userNameOrEmail: '  admin@gmail.com  ',
        password: 'Admin@123'
      });

      component.onSubmit();

      expect(authServiceSpy.login).toHaveBeenCalledWith({
        userNameOrEmail: 'admin@gmail.com',
        password: 'Admin@123'
      });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('Demo Quick-Fill and Value Changes', () => {
    it('should populate fields and clear error message on fillDemo', () => {
      component.errorMessage.set('Previous error');
      component.fillDemo('manager@gmail.com', 'Manager@123');

      expect(component.loginForm.controls['userNameOrEmail'].value).toBe('manager@gmail.com');
      expect(component.loginForm.controls['password'].value).toBe('Manager@123');
      expect(component.loginForm.valid).toBeTrue();
      expect(component.errorMessage()).toBeNull();
    });

    it('should clear errorMessage when user types in form', () => {
      component.errorMessage.set('Invalid credentials');
      expect(component.errorMessage()).toBe('Invalid credentials');

      component.loginForm.controls['userNameOrEmail'].setValue('newuser');

      expect(component.errorMessage()).toBeNull();
    });
  });
});
