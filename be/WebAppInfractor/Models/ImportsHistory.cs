using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class ImportsHistory
{
    public int Id { get; set; }

    public string FileName { get; set; } = null!;

    public int? UserId { get; set; }

    public int SuccessCount { get; set; }

    public int ErrorCount { get; set; }

    public string? ErrorDetails { get; set; }

    public string Status { get; set; } = null!;

    public string? FilePath { get; set; }

    public string? FileHash { get; set; }

    public DateTime? ImportDate { get; set; }

    public DateTime? RollbackAt { get; set; }

    public int? RollbackBy { get; set; }

    public virtual ICollection<Customer> Customers { get; set; } = new List<Customer>();

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual User? RollbackByNavigation { get; set; }

    public virtual User? User { get; set; }
}
