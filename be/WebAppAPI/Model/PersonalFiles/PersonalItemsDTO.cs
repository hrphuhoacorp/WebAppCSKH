public class PersonalItemsDTO
{
    public List<PersonalFolderDTO> Folders { get; set; } = new();
    public List<PersonalFileDTO> Files { get; set; } = new();
    public List<BreadcrumbItemDTO> Breadcrumb { get; set; } = new();
}
