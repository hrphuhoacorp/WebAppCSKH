using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using GymManagementProject_Api.Middlewares;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Microsoft.OpenApi.Models;
using WebAppInfractor.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<MemBerContext>(options => options.UseNpgsql(connectionString));

// đăng ký các repository
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IBranchRepository, BranchRepository>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IUserRoleRepository, UserRoleRepository>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();
builder.Services.AddScoped<IImportsHistoryRepository, ImportsHistoryRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IOrderStatusRepository, OrderStatusRepository>();
builder.Services.AddScoped<ITodoTaskRepository, TodoTaskRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IUserRoleRepository, UserRoleRepository>();
builder.Services.AddScoped<IOrderItemRepository, OrderItemRepository>();
builder.Services.AddScoped<IActivityLogRepository, ActivityLogRepository>();
builder.Services.AddScoped<IMediaFolderRepository, MediaFolderRepository>();
builder.Services.AddScoped<IMediaFileRepository, MediaFileRepository>();
builder.Services.AddScoped<IInternalNewsRepository, InternalNewsRepository>();

//Cache
builder.Services.AddMemoryCache();

//signalR
builder.Services.AddSignalR();

//cotroller
builder
    .Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context
                .ModelState.Where(x => x.Value?.Errors.Count > 0)
                .SelectMany(x => x.Value!.Errors)
                .Select(x => x.ErrorMessage)
                .ToList();

            var errorResponse = new ErrorResponse
            {
                StatusCode = StatusCodes.Status400BadRequest,
                Error = "Bad Request",
                Message = string.Join("; ", errors),
            };

            return new BadRequestObjectResult(errorResponse);
        };
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

//swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Member API", Version = "v1" });

    // Định nghĩa security scheme cho Bearer token
    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "Bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Nhập token vào ô bên dưới theo định dạng: Bearer {token}",
        }
    );

    // Áp dụng security requirement toàn cục (mọi API đều cần token)
    // Cách mới: dùng lambda để access OpenApiDocument nếu cần (ở đây đơn giản nên không cần)
    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer",
                    },
                },
                Array.Empty<string>()
            },
        }
    );
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;

    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

//upload
builder.Services.Configure<MediaSettings>(builder.Configuration.GetSection("MediaSettings"));

//cors
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowAllOrigins",
        builder =>
            builder.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()
    );
});

//jwt
var privateKey = builder.Configuration["JwtConfigs:SecretKey"];
var Issuer = builder.Configuration["JwtConfigs:Issuer"];
var Audience = builder.Configuration["JwtConfigs:Audience"];

if (
    string.IsNullOrWhiteSpace(privateKey)
    || string.IsNullOrWhiteSpace(Issuer)
    || string.IsNullOrWhiteSpace(Audience)
)
{
    throw new InvalidOperationException(
        "JWT configuration missing: JWT_SECRET_KEY, JWT_ISSUER, or JWT_AUDIENCE is not set."
    );
}

builder
    .Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Thiết lập các tham số xác thực token
        options.TokenValidationParameters = new TokenValidationParameters()
        {
            // Kiểm tra và xác nhận Issuer (nguồn phát hành token)
            ValidateIssuer = true,
            ValidIssuer = Issuer, // Biến `Issuer` chứa giá trị của Issuer hợp lệ
            // Kiểm tra và xác nhận Audience (đối tượng nhận token)
            ValidateAudience = true,
            ValidAudience = Audience, // Biến `Audience` chứa giá trị của Audience hợp lệ
            // Kiểm tra và xác nhận khóa bí mật được sử dụng để ký token
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(privateKey)),
            // Sử dụng khóa bí mật (`privateKey`) để tạo SymmetricSecurityKey nhằm xác thực chữ ký của token
            // Giảm độ trễ (skew time) của token xuống 0, đảm bảo token hết hạn chính xác
            ClockSkew = TimeSpan.Zero,
            // Xác định claim chứa vai trò của user (để phân quyền)
            RoleClaimType = ClaimTypes.Role,
            // Xác định claim chứa tên của user
            NameClaimType = ClaimTypes.Name,
            // Kiểm tra thời gian hết hạn của token, không cho phépa sử dụng token hết hạn
            ValidateLifetime = true,
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // 1. Kiểm tra xem Cookie tên "token" có tồn tại không
                if (context.Request.Cookies.TryGetValue("token", out var cookieToken))
                {
                    context.Token = cookieToken;
                }

                // 2. Nếu cookie không có, hệ thống sẽ tự động giữ nguyên token lấy từ Header (Giúp Swagger/Postman chạy bình thường)
                return Task.CompletedTask;
            },
        };
    });

//DI Serivce
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddSingleton<IUserIdProvider, CustomUserIdProvider>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IImportHistoryService, ImportHistoryService>();
builder.Services.AddScoped<IMediaService, MediaService>();

//context
builder.Services.AddHttpContextAccessor();

//jwt service
builder.Services.AddScoped<JwtAuthService>();
builder.Services.AddAuthorization();

var app = builder.Build();
app.UseForwardedHeaders();

//xử lý lỗi toàn cục
app.UseMiddleware<GlobalExceptionMiddleware>();

//

app.UseCors("AllowAllOrigins");

// app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

//server media
var mediaRoot = builder.Configuration["MediaSettings:RootPath"];
var mediaRequestPath = builder.Configuration["MediaSettings:RequestPath"] ?? "/media";

if (!string.IsNullOrWhiteSpace(mediaRoot))
{
    Directory.CreateDirectory(mediaRoot);

    app.UseStaticFiles(
        new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(mediaRoot),
            RequestPath = mediaRequestPath,
        }
    );
}

//
app.MapHub<ImportHub>("/hubs/import");

app.MapControllers();

//swagger
app.UseSwagger();
app.UseSwaggerUI();

app.Run();
