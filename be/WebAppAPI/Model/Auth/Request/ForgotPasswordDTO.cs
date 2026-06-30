public class ForgotPasswordRequestDTO
{
    public string Email { get; set; } = "";
}

public class ResetPasswordByOtpDTO
{
    public string Email { get; set; } = "";
    public string Otp { get; set; } = "";
}
