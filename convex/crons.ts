import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "run pending date-like matchmaking",
  { minutes: 1 },
  internal.matcher.runPendingLikes,
);

export default crons;
