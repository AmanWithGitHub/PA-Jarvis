using System.Collections.Concurrent;
using AmanJarvis.API.Models;

namespace AmanJarvis.API.Services;

public sealed class ConversationStore
{
    private readonly ConcurrentDictionary<string, List<ChatTurn>> _items = new();
    private readonly int _historyLimit;

    public ConversationStore(IConfiguration configuration)
    {
        _historyLimit = Math.Clamp(configuration.GetValue<int?>("Chat:HistoryLimit") ?? 12, 2, 100);
    }

    public List<ChatTurn> Get(string id)
    {
        if (!_items.TryGetValue(id, out var turns)) return [];
        lock (turns) return turns.TakeLast(_historyLimit - 1).ToList();
    }

    public void Add(string id, ChatTurn turn) => _items.AddOrUpdate(id, [turn], (_, turns) =>
    {
        lock (turns) { turns.Add(turn); if (turns.Count > _historyLimit) turns.RemoveRange(0, turns.Count - _historyLimit); return turns; }
    });
}
