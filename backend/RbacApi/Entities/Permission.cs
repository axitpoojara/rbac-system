namespace RbacApi.Entities;

public class Permission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty; // e.g. "Users.View", "Users.Create"
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty; // e.g. "Users", "Roles", "Permissions", "Menus"
    public string Description { get; set; } = string.Empty;

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
