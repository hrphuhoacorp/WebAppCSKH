using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class User
{
    public int Id { get; set; }

    public int? BranchesId { get; set; }

    public string Name { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string Password { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public DateTime? DayOfBirth { get; set; }

    public virtual Branch? Branches { get; set; }

    public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();

    public virtual ICollection<ImportsHistory> ImportsHistories { get; set; } = new List<ImportsHistory>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual ICollection<TodoTask> TodoTasks { get; set; } = new List<TodoTask>();

    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
