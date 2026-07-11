using System;

/// <summary>
/// Chuyển đổi dương lịch sang âm lịch Việt Nam theo thuật toán Hồ Ngọc Đức (public domain),
/// đúng trong khoảng ~1800-2100. Dự án chưa có thư viện âm lịch nào nên viết tay, không phụ
/// thuộc gói ngoài. Chỉ implement chiều Dương→Âm; chiều ngược lại dùng ForwardScan bên dưới.
/// </summary>
public static class LunarCalendar
{
    private const double PrecisionEpoch = 2415021.076998695;
    private static readonly double PI2 = Math.PI * 2;

    public readonly record struct LunarDate(int Day, int Month, int Year, bool IsLeapMonth);

    /// <summary>Múi giờ Việt Nam (+7), khớp convention project đang dùng ở chỗ khác.</summary>
    public const double DefaultTimeZone = 7.0;

    public static LunarDate ToLunarDate(DateOnly solarDate, double timeZone = DefaultTimeZone)
    {
        double dayNumber = JdFromDate(solarDate.Day, solarDate.Month, solarDate.Year);
        double k = Math.Floor((dayNumber - PrecisionEpoch) / 29.530588853);
        double monthStart = GetNewMoonDay(k + 1, timeZone);
        if (monthStart > dayNumber)
        {
            monthStart = GetNewMoonDay(k, timeZone);
        }

        double a11 = GetLunarMonth11(solarDate.Year, timeZone);
        double b11 = a11;
        int lunarYear;
        if (a11 >= monthStart)
        {
            lunarYear = solarDate.Year;
            a11 = GetLunarMonth11(solarDate.Year - 1, timeZone);
        }
        else
        {
            lunarYear = solarDate.Year + 1;
            b11 = GetLunarMonth11(solarDate.Year + 1, timeZone);
        }

        double lunarDay = dayNumber - monthStart + 1;
        double diff = Math.Floor((monthStart - a11) / 29.0);
        bool isLeap = false;
        double lunarMonth = diff + 11;

        if (b11 - a11 > 365)
        {
            double leapMonthDiff = GetLeapMonthOffset(a11, timeZone);
            if (diff >= leapMonthDiff)
            {
                lunarMonth = diff + 10;
                isLeap = diff == leapMonthDiff;
            }
        }

        if (lunarMonth > 12) lunarMonth -= 12;
        if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

        return new LunarDate((int)lunarDay, (int)lunarMonth, lunarYear, isLeap);
    }

    /// <summary>
    /// Quét tới (forward-scan) ngày dương lịch gần nhất kể từ <paramref name="fromDate"/> (bao gồm
    /// chính ngày đó) rơi đúng vào ngày/tháng âm lịch mục tiêu. Dùng cho tính "dịp âm lịch sắp tới
    /// là ngày dương nào" — tránh phải cài đặt chiều Âm→Dương (khó hơn nhiều).
    /// </summary>
    /// <param name="lunarMonth">Null = khớp mọi tháng âm lịch (vd rằm hàng tháng).</param>
    public static DateOnly? FindNextOccurrence(
        DateOnly fromDate, int lunarDay, int? lunarMonth = null, int maxDaysAhead = 400, double timeZone = DefaultTimeZone)
    {
        for (int offset = 0; offset <= maxDaysAhead; offset++)
        {
            var candidate = fromDate.AddDays(offset);
            var lunar = ToLunarDate(candidate, timeZone);
            if (lunar.Day == lunarDay && (lunarMonth == null || lunar.Month == lunarMonth))
            {
                return candidate;
            }
        }
        return null;
    }

    private static double JdFromDate(int dd, int mm, int yy)
    {
        double a = Math.Floor((14.0 - mm) / 12);
        double y = yy + 4800 - a;
        double m = mm + 12 * a - 3;
        double jd = dd + Math.Floor((153 * m + 2) / 5) + 365 * y + Math.Floor(y / 4) - Math.Floor(y / 100) + Math.Floor(y / 400) - 32045;
        if (jd < 2299161)
        {
            jd = dd + Math.Floor((153 * m + 2) / 5) + 365 * y + Math.Floor(y / 4) - 32083;
        }
        return jd;
    }

    private static double NewMoon(double k)
    {
        double t = k / 1236.85;
        double t2 = t * t;
        double t3 = t2 * t;
        double dr = Math.PI / 180;

        double jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
        jd1 += 0.00033 * Math.Sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);

        double m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
        double mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
        double f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;

        double c1 = (0.1734 - 0.000393 * t) * Math.Sin(m * dr) + 0.0021 * Math.Sin(2 * dr * m);
        c1 = c1 - 0.4068 * Math.Sin(mpr * dr) + 0.0161 * Math.Sin(dr * 2 * mpr);
        c1 = c1 - 0.0004 * Math.Sin(dr * 3 * mpr);
        c1 = c1 + 0.0104 * Math.Sin(dr * 2 * f) - 0.0051 * Math.Sin(dr * (m + mpr));
        c1 = c1 - 0.0074 * Math.Sin(dr * (m - mpr)) + 0.0004 * Math.Sin(dr * (2 * f + m));
        c1 = c1 - 0.0004 * Math.Sin(dr * (2 * f - m)) - 0.0006 * Math.Sin(dr * (2 * f + mpr));
        c1 = c1 + 0.0010 * Math.Sin(dr * (2 * f - mpr)) + 0.0005 * Math.Sin(dr * (2 * mpr + m));

        double deltaT = t < -11
            ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
            : -0.000278 + 0.000265 * t + 0.000262 * t2;

        return jd1 + c1 - deltaT;
    }

    private static double SunLongitude(double jdn)
    {
        double t = (jdn - 2451545.0) / 36525;
        double t2 = t * t;
        double dr = Math.PI / 180;
        double m = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
        double l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
        double dl = (1.914600 - 0.004817 * t - 0.000014 * t2) * Math.Sin(dr * m);
        dl = dl + (0.019993 - 0.000101 * t) * Math.Sin(dr * 2 * m) + 0.000290 * Math.Sin(dr * 3 * m);
        double l = (l0 + dl) * dr;
        l -= PI2 * Math.Floor(l / PI2);
        return l;
    }

    private static double GetNewMoonDay(double k, double timeZone)
        => Math.Floor(NewMoon(k) + 0.5 + timeZone / 24);

    private static double GetSunLongitude(double dayNumber, double timeZone)
        => Math.Floor(SunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI * 6);

    private static double GetLunarMonth11(int yy, double timeZone)
    {
        double off = JdFromDate(31, 12, yy) - PrecisionEpoch;
        double k = Math.Floor(off / 29.530588853);
        double nm = GetNewMoonDay(k, timeZone);
        double sunLong = GetSunLongitude(nm, timeZone);
        if (sunLong >= 9)
        {
            nm = GetNewMoonDay(k - 1, timeZone);
        }
        return nm;
    }

    private static double GetLeapMonthOffset(double a11, double timeZone)
    {
        double k = Math.Floor((a11 - PrecisionEpoch) / 29.530588853 + 0.5);
        double last;
        double i = 1;
        double arc = GetSunLongitude(GetNewMoonDay(k + i, timeZone), timeZone);
        do
        {
            last = arc;
            i++;
            arc = GetSunLongitude(GetNewMoonDay(k + i, timeZone), timeZone);
        } while (arc != last && i < 14);
        return i - 1;
    }
}
