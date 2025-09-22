import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { dateDifference } from "../../constants";

const resolveStartDate = (date: Date, timezone: string = "Europe/Kyiv", withoutDateDifference: boolean = false) => {
  const startDate = startOfDay(date);
  const zonedDate = toZonedTime(date, timezone);
  const difference = date.getTime() - zonedDate.getTime();
  return new Date(startDate.getTime() + (withoutDateDifference ? 0 : dateDifference.valueOf()) + difference);
};

export default resolveStartDate;
