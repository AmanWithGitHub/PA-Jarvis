using System.ComponentModel.DataAnnotations;

namespace AmanJarvis.API.Models;

public sealed class ChatRequest
{
    [Required, StringLength(4000, MinimumLength = 1)]
    public string Message { get; init; } = string.Empty;
    [StringLength(100)]
    public string? ConversationId { get; init; }
}
