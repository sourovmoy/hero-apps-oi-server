const express = require("express");
const app = express();
require("dotenv").config();
const bcrypt = require("bcrypt");
const cors = require("cors");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.status(200).json({ message: "server is ok" });
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const db = client.db("hero_app");
    const userCollection = db.collection("users");
    const appsCollection = db.collection("apps");

    app.post("/user", async (req, res) => {
      try {
        const { name, email, password } = req.body;

        const existing = await userCollection.findOne({ email });

        if (existing) {
          return res.status(409).json({
            message: "user existed!!",
          });
        }

        const hashCode = await bcrypt.hash(password, 10);
        const user = {
          name,
          email,
          password: hashCode,
        };

        const results = await userCollection.insertOne(user);
        res.status(201).json({
          message: "user is created",
          results,
        });
      } catch (err) {
        res.status(400).json({
          message: "failed to create user",
          err: err.message,
        });
      }
    });

    app.post("/apps", async (req, res) => {
      try {
        const app = req.body;
        const results = await appsCollection.insertOne(app);
        res.status(201).json({
          message: "app created",
          results,
        });
      } catch (err) {
        res.status(400).json({
          message: "failed to create user",
          err: err.message,
        });
      }
    });
    app.get("/apps", async (req, res) => {
      try {
        const { search, limit, skip, sort } = req.query;
        const query = {};
        const sortQuery = {};
        if (sort === "rating-desc") {
          sortQuery.ratingAvg = 1;
        } else {
          sortQuery.ratingAvg = -1;
        }
        if (search) {
          query.title = { $regex: search, $options: "i" };
        }
        if (sort === "download-asc") {
          sortQuery.downloads = -1;
        } else {
          sortQuery.downloads = 1;
        }

        const results = await appsCollection
          .find(query)
          .sort(sortQuery)
          .limit(Number(limit))
          .skip(Number(skip))
          .project({ description: 0, ratings: 0 })
          .toArray();
        const appsCount = await appsCollection.countDocuments();
        res.status(200).json({
          message: "all app",
          results,
          appsCount,
        });
      } catch (err) {
        res.status(400).json({
          message: "failed to get app",
          err: err.message,
        });
      }
    });

    app.get("/trending-apps", async (req, res) => {
      try {
        const query = {
          downloads: -1,
        };
        const results = await appsCollection
          .find()
          .sort(query)
          .project({ description: 0 })
          .limit(8)
          .toArray();
        res.status(200).json({
          message: "Trending apps",
          results,
        });
      } catch (error) {
        res.status(400).json({
          message: "failed to get trending app",
          err: err.message,
        });
      }
    });
    app.get("/app/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);

        const query = { _id: new ObjectId(id) };
        const results = await appsCollection.findOne(query);
        res.status(200).json({
          message: "Single apps",
          results,
        });
      } catch (error) {
        res.status(400).json({
          message: "failed to get an app",
          err: err.message,
        });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// app.all(/.*/, (req, res) => {
//   res.status(500).json({
//     status: 404,
//     message: "Api not found",
//   });
// });

app.listen(port, () => {
  console.log("port is running at", port);
});
