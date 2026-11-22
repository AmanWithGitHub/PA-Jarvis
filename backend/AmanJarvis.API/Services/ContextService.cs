using System.Text.Json;

namespace AmanJarvis.API.Services;

public sealed class ContextService
{
    private readonly string _completeProfileJson;

    public ContextService(IWebHostEnvironment environment)
    {
        var path = Path.Combine(environment.ContentRootPath, "Data", "aman-profile.json");
        if (!File.Exists(path))
            throw new FileNotFoundException("Aman's personal profile JSON file was not found.", path);

        try
        {
            using var document = JsonDocument.Parse(File.ReadAllText(path));
            if (document.RootElement.ValueKind != JsonValueKind.Object)
                throw new JsonException("The profile root must be a JSON object.");
            _completeProfileJson = JsonSerializer.Serialize(document.RootElement);
        }
        catch (JsonException exception)
        {
            throw new InvalidOperationException("Aman's personal profile file contains invalid JSON.", exception);
        }
    }

    public string GetCompleteProfileJson() => _completeProfileJson;
}
