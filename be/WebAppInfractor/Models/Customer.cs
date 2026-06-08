using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class Customer
{
    public int Id { get; set; }

    public string CustomerCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Phone { get; set; }

    public int TotalOrders { get; set; }

    public decimal TotalRevenue { get; set; }

    public DateTime? LastOrderAt { get; set; }

    public int? ImportHistoryId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public int? CreatedBy { get; set; }

    public DateOnly? DayOfBirth { get; set; }

    public virtual User? CreatedByNavigation { get; set; }

    public virtual ImportsHistory? ImportHistory { get; set; }

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}
