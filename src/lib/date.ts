export const SITE_TIME_ZONE = "Asia/Shanghai";

type DatePart = "year" | "month" | "day";
type DateTimePart = DatePart | "hour" | "minute";

const datePartFormatters = new Map<string, Intl.DateTimeFormat>();
const dateTimeMinuteFormatters = new Map<string, Intl.DateTimeFormat>();
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

export function formatDateTimeMinute(date: Date, timeZone = SITE_TIME_ZONE): string {
  const { year, month, day, hour, minute } = getDateTimeMinuteParts(date, timeZone);
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export function formatMonthDay(date: Date, timeZone = SITE_TIME_ZONE): string {
  const { month, day } = getDateParts(date, timeZone);
  return `${Number(month)}/${Number(day)}`;
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
