import express from "express";
import "dotenv/config";
import { Client } from "@notionhq/client";
const app = express()
const port = 3000

const notion = new Client({
  auth: process.env.TOKEN
});
async function getAllEvents() {
    let allResults = [];
    let cursor = undefined;

    do {
        const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: cursor,
        page_size: 100
        });

        allResults = allResults.concat(response.results);
        cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    return allResults;
    }

const databaseId = process.env.DB_ID;
async function fetchNotionEvents(){
    const DATA = await getAllEvents();
    const events = DATA.map(page => {
        if (!page.properties.Date.date?.start) {
            console.warn(`Skipping page without date: ${page.id}`);
            return null;
        }
        return {
            id: page.id,
            title: page.properties.Name.title[0]?.text.content || "No title",
            hosting: page.properties.Hosting.select?.name || "TBD",
            reading: page.properties.Reading.rich_text[0]?.text.content || "Missing: Reading Assignment",
            date: page.properties.Date.date.start
        };
    }).filter(Boolean);
    return events;
}
function datetimeformater(dateStr) {
  // Create Date objects in Central Time
  const start = zonedDateToUTC(dateStr, 19, 0, "America/Chicago");  // 7:00 PM
  const end   = zonedDateToUTC(dateStr, 21, 30, "America/Chicago"); // 9:30 PM

  return {
    dtStart: formatICSDate(start),
    dtEnd: formatICSDate(end)
  };
}

// Convert local time in given tz → UTC Date
function zonedDateToUTC(dateStr, hour, minute, timeZone) {
  const local = new Date(`${dateStr}T${pad(hour)}:${pad(minute)}:00`);
  // Shift to correct UTC time using Intl
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(local);

  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}Z`);
}

// Format datetime into ICS (YYYYMMDDTHHMMSSZ)
function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function buildICS(events) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tuesday Night Calendar//EN"
  ];

  for (const ev of events) {
    let timevar = datetimeformater(ev.date);
    let startTime = timevar.dtStart;
    let endTime = timevar.dtEnd;

    ics.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@notion`, // ensures stable sync
      `SUMMARY:${ev.title}`,
      `DTSTART:${startTime}`,
      `DTEND:${endTime}`,
      `DESCRIPTION:${ev.reading}`,
      `LOCATION:${ev.hosting}`,
      "END:VEVENT"
    );
  }

  ics.push("END:VCALENDAR");
  console.log("Served calendar")
  return ics.join("\r\n"); // ICS wants CRLF
}


//---------------------//
app.get("/calendar.ics", async (req, res) => {
  try {
    const notionData = await fetchNotionEvents();
    const ics = buildICS(notionData);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", "inline; filename=calendar.ics");
    res.send(ics);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating calendar");
  }
});
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})