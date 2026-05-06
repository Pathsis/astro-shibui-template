export const SITE_TIME_ZONE = "Asia/Shanghai";

type DatePart = "year" | "month" | "day";
type DateTimePart = DatePart | "hour" | "minute";
type EnglishDateTimePart = "year" | "month" | "day" | "hour" | "minute";

const datePartFormatters = new Map<string, Intl.DateTimeFormat>();
const dateTimeMinuteFormatters = new Map<string, Intl.DateTimeFormat>();
const englishDateTimeMinuteFormatters = new Map<string, Intl.DateTimeFormat>();
const englishMonthDayFormatters = new Map<string, Intl.DateTimeFormat>();
const rssDateFormatters = new Map<string, Intl.DateTimeFormat>();

function getDatePartFormatter(timeZone: string): Intl.DateTimeFormat {
  const existing = datePartFormatters.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  datePartFormatters.set(timeZone, formatter);
  return formatter;
}

function getDateParts(date: Date, timeZone = SITE_TIME_ZONE): Record<DatePart, string> {
  const parts = getDatePartFormatter(timeZone).formatToParts(date);
  return parts.reduce((acc, part) => {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      acc[part.type] = part.value;
    }
    return acc;
  }, {} as Record<DatePart, string>);
}

function getDateTimeMinuteFormatter(timeZone: string): Intl.DateTimeFormat {
  const existing = dateTimeMinuteFormatters.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  dateTimeMinuteFormatters.set(timeZone, formatter);
  return formatter;
}

function getDateTimeMinuteParts(date: Date, timeZone = SITE_TIME_ZONE): Record<DateTimePart, string> {
  const parts = getDateTimeMinuteFormatter(timeZone).formatToParts(date);
  return parts.reduce((acc, part) => {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute"
    ) {
      acc[part.type] = part.value;
    }
    return acc;
  }, {} as Record<DateTimePart, string>);
}

function getEnglishDateTimeMinuteFormatter(timeZone: string): Intl.DateTimeFormat {
  const existing = englishDateTimeMinuteFormatters.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  englishDateTimeMinuteFormatters.set(timeZone, formatter);
  return formatter;
}

function getEnglishDateTimeMinuteParts(
  date: Date,
  timeZone = SITE_TIME_ZONE
): Record<EnglishDateTimePart, string> {
  const parts = getEnglishDateTimeMinuteFormatter(timeZone).formatToParts(date);
  return parts.reduce((acc, part) => {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute"
    ) {
      acc[part.type] = part.value;
    }
    return acc;
  }, {} as Record<EnglishDateTimePart, string>);
}

function getEnglishMonthDayFormatter(timeZone: string): Intl.DateTimeFormat {
  const existing = englishMonthDayFormatters.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
  });
  englishMonthDayFormatters.set(timeZone, formatter);
  return formatter;
}

function getRssDateFormatter(timeZone: string): Intl.DateTimeFormat {
  const existing = rssDateFormatters.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  rssDateFormatters.set(timeZone, formatter);
  return formatter;
}

export function formatDate(date: Date, timeZone = SITE_TIME_ZONE): string {
  const { year, month, day } = getDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

export function formatDateTimeMinute(
  date: Date,
  lang: "zh-cn" | "en" = "zh-cn",
  timeZone = SITE_TIME_ZONE
): string {
  if (lang === "en") {
    const { year, month, day, hour, minute } = getEnglishDateTimeMinuteParts(date, timeZone);
    return `${month} ${Number(day)}, ${year} ${hour}:${minute}`;
  }

  const { year, month, day, hour, minute } = getDateTimeMinuteParts(date, timeZone);
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日 ${Number(hour)}:${minute}`;
}

export function formatMonthDay(
  date: Date,
  lang: "zh-cn" | "en" = "zh-cn",
  timeZone = SITE_TIME_ZONE
): string {
  if (lang === "en") {
    return getEnglishMonthDayFormatter(timeZone).format(date);
  }

  const { month, day } = getDateParts(date, timeZone);
  return `${Number(month)} 月 ${Number(day)} 日`;
}

export function getDateYear(date: Date, timeZone = SITE_TIME_ZONE): number {
  return Number(getDateParts(date, timeZone).year);
}

export function formatRssDate(date: Date, timeZone = SITE_TIME_ZONE): string {
  const parts = getRssDateFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter(
        (part) =>
          part.type === "weekday" ||
          part.type === "day" ||
          part.type === "month" ||
          part.type === "year" ||
          part.type === "hour" ||
          part.type === "minute" ||
          part.type === "second"
      )
      .map((part) => [part.type, part.value])
  );

  return `${values.weekday}, ${values.day} ${values.month} ${values.year} ${values.hour}:${values.minute}:${values.second} +0800`;
}
