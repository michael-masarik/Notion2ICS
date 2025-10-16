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
      title: page.properties.Name.title.map(t => t.text.content).join("") || "No title",
      hosting: page.properties.Hosting.select?.name || "TBD",
      reading: page.properties.Reading.rich_text[0]?.text.content || "Missing",
      date: page.properties.Date.date.start
    };
  }).filter(Boolean);
}

// Convert 7:00 PM and 9:30 PM Chicago time to UTC using Luxon
function chicagoToUTC(dateStr, hour, minute) {
  const dt = DateTime.fromISO(`${dateStr}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`, {
    zone: "America/Chicago"
  });
  return dt.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

function datetimeformater(dateStr) {
  return {
    dtStart: chicagoToUTC(dateStr, 19, 0),
    dtEnd: chicagoToUTC(dateStr, 21, 30)
  };
}

function foldLine(line) {
  const maxLength = 75;
  let result = "";
  while (line.length > maxLength) {
    result += line.slice(0, maxLength) + "\r\n ";
    line = line.slice(maxLength);
  }
  result += line;
  return result;
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
      foldLine(`SUMMARY:${ev.title}`),
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      foldLine(`DESCRIPTION:${ev.reading}`),
      foldLine(`LOCATION:${ev.hosting}`),
      "END:VEVENT"
    );
  }

  // Ensure final CRLF
  ics.push("END:VCALENDAR", "");
  return ics.join("\r\n");
}