namespace AmanJarvis.API.Models;

public sealed record ChatResponse(string ConversationId, string Message, string Mode);
public sealed record ChatTurn(string Role, string Content);
