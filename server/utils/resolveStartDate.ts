import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { dateDifference } from "../../constants";

const resolveStartDate = (date: Date, timezone: string = "Europe/Kyiv") => {
  const startDate = startOfDay(date);
  const zonedDate = toZonedTime(date, timezone);
  const difference = date.getTime() - zonedDate.getTime();
  return new Date(startDate.getTime() + dateDifference.valueOf() + difference);
};

export default resolveStartDate;
