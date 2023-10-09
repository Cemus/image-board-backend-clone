import compression from "compression";
import express, { json } from "express";
import "dotenv/config";
import { connect } from "mongoose";
import threadRoutes from "./routes/thread.js";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { join } from "path";
import cors from "cors";
const corsOptions = {
  origin: "https://cemus.github.io",
  credentials: true,
  optionSuccessStatus: 200,
};

const port = process.env.PORT || 3000;
const app = express();
app.use(cors(corsOptions));
app.use(compression());
app.use(json());
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});
app.use(express.static(join(__dirname, "images")));
app.use("/api/threads", threadRoutes);

connect(process.env.DB_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(`Serveur lancé.`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
