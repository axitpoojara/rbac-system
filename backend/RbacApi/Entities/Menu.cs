namespace RbacApi.Entities;

public class Menu
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public Menu? Parent { get; set; }
    public ICollection<Menu> SubMenus { get; set; } = new List<Menu>();

    public int DisplayOrder { get; set; } = 0;
    public string? RequiredPermission { get; set; } // Optional permission required to view
    public bool IsActive { get; set; } = true;

    public ICollection<RoleMenu> RoleMenus { get; set; } = new List<RoleMenu>();
}
