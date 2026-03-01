#ifndef TIME_UTILS_HPP
#define TIME_UTILS_HPP

#include <string>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <ctime>

class TimeUtils {
public:
    // "HH:MM" -> minutes (0-1439), returns -1 for null/empty
    static int parseTime(const std::string& s) {
        if (s.empty() || s == "null" || s == "None") return -1;
        int h = 0, m = 0;
        char c;
        std::istringstream ss(s);
        ss >> h >> c >> m;
        return h * 60 + m;
    }

    // minutes -> "HH:MM"
    static std::string formatTime(int mins) {
        if (mins < 0) return "N/A";
        int h = ((mins % 1440) / 60 + 24) % 24;
        int m = ((mins % 1440) % 60 + 60) % 60;
        std::ostringstream ss;
        ss << std::setfill('0') << std::setw(2) << h
           << ":" << std::setw(2) << m;
        return ss.str();
    }

    // minutes -> "Xh Ym"
    static std::string formatDuration(int mins) {
        if (mins < 0) return "N/A";
        int h = mins / 60;
        int m = mins % 60;
        std::ostringstream ss;
        if (h > 0) ss << h << "h ";
        ss << m << "m";
        return ss.str();
    }

    // "monday" -> 1, "sunday" -> 0, etc. Returns -1 on failure
    static int getDayOfWeek(const std::string& dayName) {
        std::string lower = dayName;
        std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
        if (lower == "sunday")    return 0;
        if (lower == "monday")    return 1;
        if (lower == "tuesday")   return 2;
        if (lower == "wednesday") return 3;
        if (lower == "thursday")  return 4;
        if (lower == "friday")    return 5;
        if (lower == "saturday")  return 6;
        return -1;
    }

    // "YYYY-MM-DD" -> day-of-week (0=Sun .. 6=Sat)
    static int getDayFromDate(const std::string& dateStr) {
        int y, m, d;
        char c1, c2;
        std::istringstream ss(dateStr);
        ss >> y >> c1 >> m >> c2 >> d;

        struct tm t = {};
        t.tm_year = y - 1900;
        t.tm_mon  = m - 1;
        t.tm_mday = d;
        t.tm_hour = 12;
        mktime(&t);
        return t.tm_wday; // 0=Sun, 6=Sat
    }

    // Absolute time in minutes: dayIndex * 1440 + timeInMin
    static int absoluteTime(int dayIndex, int timeInMin) {
        return dayIndex * 1440 + timeInMin;
    }

    // Format absolute minutes into "Day HH:MM" for debugging
    static std::string formatAbsoluteTime(int absMin) {
        static const char* days[] = {"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};
        if (absMin < 0) return "N/A";
        int day = (absMin / 1440) % 7;
        int t   = absMin % 1440;
        return std::string(days[day]) + " " + formatTime(t);
    }
};

#endif // TIME_UTILS_HPP
