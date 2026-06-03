using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

public class CustomUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.Claims.FirstOrDefault(c => c.Type == "Id")?.Value;
    }
}
