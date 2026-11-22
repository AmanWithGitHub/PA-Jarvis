using AmanJarvis.API.Models;
using AmanJarvis.API.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace AmanJarvis.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ChatController(ContextService contextService, PersonalityService personalityService, GroqService groqService, ConversationStore conversationStore, ILogger<ChatController> logger) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<ChatResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ChatResponse>> Post([FromBody] ChatRequest request, CancellationToken cancellationToken)
    {
        var id = string.IsNullOrWhiteSpace(request.ConversationId) ? Guid.NewGuid().ToString("N") : request.ConversationId;
        var history = conversationStore.Get(id);
        history.Add(new ChatTurn("user", request.Message));
        var systemPrompt = personalityService.BuildSystemPrompt(contextService.GetCompleteProfileJson());
        string answer;
        string mode;
        try
        {
            var generated = await groqService.CompleteAsync(systemPrompt, history, cancellationToken);
            if (generated is null)
            {
                answer = PersonalityService.UnconfiguredReply;
                mode = "demo";
            }
            else { answer = generated; mode = personalityService.IsLikelyPersonal(request.Message) ? "personal" : "general"; }
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Groq request timed out for conversation {ConversationId}", id);
            answer = "The AI service took too long to respond. Please try again.";
            mode = "fallback";
        }
        catch (HttpRequestException exception) when (exception.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        {
            logger.LogWarning("Groq rate limit reached for conversation {ConversationId}", id);
            answer = exception.Message;
            mode = "fallback";
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "Groq API request failed");
            answer = "I couldn't reach the AI service just now. Please try again in a moment.";
            mode = "fallback";
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "Groq API response could not be read");
            answer = "I couldn't read the AI service response. Please try again.";
            mode = "fallback";
        }
        conversationStore.Add(id, new ChatTurn("user", request.Message));
        conversationStore.Add(id, new ChatTurn("assistant", answer));
        return Ok(new ChatResponse(id, answer, mode));
    }
}
