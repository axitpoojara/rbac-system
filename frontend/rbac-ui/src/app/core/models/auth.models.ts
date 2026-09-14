export interface User {
  id: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
  createdAtUtc: string;
  roles: string[];
  roleIds: string[];
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  roles: string[];
  permissions: string[];
  mustChangePassword?: boolean;
}

export interface LoginRequest {
  userNameOrEmail: string;
  password: string;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RequestTempPasswordRequest {
  email: string;
}

export interface SetNewPasswordRequest {
  newPassword: string;
  confirmPassword: string;
}
