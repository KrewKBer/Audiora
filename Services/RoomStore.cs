using Audiora.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Text;

namespace Audiora.Services;

public class RoomStore
{
    private readonly HttpClient _httpClient;
    private readonly string _supabaseUrl;
    private readonly JsonSerializerSettings _snakeCaseSettings;

    public RoomStore(IHttpClientFactory httpClientFactory, IConfiguration configuration)
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

    public async Task<List<Room>> GetRoomsAsync()
    {
        var response = await _httpClient.GetAsync($"{_supabaseUrl}/rest/v1/rooms");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<List<Room>>(json, _snakeCaseSettings) ?? new List<Room>();
    }

    public async Task<Room?> GetRoomAsync(string roomId)
    {
        var response = await _httpClient.GetAsync($"{_supabaseUrl}/rest/v1/rooms?id=eq.{roomId}");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        var rooms = JsonConvert.DeserializeObject<List<Room>>(json, _snakeCaseSettings);
        return rooms?.FirstOrDefault();
    }

    public async Task<Room> AddRoomAsync(Room room)
    {
        var json = JsonConvert.SerializeObject(room, _snakeCaseSettings);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{_supabaseUrl}/rest/v1/rooms", content);
        response.EnsureSuccessStatusCode();
        return room;
    }

    public async Task<bool> UpdateRoomAsync(Room room)
    {
        var json = JsonConvert.SerializeObject(room, _snakeCaseSettings);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await _httpClient.PatchAsync($"{_supabaseUrl}/rest/v1/rooms?id=eq.{room.Id}", content);
        return response.IsSuccessStatusCode;
    }
}
