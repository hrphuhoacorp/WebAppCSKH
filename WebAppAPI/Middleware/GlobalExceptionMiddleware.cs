using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace GymManagementProject_Api.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger
    )
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        ErrorResponse error;

        switch (ex)
        {
            // 400
            case BadRequestException:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                error = Build(context, ex, "Bad Request");
                break;

            // 401
            case UnauthorizedAccessException:
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                error = Build(context, ex, "Unauthorized");
                break;

            // 403
            case ForbiddenException:
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                error = Build(context, ex, "Forbidden");
                break;

            // 404
            case NotFoundException:
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                error = Build(context, ex, "Not Found");
                break;

            // ⭐ 409 — CONFLICT (QUAN TRỌNG)
            case ConflictException:
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                error = Build(context, ex, "Conflict");
                break;
            

            // ⭐ EF CORE UNIQUE / CONSTRAINT
            case DbUpdateException dbEx:
                context.Response.StatusCode = (int)HttpStatusCode.Conflict;
                error = new ErrorResponse
                {
                    StatusCode = context.Response.StatusCode,
                    Message = "Dữ liệu bị trùng hoặc vi phạm ràng buộc.",
                    Error = "Conflict",
                };
                break;

            // 500
            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                error = new ErrorResponse
                {
                    StatusCode = context.Response.StatusCode,
                    Message = "Có lỗi hệ thống xảy ra.",
                    Error = "Internal Server Error",
                };
                break;
        }

        var json = JsonSerializer.Serialize(error);
        await context.Response.WriteAsync(json);
    }

    private static ErrorResponse Build(HttpContext ctx, Exception ex, string error)
    {
        return new ErrorResponse
        {
            StatusCode = ctx.Response.StatusCode,
            Message = ex.Message,
            Error = error,
        };
    }
}
