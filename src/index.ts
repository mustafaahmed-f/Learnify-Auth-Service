import express from "express";
const app = express();

app.use(express.json());
app.get("/", (req, res) => res.send("Hello world !!"));

app.listen(process.env.PORT, () =>
  console.log(`Server is running on port ${process.env.PORT}`),
);

console.log("Running ...... ");
