import { DateTime } from "luxon";
export * as Time from "./time";

export function now() {
  return DateTime.now().toISO();
}
