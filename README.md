# Enterprise Role-Based Access Control (RBAC) System
**Built with .NET 8 Web API & Angular 18**

A full-stack, enterprise-grade authentication and role-based access control (RBAC) application featuring dynamic navigation, granular permission policies, refresh token rotation, and complete management screens.

---

## Architecture & Features

- **Backend (.NET 8 Web API)**:
  - **Entity Framework Core 8** with SQLite (`rbac.db`). Zero external server setup needed.
  - **JWT Authentication** (Short-lived access token, 15m) + **Cryptographic Refresh Token rotation** (7d) with token family reuse detection.
  - **Custom Policy-Based Authorization**: `[HasPermission("Users.View")]` attribute powered by custom `IAuthorizationPolicyProvider` and `PermissionAuthorizationHandler`.
  - **Granular Permissions & Dynamic Navigation**: `/api/menus/nav` computes the dynamic menu tree tailored to each user's assigned roles and capabilities.
  - **User Status Control**: Inactive users are rejected at login with HTTP 403; deactivating a user immediately revokes active refresh tokens.
  - **Audit & Timestamps**: `CreatedAtUtc`, `UpdatedAtUtc`, `CreatedBy`, `UpdatedBy` on core entities.
  - **Global Exception Middleware**: Standardized JSON responses for errors and unhandled exceptions.
  - **Interactive Swagger Documentation**: Enabled at `http://localhost:5000/swagger`.

- **Frontend (Angular 18 Standalone)**:
  - **Dynamic Sidebar**: Rendered 100% dynamically from `/api/menus/nav` with collapsible parent-child hierarchy and SVG icons. No hardcoded menus.
  - **Route & UI Guards**:
    - `authGuard`: Redirects unauthenticated users to `/login`.
    - `permissionGuard`: Validates route requirements (`data: { permission: '...' }`).
    - `*appHasPermission`: Structural directive hiding/showing UI buttons and actions conditionally based on permissions.
  - **Silent Token Refresh Interceptor**: `HttpInterceptor` transparently catches 401s, calls `/api/auth/refresh-token`, queues pending requests, and replays them upon renewal.
  - **Management Screens**:
    - **Dashboard**: High-level KPIs, current session identity, and effective permissions overview.
    - **User Management**: Search, filter by active/inactive & role, pagination, create/edit modals, active toggle, delete.
    - **Role & Access Management**: Permission Matrix assignment with grouped modules, "Select All in Module", and Menu assignment tree.
    - **Navigation Menu Management**: Hierarchical tree management, parent-child selector, display order, required permission gates.
    - **Permissions Registry**: Module-categorized capabilities with custom registration modal.
  - **Toast Notifications**: Signal-based reactive alert system.

---

## Seed Accounts

| Role | Email / Username | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | `admin@gmail.com` / `admin` | `Admin@123` | Full access to all menus, permissions, and management screens. |
| **Manager** | `manager@gmail.com` / `manager` | `Manager@123` | User and Role management; cannot view system settings. |
| **Employee** | `employee@gmail.com` / `employee` | `Employee@123` | Basic dashboard access; no management permissions. |
| **Disabled User** | `disabled@gmail.com` / `disabled_user` | `User@123` | Inactive account (tests 403 Forbidden login rejection). |

---

## How to Run Locally

### 1. Run Backend (.NET 8 Web API)
```bash
cd backend/RbacApi
dotnet run
```
Backend API will listen on `http://localhost:5000` (Swagger at `http://localhost:5000/swagger`).
*Database and seed data will be created automatically on initial run.*

### 2. Run Frontend (Angular 18)
```bash
cd frontend/rbac-ui
npm install
npm start
```
Open your browser at `http://localhost:4200`.

---

## Database Schema

- `Users`: Id, UserName, Email, PasswordHash, FirstName, LastName, IsActive, CreatedAtUtc, UpdatedAtUtc, CreatedBy, UpdatedBy.
- `Roles`: Id, Name, Description, IsSystemRole, CreatedAtUtc, UpdatedAtUtc.
- `UserRoles`: UserId, RoleId (Composite PK).
- `Permissions`: Id, Code (e.g. `Users.View`), Name, Module, Description.
- `RolePermissions`: RoleId, PermissionId (Composite PK).
- `Menus`: Id, Title, Route, Icon, ParentId (self-referencing FK), DisplayOrder, RequiredPermission, IsActive.
- `RoleMenus`: RoleId, MenuId (Composite PK).
- `RefreshTokens`: Id, UserId, Token, ExpiresAtUtc, CreatedAtUtc, RevokedAtUtc, ReplacedByToken.
- `AuditLogs`: Id, UserId, Action, EntityName, EntityId, TimestampUtc, Details, IpAddress.
