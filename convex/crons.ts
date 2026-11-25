import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// Each business chooses its own hour; five past avoids the busiest moment.
crons.hourly("send due reminders", { minuteUTC: 5 }, internal.reminders.tick, {});

export default crons;
