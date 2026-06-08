using System;
using System.Collections.Generic;

namespace WebAppInfractor.Models;

public partial class TodoTask
{
    public int Id { get; set; }

    public int? CustomerId { get; set; }

    public int? AssigneeId { get; set; }

    public string? Content { get; set; }

    public DateTime? RemindAt { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? DeletedAt { get; set; }
}
