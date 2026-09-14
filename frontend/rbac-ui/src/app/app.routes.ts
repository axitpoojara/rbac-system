import { Routes } from '@angular/router';
import { authGuard, setPasswordGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'set-password',
    loadComponent: () => import('./features/auth/set-password.component').then(m => m.SetPasswordComponent),
    canActivate: [setPasswordGuard]
  },
  {
    path: '',
    loadComponent: () => import('./layouts/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [permissionGuard],
        data: { permission: 'Dashboard.View' }
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent),
        canActivate: [permissionGuard],
        data: { permission: 'Users.View' }
      },
      {
        path: 'roles',
        loadComponent: () => import('./features/roles/roles.component').then(m => m.RolesComponent),
        canActivate: [permissionGuard],
        data: { permission: 'Roles.View' }
      },
      {
        path: 'files',
        loadComponent: () => import('./features/files/files.component').then(m => m.FilesComponent),
        canActivate: [permissionGuard],
        data: { permission: 'Files.View' }
      },
      {
        path: 'system',
        redirectTo: 'system/menus',
        pathMatch: 'full'
      },
      {
        path: 'system/menus',
        loadComponent: () => import('./features/menus/menus.component').then(m => m.MenusComponent),
        canActivate: [permissionGuard],
        data: { permission: 'Menus.View' }
      },
      {
        path: 'system/permissions',
        loadComponent: () => import('./features/permissions/permissions.component').then(m => m.PermissionsComponent),
        canActivate: [permissionGuard],
        data: { permission: 'Permissions.View' }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
