using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net;
using System.Text.Json;
using AmanJarvis.API.Models;

namespace AmanJarvis.API.Services;

public sealed class GroqService(HttpClient httpClient, IWebHostEnvironment environment)
{
    private const string Endpoint = "https://api.groq.com/openai/v1/chat/completions";

    public async Task<string?> CompleteAsync(string systemPrompt, IReadOnlyList<ChatTurn> history, CancellationToken cancellationToken)
    {
        var apiKey = ReadLocalSetting("GROQ_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey)) return null;
        var model = ReadLocalSetting("GROQ_MODEL") ?? "openai/gpt-oss-120b";
        var messages = new[] { new { role = "system", content = systemPrompt } }
            .Concat(history.Select(turn => new { role = turn.Role, content = turn.Content }))
            .ToArray();

        for (var attempt = 0; attempt < 2; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, Endpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = JsonContent.Create(new { model, temperature = 0.4, max_tokens = 900, messages });

            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                var retryAfter = response.Headers.RetryAfter?.Delta ??
                    (response.Headers.RetryAfter?.Date is { } retryDate ? retryDate - DateTimeOffset.UtcNow : null);
                if (attempt == 0 && (!retryAfter.HasValue || retryAfter.Value <= TimeSpan.FromSeconds(3)))
                {
                    var delay = retryAfter is { } wait && wait > TimeSpan.Zero ? wait : TimeSpan.FromSeconds(1);
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }

                var retryMessage = retryAfter.HasValue
                    ? $" Please retry in about {Math.Ceiling(retryAfter.Value.TotalSeconds)} seconds."
                    : " Please wait a little before trying again.";
                throw new HttpRequestException("Groq rate limit reached." + retryMessage, null, HttpStatusCode.TooManyRequests);
            }
            if (!response.IsSuccessStatusCode)
                throw new HttpRequestException($"Groq returned HTTP {(int)response.StatusCode}.");

            using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            if (!document.RootElement.TryGetProperty("choices", out var choices) ||
                choices.ValueKind != JsonValueKind.Array || choices.GetArrayLength() == 0 ||
                !choices[0].TryGetProperty("message", out var message) ||
                !message.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.String)
                throw new JsonException("Groq returned a response without assistant message content.");

            return content.GetString();
        }

        throw new HttpRequestException("Groq did not return a response.");
    }

    private string? ReadLocalSetting(string name)
    {
        var envPath = Path.Combine(environment.ContentRootPath, ".env");
        if (!File.Exists(envPath)) return null;

        foreach (var rawLine in File.ReadLines(envPath))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#')) continue;

            var separator = line.IndexOf('=');
            if (separator < 0 || !line[..separator].Trim().Equals(name, StringComparison.OrdinalIgnoreCase)) continue;

            var value = line[(separator + 1)..].Trim();
            if (value.Length >= 2 && ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\'')))
                value = value[1..^1];
            return value;
        }

        return null;
    }
}
