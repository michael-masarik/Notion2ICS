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

// Generate YYYYMMDDTHHMMSS in Chicago local time without using Date
function chicagoDateTime(dateStr, hour, minute) {
  const [year, month, day] = dateStr.split("-");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ss = "00";
  return `${year}${month}${day}T${hh}${mm}${ss}`;
}

// Format event start/end times
function datetimeformater(dateStr) {
  return {
    dtStart: chicagoDateTime(dateStr, 19, 0),
    dtEnd: chicagoDateTime(dateStr, 21, 30)
  };
}

// Build ICS calendar
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
      `DTSTART;TZID=America/Chicago:${dtStart}`,
      `DTEND;TZID=America/Chicago:${dtEnd}`,
      `DESCRIPTION:${ev.reading}`,
      `LOCATION:${ev.hosting}`,
      "END:VEVENT"
    );
  }

  // Ensure final CRLF
  ics.push("END:VCALENDAR", "");
  return ics.join("\r\n");
}