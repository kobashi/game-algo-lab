// デモ: algorithms/save-load.html
using System.Text.Json;

public sealed class SaveDataV2
{
    public int Version { get; set; } = 2;
    public float X { get; set; }
    public float Y { get; set; }
    public int Score { get; set; }
    public bool HasKey { get; set; } // v2 で追加
}

public static class SaveMigrate
{
    public static SaveDataV2 Load(string json)
    {
        using var doc = JsonDocument.Parse(json);
        int ver = doc.RootElement.GetProperty("Version").GetInt32();
        if (ver < 2)
        {
            // v1: HasKey なし → 既定 false
            return new SaveDataV2
            {
                Version = 2,
                X = doc.RootElement.GetProperty("X").GetSingle(),
                Y = doc.RootElement.GetProperty("Y").GetSingle(),
                Score = doc.RootElement.GetProperty("Score").GetInt32(),
                HasKey = false,
            };
        }
        return JsonSerializer.Deserialize<SaveDataV2>(json)!;
    }
}
