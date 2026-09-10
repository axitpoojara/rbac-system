namespace Rbac.Application.DTOs.Menus;

public class MenuDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public string? ParentTitle { get; set; }
    public int DisplayOrder { get; set; }
    public string? RequiredPermission { get; set; }
    public bool IsActive { get; set; }
}

public class NavMenuItemDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public List<NavMenuItemDto> Children { get; set; } = new();
}

public class CreateMenuDto
{
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public int DisplayOrder { get; set; }
    public string? RequiredPermission { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateMenuDto
{
    public string Title { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public int DisplayOrder { get; set; }
    public string? RequiredPermission { get; set; }
    public bool IsActive { get; set; }
}
