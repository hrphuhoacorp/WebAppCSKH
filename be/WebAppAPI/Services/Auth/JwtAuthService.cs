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
            Configuration["JwtConfigs:AccessTokenExpiryMinutes"] ?? "3600"
        );
        _context = db;
    }

    public async Task<string> GenerateTokenAsync(User userLogin)
    {
        var key = Encoding.UTF8.GetBytes(_key!);

        var claims = new List<Claim>
        {
            new Claim("Id", userLogin.Id.ToString()),
            new Claim("email", userLogin.Email),
            new Claim("name", userLogin.Name),
            new Claim("branchesId", userLogin.BranchesId.ToString()),
            new Claim("branchesName", userLogin.Branches!.Name),
            new Claim("phone", userLogin.Phone),
            new Claim(JwtRegisteredClaimNames.Sub, userLogin.Name),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, DateTime.UtcNow.ToString()),
        };

        var roleIds = new List<int>();
        if (userLogin.UserRoles != null && userLogin.UserRoles.Any())
        {
            foreach (var ur in userLogin.UserRoles)
            {
                claims.Add(new Claim(ClaimTypes.Role, ur.Role.Name));
                roleIds.Add(ur.RoleId);
            }
        }

        // Effective permissions = role defaults UNION user-specific extras
        var rolePermCodes = await _context.RolePermissions
            .Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission.Code)
            .ToListAsync();

        var userPermCodes = await _context.UserPermissions
            .Where(up => up.UserId == userLogin.Id)
            .Select(up => up.Permission.Code)
            .ToListAsync();

        foreach (var perm in rolePermCodes.Union(userPermCodes).Distinct())
            claims.Add(new Claim("perm", perm));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(key),
            SecurityAlgorithms.HmacSha256Signature
        );

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_accessTokenExpiryMinutes),
            SigningCredentials = credentials,
            Issuer = _issuer,
            Audience = _audience,
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string DecodePayloadToken(string token)
    {
        if (string.IsNullOrEmpty(token))
            throw new ArgumentException("Token không được để trống", nameof(token));

        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        var usernameClaim = jwtToken.Claims.FirstOrDefault(x => x.Type == "username");
        if (usernameClaim == null)
            throw new InvalidOperationException("Không tìm thấy username trong payload");

        return usernameClaim.Value;
    }
}
