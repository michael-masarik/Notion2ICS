import { buildICS, fetchNotionEvents } from "../calendarcore.js";

export default async function handler(req, res) {
    console.log("Recived request");
  try {
    const events = await fetchNotionEvents();
    const ics = buildICS(events);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", "inline; filename=calendar.ics");
    res.status(200).send(ics);
    console.log("Success!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating calendar");
    console.log("ERROR generating calendar")
  }
}