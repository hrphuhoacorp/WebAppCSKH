public class MediaUploadResultDto
{
    public int Id { get; set; }
    public int? FolderId { get; set; }
    public string FileName { get; set; } = "";
    public string OriginalName { get; set; } = "";
    public string FileUrl { get; set; } = "";
    public string MimeType { get; set; } = "";
    public long? FileSize { get; set; }
}

public class CreateFolderRequest
{
    public string Name { get; set; } = "";
    public int? ParentId { get; set; }
}

public class MoveFileRequest
{
    public int FolderId { get; set; }
}

public class RenameFolderRequest
{
    public string NewName { get; set; } = string.Empty;
}
