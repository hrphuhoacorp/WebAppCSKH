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

    public DateTime? ImportDate { get; set; }

    public virtual User? User { get; set; }
}
