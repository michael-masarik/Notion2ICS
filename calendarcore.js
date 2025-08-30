import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.TOKEN });
const databaseId = process.env.DB_ID;

export async function fetchNotionEvents() {
  const response = await notion.databases.query({ database_id: databaseId });
  return response.results.map(page => {
    if (!page.properties.Date.date?.start) return null;
    return {
      id: page.id,
      title: page.properties.Name.title[0]?.text.content || "No title",
      hosting: page.properties.Hosting.select?.name || "TBD",
      reading: page.properties.Reading.rich_text[0]?.text.content || "Missing",
      date: page.properties.Date.date.start
    };
  }).filter(Boolean);
}

function zonedDateToUTC(dateStr, hour, minute, timeZone) {
  const local = new Date(`${dateStr}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(local);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`);
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function datetimeformater(dateStr) {
  const start = zonedDateToUTC(dateStr, 19, 0, "America/Chicago");
  const end   = zonedDateToUTC(dateStr, 21, 30, "America/Chicago");
  return { dtStart: formatICSDate(start), dtEnd: formatICSDate(end) };
}

export function buildICS(events) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tuesday Night Calendar//EN",
    "X-WR-CALNAME:Tuesday Night Book Club",
    "X-WR-TIMEZONE:America/Chicago",
    "BEGIN:VTIMEZONE",
    "TZID:America/Chicago",
    "X-LIC-LOCATION:America/Chicago",
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:-0600",
    "TZOFFSETTO:-0500",
    "TZNAME:CDT",
    "DTSTART:19700308T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0600",
    "TZNAME:CST",
    "DTSTART:19701101T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
    "END:STANDARD",
    "END:VTIMEZONE"
  ];
  for (const ev of events) {
    const { dtStart, dtEnd } = datetimeformater(ev.date);
    ics.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@notion`,
      `SUMMARY:${ev.title}`,
      `DTSTART;TZID=America/Chicago:${dtStart.replace(/Z$/, '')}`,
      `DTEND;TZID=America/Chicago:${dtEnd.replace(/Z$/, '')}`,
      `DESCRIPTION:${ev.reading}`,
      `LOCATION:${ev.hosting}`,
      "END:VEVENT"
    );
  }
  ics.push("END:VCALENDAR", "");
  return ics.join("\r\n");
}