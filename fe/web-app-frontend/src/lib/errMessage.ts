/**
 * Extracts the backend's friendly error message from a failed axios request.
 * Backend error responses (GlobalExceptionMiddleware) serialize as PascalCase
 * ("Message"), while success payloads go through ASP.NET's camelCase MVC
 * formatter — this checks both so callers never need to care which path ran.
 */
export function errMessage(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { Message?: string; message?: string } } })?.response?.data;
    return data?.Message || data?.message || fallback;
}
