using AmanJarvis.API.Models;
using AmanJarvis.API.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
    .AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddHttpClient<GroqService>(client => client.Timeout = TimeSpan.FromSeconds(35));
builder.Services.AddSingleton<ContextService>();
builder.Services.AddSingleton<PersonalityService>();
builder.Services.AddSingleton<ConversationStore>();
var app = builder.Build();
app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    context.Response.ContentType = "application/json";
    await context.Response.WriteAsJsonAsync(new { error = "An unexpected error occurred." });
}));
app.UseCors();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.Run();

public partial class Program;
