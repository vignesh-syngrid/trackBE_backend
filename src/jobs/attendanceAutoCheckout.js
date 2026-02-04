import { Attendance } from "../models/index.js";

const MS_PER_MINUTE = 60_000;
const DEFAULT_INTERVAL_MS = Number(process.env.ATTENDANCE_AUTO_CHECKOUT_INTERVAL_MS) || 60_000;

function endOfDay(dateLike) {
  const end = new Date(dateLike);
  end.setHours(23, 59, 0, 0);
  return end;
}

// Close open attendance records once their check-in day has ended.
export async function autoCheckoutOverdueAttendance({ logger = console } = {}) {
  const now = new Date();
  const openAttendances = await Attendance.findAll({ where: { check_out_at: null } });
  let processed = 0;

  for (const attendance of openAttendances) {
    const checkInAt = new Date(attendance.check_in_at);
    const cutoff = endOfDay(checkInAt);
    if (now >= cutoff) {
      const checkoutAt = cutoff <= now ? cutoff : now;
      const totalMinutes = Math.max(0, Math.floor((checkoutAt.getTime() - checkInAt.getTime()) / MS_PER_MINUTE));
      await attendance.update({
        check_out_at: checkoutAt,
        total_minutes: totalMinutes,
      });
      processed += 1;
    }
  }

  if (processed && typeof logger?.info === "function") {
    logger.info(`Auto-checked-out ${processed} attendance record(s)`);
  }

  return processed;
}

let timerRef = null;

export function startAttendanceAutoCheckoutJob({ intervalMs = DEFAULT_INTERVAL_MS, logger = console } = {}) {
  if (timerRef) return timerRef;

  const safeInterval = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS;

  const run = async () => {
    try {
      await autoCheckoutOverdueAttendance({ logger });
    } catch (error) {
      const log = typeof logger?.error === "function" ? logger.error.bind(logger) : console.error.bind(console);
      log("Auto checkout job failed:", error);
    }
  };

  run();
  timerRef = setInterval(run, safeInterval);
  if (typeof timerRef.unref === "function") timerRef.unref();
  return timerRef;
}

export function stopAttendanceAutoCheckoutJob() {
  if (timerRef) {
    clearInterval(timerRef);
    timerRef = null;
  }
}
