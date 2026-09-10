namespace Rbac.Application.DTOs.Roles;

public class RoleDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsSystemRole { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int UserCount { get; set; }
    public int PermissionCount { get; set; }
    public int MenuCount { get; set; }
}

public class RoleDetailDto : RoleDto
{
    public List<Guid> PermissionIds { get; set; } = new();
    public List<Guid> MenuIds { get; set; } = new();
}

public class CreateRoleDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<Guid> PermissionIds { get; set; } = new();
    public List<Guid> MenuIds { get; set; } = new();
}

public class UpdateRoleDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<Guid> PermissionIds { get; set; } = new();
    public List<Guid> MenuIds { get; set; } = new();
}

public class AssignRolePermissionsDto
{
    public List<Guid> PermissionIds { get; set; } = new();
}

public class AssignRoleMenusDto
{
    public List<Guid> MenuIds { get; set; } = new();
}
