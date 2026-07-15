// Khóa cố định dùng với pg_advisory_xact_lock để nghiêm túc hóa các thao tác đếm-rồi-cộng-1
// (sinh mã tự tăng) không có ràng buộc unique ở DB. Phải dùng CHUNG 1 khóa ở mọi nơi sinh
// cùng loại mã, kể cả khi mã đó được sinh từ nhiều service khác nhau (VD VppRequestService
// và VppDispatchService cùng sinh mã phiếu xuất "BK...").
public static class AdvisoryLockKeys
{
    public const long VppDispatchCode = 900000001;
}
