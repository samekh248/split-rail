using Microsoft.EntityFrameworkCore;
using SplitRail.Api;
using SplitRail.Api.Data;

var builder = WebApplication.CreateBuilder(args);

DotEnv.Load(Path.Combine(builder.Environment.ContentRootPath, ".env"));

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

    var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD");
    if (!string.IsNullOrEmpty(dbPassword))
        connectionString += $";Password={dbPassword}";

    options.UseNpgsql(connectionString);
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
