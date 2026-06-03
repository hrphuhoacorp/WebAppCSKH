using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using WebAppInfractor.Data;
using WebAppInfractor.Models;

public class JwtAuthService
{
    private readonly string? _key;
    private readonly string? _issuer;
    private readonly string? _audience;
    private readonly MemBerContext _context;
    private readonly int _accessTokenExpiryMinutes;

    public JwtAuthService(IConfiguration Configuration, MemBerContext db)
    {
        _key = Configuration["JwtConfigs:SecretKey"];
        _issuer = Configuration["JwtConfigs:Issuer"];
        _audience = Configuration["JwtConfigs:Audience"];
        _accessTokenExpiryMinutes = int.Parse(
            Configuration["JwtConfigs:AccessTokenExpiryMinutes"] ?? "60"
        );
        _context = db;
    }

    public string GenerateToken(User userLogin)
    {
        // Khóa bí mật để ký token
        var key = Encoding.UTF8.GetBytes(_key);
        // Tạo danh sách các claims cho token
        var claims = new List<Claim>
        {
            new Claim("Id", userLogin.Id.ToString()),
            new Claim("email", userLogin.Email), // Claim mặc định cho username
            new Claim("name", userLogin.Name), // Claim tùy chỉnh cho full name
            new Claim("branchesId", userLogin.BranchesId.ToString()),
            new Claim("branchesName", userLogin.Branches.Name),
            new Claim("phone", userLogin.Phone),
            new Claim(JwtRegisteredClaimNames.Sub, userLogin.Name), // Subject của token
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Unique ID của token
            new Claim(JwtRegisteredClaimNames.Iat, DateTime.Now.ToString()), // Thời gian tạo token
        };

        var permissions = new HashSet<string>();
        // Lấy roles từ userLogin đã có (navigation property)
        if (userLogin.UserRoles != null && userLogin.UserRoles.Any())
        {
            foreach (var role in userLogin.UserRoles.Select(ur => ur.Role))
            {
                claims.Add(new Claim(ClaimTypes.Role, role.Name));
            }
        }

        // Tạo khóa bí mật để ký token
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(key),
            SecurityAlgorithms.HmacSha256Signature
        );
        // Thiết lập thông tin cho token

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.Now.AddMinutes(_accessTokenExpiryMinutes),
            SigningCredentials = credentials,
            Issuer = _issuer, // Thêm Issuer vào token
            Audience = _audience,
        };
        // Tạo token bằng JwtSecurityTokenHandler
        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        // Trả về chuỗi token đã mã hóa
        return tokenHandler.WriteToken(token);
    }

    public string DecodePayloadToken(string token)
    {
        try
        {
            // Kiểm tra token có null hoặc rỗng không
            if (string.IsNullOrEmpty(token))
            {
                throw new ArgumentException("Token không được để trống", nameof(token));
            }

            // Tạo handler và đọc token
            var handler = new JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(token);

            // Lấy username từ claims (thường nằm trong claim "sub" hoặc "name")
            var usernameClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "username"); // Common in some identity providers

            if (usernameClaim == null)
            {
                throw new InvalidOperationException("Không tìm thấy username trong payload");
            }

            return usernameClaim.Value;
        }
        catch (Exception ex)
        {
            // Xử lý lỗi (có thể log lỗi ở đây)
            throw new InvalidOperationException($"Lỗi khi decode token: {ex.Message}", ex);
        }
    }
}
