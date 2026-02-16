import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth.routes.js";
import { locationRouter } from "./routes/location.routes.js";
import { masterRouter } from "./routes/master.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { jobRouter } from "./routes/job.routes.js";
import { authRequired } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { attendanceRouter } from "./routes/attendance.routes.js";

dotenv.config();
const app = express();

// app.use(cors());
// app.use(cors({
//   origin: [
//     "http://localhost:3000",
//     "https://track-be-frontend.vercel.app"
//   ],
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true
// }));

app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      "http://localhost:3000",
      "https://track-be-frontend.vercel.app"
    ];

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));


app.options('*', cors());
app.use(express.json({ limit: "2mb" }));
// Support form-encoded bodies from mobile clients
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRouter);
app.use("/api/settings", authRequired, locationRouter);
app.use("/api/masters", authRequired, masterRouter);
app.use("/api/admin", authRequired, adminRouter);
app.use("/api/jobs", authRequired, jobRouter);
app.use("/api/uploads", authRequired, uploadRouter);
app.use("/api/attendance", authRequired, attendanceRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use(errorHandler);

export default app;



