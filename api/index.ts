const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");

app.use(express.json());
app.use(cors());

const connectionString = process.env.ATLAS_URI || "";
const client = new MongoClient(connectionString);

const run = async () => {
  try {
    await client.connect();
    await client.db("indem").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } catch (error) {
    console.log(error);
  }
};

run();

app.get("/", (_, res) => res.send("((( 6('-')9"));

// Get skills in descending order
app.get("/skills", async (_, res) => {
  let collection = await client.db("indem").collection("skills_linkedin");
  let results = await collection
    .find({})
    .project({ _id: 0, skill: 1, count: 1 })
    .sort({ count: -1 })
    .toArray();

  res.send(results).status(200);
});

// Get crawler logs
app.get("/crawler", async (_, res) => {
  let collection = await client.db("indem").collection("crawler_log");
  let results = await collection.find({}).project({ _id: 0 }).toArray();

  res.send(results).status(200);
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
