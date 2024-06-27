const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
app.use(express.json());
app.use(cors());

const connectionString = process.env.ATLAS_URI || "";
const client = new MongoClient(connectionString);
const SKILLS_COLLECTION_PREFIX = "skills_li_";
const JOBS_COLLECTION_PREFIX = "jobs_li_";

interface Skill {
  skill: string;
  count: number;
}

interface Job {
  salary_min: number;
  salary_max: number;
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

// Get skills in descending order
app.get("/skills", async (req: any, res: any) => {
  // replace spaces with '_'
  const title = req.query.title?.replace(/ /g, "_") || "";

  if (!title) {
    return res.send({ message: "No title selected" }).status(400);
  }
  const query = async (title: string) => {
    const collection = await client
      .db("indem")
      .collection(`${SKILLS_COLLECTION_PREFIX}${title}`);
    const results = await collection
      .find({})
      .project({ _id: 0, skill: 1, count: 1 })
      .sort({ count: -1 })
      .toArray();

    return results as Array<Skill>;
  };

  await query(title)
    .then((data) => {
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

app.get("/skill-options", async (req: any, res: any) => {
  const query = async (title: string, search: string) => {
    const collection = await client
      .db("indem")
      .collection(`${SKILLS_COLLECTION_PREFIX}${title}`);
    const results = await collection
      .find({
        has_salary_data: true,
        skill: {
          $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), // escape special chars
          $options: "i",
        },
      })
      .project({ _id: 0, skill: 1 })
      .toArray();

    return results as Array<Skill>;
  };
  const searchTerm = req.query.search;

  await Promise.all([
    query("frontend_engineer", searchTerm),
    query("backend_engineer", searchTerm),
    query("fullstack_engineer", searchTerm),
    query("machine_learning_engineer", searchTerm),
  ]).then((skills) => {
    const uniqueSkills = [...new Set(skills.flat().map((s) => s.skill))];
    return res.send(uniqueSkills).status(200);
  });
  res.status(500);
});

app.get("/skill-salaries", async (req: any, res: any) => {
  const query = async (title: string, skill: string) => {
    const collection = await client
      .db("indem")
      .collection(`${JOBS_COLLECTION_PREFIX}${title}`);
    const results = await collection
      .find({
        salary_min: { $exists: true },
        salary_max: { $exists: true },
        skills: {
          $regex: skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      })
      .project({ _id: 0, salary_min: 1, salary_max: 1, skills: 1 })
      .toArray();

    return results as Array<Job>;
  };
  const skill = req.query.skill;

  await Promise.all([
    query("frontend_engineer", skill),
    query("backend_engineer", skill),
    query("fullstack_engineer", skill),
    query("machine_learning_engineer", skill),
  ]).then((jobs) => {
    const salaries = jobs
      .flat()
      .map((j) => Math.floor((j.salary_min + j.salary_max) / 2))
      .sort((a, b) => (a < b ? -1 : 1));

    if (!salaries.length) return res.send({}).status(200);

    const minSalary = salaries[0];
    const maxSalary = salaries[salaries.length - 1];
    const averageSalary = salaries.reduce(
      (avg, value, _, { length }) => avg + value / length,
      0
    );
    const medianSalary =
      salaries.length % 2 === 0
        ? (salaries[salaries.length / 2] + salaries[salaries.length / 2 - 1]) /
          2
        : salaries[Math.floor(salaries.length / 2)];

    return res
      .send({
        minSalary,
        maxSalary,
        averageSalary,
        medianSalary,
        numJobs: salaries.length,
      })
      .status(200);
  });
  res.status(500);
});

app.get("/db-salaries-percentage", async (req: any, res: any) => {
  const query = async (title: string) => {
    const collection = await client
      .db("indem")
      .collection(`${JOBS_COLLECTION_PREFIX}${title}`);
    const jobsWithSalaryDataCount = await collection.countDocuments({
      salary_min: { $exists: true },
      salary_max: { $exists: true },
    });

    const totalJobsCount = await collection.countDocuments();

    return [jobsWithSalaryDataCount, totalJobsCount] as number[];
  };

  await Promise.all([
    query("frontend_engineer"),
    query("backend_engineer"),
    query("fullstack_engineer"),
    query("machine_learning_engineer"),
  ]).then((data) => {
    const percentage =
      (data.reduce((partialSum, a) => partialSum + a[0], 0) /
        data.reduce((partialSum, a) => partialSum + a[1], 0)) *
      100;

    return res.send({ percentage }).status(200);
  });
  res.status(500);
});

app.listen(3000, () => console.log("server started"));

module.exports = app;
