public class ResponseValue<T>
{
    public T? Content { get; set; }
    public string? Status { get; set; }
    public string? Message { get; set; }

    public ResponseValue()
    {
        Content = default;
        Status = null;
        Message = null;
    }

    public ResponseValue(T? content, string? message, string? status)
    {
        Content = content;
        Message = message;
        Status = status;
    }
}

public static class StatusReponse
{
    public const string Success = "Success";
    public const string Error = "Error";
    public const string NotFound = "NotFound";
    public const string BadRequest = "BadRequest";
    public const string Unauthorized = "Unauthorized";
}

public static class MessageResponse
{
    public const string Success = "Operation completed successfully.";
    public const string Error = "An error occurred during the operation.";
    public const string NotFound = "The requested resource was not found.";
    public const string BadRequest = "The request was invalid or cannot be served.";
    public const string Unauthorized = "You are not authorized to perform this action.";
}
