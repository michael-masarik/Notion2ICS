

export default function handler(req, res) {
  console.log("Redirecting to webcal...");
  const calendarUrl = "webcal://tuesday-night.vercel.app/calendar.ics";
  res.writeHead(302, { Location: calendarUrl });
  res.end();
}