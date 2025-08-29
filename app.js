import  express from express;
import "dotenv/config";
import { Client } from "@notionhq/client";
const app = express()
const port = 3000

const notion = new Client({
  auth: process.env.TOKEN
});

const databaseId = process.env.DB_ID;

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
DATA = await getAllEvents();
const events = DATA.map(page =>({
    id: page.id,
    title: page.properties.Name.title[0]?.text.content || "No title",
    hosting: page.properties.Hosting, //TO DO: Finish this line!!!
    summary: page.properties.Reading[0]?.text.content || "Missing: Reading Assignment",
    start: page.properties.Date.date.start,
    end: page.properties.Date.date.end || page.properties.Date.date.start
}))


//---------------------//
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})