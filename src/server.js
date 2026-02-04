import app from "./app.js";
import { sequelize } from "./config/database.js";
import { syncAll, JobStatus } from "./models/index.js";
import { startAttendanceAutoCheckoutJob } from "./jobs/attendanceAutoCheckout.js";

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    await syncAll(); // auto-creates/updates tables
    // Ensure job status colors and order are aligned with desired palette
    try {
      const desiredColor = {
        "Not Started": "#2F80ED",
        OnHold: "#2F80ED",
        OnResume: "#2F80ED",
        "Assigned Tech": "#47A63A",
        Rejected: "#FF7878",
        Completed: "#47A63A",
        Cancelled: "#ADADAD",
        EnRoute: "#6366F1",
        OnSite: "#0EA5E9",
        UnResolved: "#F97316",
      };
      const desiredOrder = {
        "Not Started": 1,
        "Assigned Tech": 2,
        EnRoute: 3,
        OnSite: 4,
        OnHold: 5,
        OnResume: 6,
        Completed: 7,
        Cancelled: 8,
        UnResolved: 9,
        Rejected: 99,
      };
      const normalize = (s) =>
        String(s || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "");
      const rows = await JobStatus.findAll();
      for (const row of rows) {
        const key = normalize(row.job_status_title);
        const colorMatch = Object.entries(desiredColor).find(([title]) => normalize(title) === key);
        const orderMatch = Object.entries(desiredOrder).find(([title]) => normalize(title) === key);
        const updates = {};
        if (colorMatch && row.job_status_color_code !== colorMatch[1])
          updates.job_status_color_code = colorMatch[1];
        if (orderMatch && row.job_status_order !== orderMatch[1])
          updates.job_status_order = orderMatch[1];
        if (Object.keys(updates).length) await row.update(updates);
      }
    } catch (e) {
      console.warn("Job status color sync skipped:", e?.message || e);
    }

    if (String(process.env.DISABLE_ATTENDANCE_AUTO_CHECKOUT || "").toLowerCase() !== "true") {
      startAttendanceAutoCheckoutJob({ logger: console });
    }

    app.listen(PORT, () => console.log(`I-Track backend running on ${PORT}`));
  } catch (e) {
    console.error("Failed to start:", e);
    process.exit(1);
  }
}
start();
