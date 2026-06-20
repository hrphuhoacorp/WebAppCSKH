using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class User
{
    public int Id { get; set; }

    public int? BranchesId { get; set; }

    public string? StaffCode { get; set; }

    public string Name { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string Password { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public DateOnly? DayOfBirth { get; set; }

    public virtual ICollection<ActivityLog> ActivityLogs { get; set; } = new List<ActivityLog>();

    public virtual Branch? Branches { get; set; }

    public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();

    public virtual ICollection<ImportsHistory> ImportsHistoryRollbackByNavigations { get; set; } = new List<ImportsHistory>();

    public virtual ICollection<ImportsHistory> ImportsHistoryUsers { get; set; } = new List<ImportsHistory>();

    public virtual ICollection<InternalNews> InternalNews { get; set; } = new List<InternalNews>();

    public virtual ICollection<MediaFile> MediaFiles { get; set; } = new List<MediaFile>();

    public virtual ICollection<MediaFolder> MediaFolders { get; set; } = new List<MediaFolder>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();

    public virtual ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();
}
