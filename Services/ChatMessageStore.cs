using Audiora.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Text;

namespace Audiora.Services;

public class ChatMessageStore
{
    private readonly HttpClient _httpClient;
    private readonly string _supabaseUrl;
    private readonly JsonSerializerSettings _snakeCaseSettings;

    public ChatMessageStore(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient();
        _supabaseUrl = configuration["Supabase:Url"];
        var apiKey = configuration["Supabase:ApiKey"];

        _httpClient.DefaultRequestHeaders.Add("apikey", apiKey);
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");

        _snakeCaseSettings = new JsonSerializerSettings
        {
            ContractResolver = new DefaultContractResolver
            {
                NamingStrategy = new SnakeCaseNamingStrategy()
            }
        };
    }

    public async Task<List<ChatMessage>> GetMessagesAsync(string roomId)
    {
        var response = await _httpClient.GetAsync(
            $"{_supabaseUrl}/rest/v1/chat_messages?room_id=eq.{roomId}&order=timestamp.asc");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<List<ChatMessage>>(json, _snakeCaseSettings) ?? new List<ChatMessage>();
    }

    public async Task<ChatMessage> AddMessageAsync(ChatMessage message)
    {
        var json = JsonConvert.SerializeObject(message, _snakeCaseSettings);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{_supabaseUrl}/rest/v1/chat_messages", content);
        response.EnsureSuccessStatusCode();
        return message;
    }

    public async Task<List<ChatMessage>> GetAllMessagesAsync()
    {
        var response = await _httpClient.GetAsync($"{_supabaseUrl}/rest/v1/chat_messages?order=timestamp.asc");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<List<ChatMessage>>(json, _snakeCaseSettings) ?? new List<ChatMessage>();
    }
}
