import { Client } from "@notionhq/client";
import { DateTime } from "luxon";

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

// Hardcoded 2-hour shift for Chicago events
function chicagoToUTCHardcoded(dateStr, hour, minute) {
  const dt = DateTime.fromISO(`${dateStr}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00`, {
    zone: "America/Chicago"
  });
  return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

function datetimeformater(dateStr) {
  return {
    dtStart: chicagoToUTCHardcoded(dateStr, 21, 0),
    dtEnd: chicagoToUTCHardcoded(dateStr, 23, 30)
  };
}

// Build ICS calendar
export function buildICS(events) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tuesday Night Calendar//EN",
    "X-WR-CALNAME:Tuesday Night Book Club",
    "X-WR-TIMEZONE:America/Chicago"
  ];

  for (const ev of events) {
    const { dtStart, dtEnd } = datetimeformater(ev.date);
    ics.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@notion`,
      `SUMMARY:${ev.title}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `DESCRIPTION:${ev.reading}`,
      `LOCATION:${ev.hosting}`,
      "END:VEVENT"
    );
  }

  // Ensure final CRLF
  ics.push("END:VCALENDAR", "");
  return ics.join("\r\n");
}