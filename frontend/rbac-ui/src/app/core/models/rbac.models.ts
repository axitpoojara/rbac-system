export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  createdAtUtc: string;
  userCount: number;
  permissionCount: number;
  menuCount: number;
}

export interface RoleDetail extends Role {
  permissionIds: string[];
  menuIds: string[];
}

export interface CreateRoleDto {
  name: string;
  description: string;
  permissionIds: string[];
  menuIds: string[];
}

export interface UpdateRoleDto {
  name: string;
  description: string;
  permissionIds: string[];
  menuIds: string[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
}

export interface ModulePermissions {
  module: string;
  permissions: Permission[];
}

export interface Menu {
  id: string;
  title: string;
  route: string;
  icon: string;
  parentId: string | null;
  parentTitle?: string | null;
  displayOrder: number;
  requiredPermission?: string | null;
  isActive: boolean;
}

export interface NavMenuItem {
  id: string;
  title: string;
  route: string;
  icon: string;
  displayOrder: number;
  children: NavMenuItem[];
}

export interface CreateMenuDto {
  title: string;
  route: string;
  icon: string;
  parentId: string | null;
  displayOrder: number;
  requiredPermission?: string | null;
  isActive: boolean;
}

export interface UpdateMenuDto {
  title: string;
  route: string;
  icon: string;
  parentId: string | null;
  displayOrder: number;
  requiredPermission?: string | null;
  isActive: boolean;
}

export interface CreateUserDto {
  userName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleIds: string[];
}

export interface UpdateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleIds: string[];
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalRoles: number;
  totalPermissions: number;
  totalMenus: number;
  recentUsers: any[];
}
