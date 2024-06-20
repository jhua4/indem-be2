const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
app.use(express.json());
app.use(cors());

const connectionString = process.env.ATLAS_URI || "";
const client = new MongoClient(connectionString);
const DB_PREFIX = "skills_li_";

interface Skill {
  skill: string;
  count: number;
}

const run = async () => {
  try {
    await client.connect();
    await client.db("indem").command({ ping: 1 });
    console.log("successfully pinged db");
  } catch (error) {
    console.log(error);
  }
};
run();

app.get("/", (req: any, res: any) => res.send("((( 6('-')9"));

const getSkillsForTitle = async (title: string) => {
  const collection = await client
    .db("indem")
    .collection(`${DB_PREFIX}${title}`);
  const results = await collection
    .find({})
    .project({ _id: 0, skill: 1, count: 1 })
    .toArray();

  return results as Array<Skill>;
};

// Get skills in descending order
app.get("/skills", async (req: any, res: any) => {
  // replace spaces with '_'
  const titles =
    req.query.titles?.split(",")?.map((t: string) => t.replace(/ /g, "_")) ||
    [];

  if (titles.length === 0) {
    res.send({ message: "No titles selected" }).status(400);
  }

  var promiseArray: Promise<Skill[]>[] = [];

  for (const title of titles) {
    promiseArray.push(getSkillsForTitle(title));
  }

  await Promise.all(promiseArray)
    .then((collections) => {
      const skillsMap = new Map();
      for (const collection of collections) {
        for (const { skill, count } of collection) {
          if (skillsMap.has(skill)) {
            skillsMap.set(skill, skillsMap.get(skill) + count);
          } else {
            skillsMap.set(skill, count);
          }
        }
      }

      const data = Array.from(skillsMap, ([skill, count]) => ({
        skill,
        count,
      })).sort((a, b) => (a.count > b.count ? -1 : 1));

      res.send(data).status(200);
    })
    .catch((err) => res.send(err).status(500));
});

// Get crawler logs
app.get("/crawler", async (req: any, res: any) => {
  const collection = await client.db("indem").collection("crawler_log");
  const results = await collection.find({}).project({ _id: 0 }).toArray();

  res.send(results).status(200);
});

app.listen(3000, () => console.log("server started"));

module.exports = app;
