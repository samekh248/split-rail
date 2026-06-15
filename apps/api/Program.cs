using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Polly;
using SplitRail.Api;
using SplitRail.Api.Authorization;
using SplitRail.Api.BackgroundServices;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.Http;
using SplitRail.Api.Middleware;
using SplitRail.Api.Serialization;
using SplitRail.Api.Services;

var builder = WebApplication.CreateBuilder(args);

DotEnv.Load(Path.Combine(builder.Environment.ContentRootPath, ".env"));

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
builder.Services.Configure<SettlementArchiveOptions>(
    builder.Configuration.GetSection(SettlementArchiveOptions.SectionName));
builder.Services.Configure<PreviewOptions>(
    builder.Configuration.GetSection(PreviewOptions.SectionName));

var previewOptions = builder.Configuration.GetSection(PreviewOptions.SectionName).Get<PreviewOptions>()
    ?? new PreviewOptions();

var qboSyncSection = builder.Configuration.GetSection(QboSyncOptions.SectionName);
builder.Services.Configure<QboSyncOptions>(options =>
{
    qboSyncSection.Bind(options);
    options.ClientId = Environment.GetEnvironmentVariable("QBO_CLIENT_ID") ?? options.ClientId;
    options.ClientSecret = Environment.GetEnvironmentVariable("QBO_CLIENT_SECRET") ?? options.ClientSecret;
    options.RedirectUri = Environment.GetEnvironmentVariable("QBO_REDIRECT_URI") ?? options.RedirectUri;
    options.InternalTriggerKey = Environment.GetEnvironmentVariable("QBO_INTERNAL_TRIGGER_KEY") ?? options.InternalTriggerKey;
    if (builder.Environment.IsProduction())
        options.EnableInProcessTimer = qboSyncSection.GetValue("EnableInProcessTimer", false);
});

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "dp-keys")));

if (previewOptions.UseFakeQboConnector)
{
    builder.Services.AddSingleton<QboEgressRecordingHandler>();
    builder.Services.AddHttpClient("QboApi")
        .AddHttpMessageHandler(sp => sp.GetRequiredService<QboEgressRecordingHandler>())
        .AddTransientHttpErrorPolicy(policy =>
            policy.WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt))));
}
else
{
    builder.Services.AddHttpClient("QboApi")
        .AddTransientHttpErrorPolicy(policy =>
            policy.WaitAndRetryAsync(3, attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt))));
}

builder.Services.AddHttpClient("QboOAuth");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

    var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD");
    if (!string.IsNullOrEmpty(dbPassword))
        connectionString += $";Password={dbPassword}";

    options.UseNpgsql(connectionString);
});

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt settings not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        options.MapInboundClaims = false;
    });

builder.Services.AddAuthorization(options =>
{
    var permissions = new[]
    {
        PermissionNames.ManagePermissions,
        PermissionNames.LockBudget,
        PermissionNames.EditSettlement,
        PermissionNames.SignSettlement,
        PermissionNames.ReverseSettlement,
        PermissionNames.TriggerQboSync,
        PermissionNames.MapQboAccounts,
        PermissionNames.ViewFinancials
    };

    foreach (var permission in permissions)
    {
        options.AddPolicy($"Permission:{permission}", policy =>
            policy.Requirements.Add(new PermissionRequirement(permission)));
    }
});

builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<OrganizationService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<RoleService>();
builder.Services.AddScoped<VenueService>();
builder.Services.AddScoped<InvitationService>();
builder.Services.AddScoped<EventService>();
builder.Services.AddScoped<LedgerService>();
builder.Services.AddScoped<DealMathEngine>();
builder.Services.AddScoped<CustomFormulaEvaluator>();
builder.Services.AddScoped<QboTokenService>();
builder.Services.AddScoped<QboTransactionClient>();
if (previewOptions.UseFakeQboConnector)
{
    builder.Services.AddScoped<IQboTransactionClient, FakeQboTransactionClient>();
}
else
{
    builder.Services.AddScoped<IQboTransactionClient>(sp => sp.GetRequiredService<QboTransactionClient>());
}

builder.Services.AddScoped<TestSeedingService>();
builder.Services.AddScoped<QboSyncService>();
builder.Services.AddScoped<QboMappingService>();
builder.Services.AddScoped<SplitRail.Api.Services.SignatureValidator>();
builder.Services.AddScoped<SettlementPdfRenderer>();
builder.Services.AddScoped<SettlementService>();
builder.Services.AddSingleton<InMemorySettlementArchiveStore>();
builder.Services.AddSingleton<GcsSettlementArchiveStore>();
builder.Services.AddSingleton<ISettlementArchiveStore>(sp =>
{
    var preview = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PreviewOptions>>().Value;
    if (preview.UseFakeQboConnector || preview.EnableTestSeeding)
        return sp.GetRequiredService<InMemorySettlementArchiveStore>();
    return sp.GetRequiredService<GcsSettlementArchiveStore>();
});
builder.Services.AddHostedService<QboSyncHostedService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new DecimalStringJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new NullableDecimalStringJsonConverter());
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Split-Rail API", Version = "v1" });
    c.SupportNonNullableReferenceTypes();
    c.NonNullableReferenceTypesAsRequired();
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
    c.SchemaFilter<DecimalStringSchemaFilter>();
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlerMiddleware>();
app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseMiddleware<TenantContextMiddleware>();
app.UseAuthorization();
app.UseMiddleware<VenueContextMiddleware>();
app.MapGet("/", () => Results.Redirect("/swagger"));
app.MapControllers();

app.Run();

public partial class Program;
