using Microsoft.AspNetCore.SignalR;

/// <summary>
/// Hub cho realtime giỏ quà — client lắng nghe sự kiện thay đổi mã.
/// Events: "ChangeRequestChanged", "BasketChanged"
/// </summary>
public class GiftBasketHub : Hub { }
