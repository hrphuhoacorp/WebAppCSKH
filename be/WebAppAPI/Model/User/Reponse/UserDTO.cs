using WebAppInfractor.Models;

public class UserGetAllDTO
{
    public int Id { get; set; }
    public string StaffCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string BranchesName { get; set; }
    public DateOnly? DayOfBirth { get; set; }
    public List<string> Roles { get; set; } = new List<string>();
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

// "id": 1,
// "branchesId": 1,
// "name": "phước",
// "email": "phuoclyminh789@gmail.com",
// "password": "$2a$12$qZOidi6ln..IUuoomO5nxeVvbwoWcXMS5DC9W4Dio4ihAHBqInr9q",
// "createdAt": "2026-05-27T15:08:13.826442",
// "updatedAt": "2026-05-27T08:52:28.740154",
// "deletedAt": null,
// "phone": "0363896372",
// "branches": null,
// "customers": [],
// "importsHistories": [],
// "orders": [],
// "todoTasks": [],
// "userRoles": []
public class UserDTO
{
    public int Id { get; set; }
    public string StaffCode { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public int? BranchesId { get; set; }
    public string? BranchesName { get; set; }
    public DateOnly? DayOfBirth { get; set; }
    public List<RoleDTO> Roles { get; set; } = new();
    public List<string> Permissions { get; set; } = new();

    public List<ImportHistoryDTO> ImportHistories { get; set; } = new();

    // public List<TodoTaskDTO> TodoTasks { get; set; } = new();

    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class ImportHistoryDTO
{
    public int Id { get; set; }
    public string? FileName { get; set; }
    public string? ImportBy { get; set; }
    public string? Status { get; set; }
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public DateTime? ImportDate { get; set; }
    public DateTime? RollbackAt { get; set; }
    public string? RollbackBy { get; set; }
    public string? FileUrl { get; set; }
}

// public class TodoTaskDTO
// {
//     public int Id { get; set; }
//     public string? Content { get; set; }
//     public DateTime? RemindAt { get; set; }
//     public string? Status { get; set; }
// }
