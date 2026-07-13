public class PersonaTagDTO
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = string.Empty;
    public bool HasAutoRule { get; set; }
    public bool IsActive { get; set; }
    public int DisplayOrder { get; set; }
    public int ActiveAssignmentCount { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreatePersonaTagDTO
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#086839";
}

public class UpdatePersonaTagDTO
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = "#086839";
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}

public class PersonaTagAssignmentDTO
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public int TagId { get; set; }
    public string TagName { get; set; } = string.Empty;
    public string TagColor { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string? Note { get; set; }
    public string? AssignedByName { get; set; }
    public DateTime? AssignedAt { get; set; }
}

public class AssignPersonaTagRequestDTO
{
    public int CustomerId { get; set; }
    public int TagId { get; set; }
    public string? Note { get; set; }
}

public class CustomerWithTagsDTO
{
    public int Id { get; set; }
    public string CustomerCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public List<PersonaTagAssignmentDTO> Tags { get; set; } = new();
}
