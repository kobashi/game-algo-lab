// デモ: algorithms/net-db-transaction.html
public sealed class ShopDb
{
    public int Gold = 100, Stock = 5, Inventory;

    public bool Buy(int price, bool forceFail = false)
    {
        // BEGIN
        int g = Gold, s = Stock, inv = Inventory;
        if (s <= 0 || g < price) return false; // ROLLBACK
        g -= price; s -= 1; inv += 1;
        if (forceFail) return false; // ROLLBACK
        Gold = g; Stock = s; Inventory = inv; // COMMIT
        return true;
    }
}
