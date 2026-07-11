public class PersonalItemsRequestDTO
{
    public List<int> FolderIds { get; set; } = new();
    public List<int> FileIds { get; set; } = new();
}

public class PersonalMoveOrCopyRequestDTO : PersonalItemsRequestDTO
{
    public int? TargetFolderId { get; set; }
}

public class CreatePersonalFolderRequestDTO
{
    public string Name { get; set; } = "";
    public int? ParentId { get; set; }
}

public class RenamePersonalItemRequestDTO
{
    public string NewName { get; set; } = "";
}
