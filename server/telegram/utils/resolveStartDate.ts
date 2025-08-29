import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { dateDifference } from "../../../constants";

const resolveStartDate = (date: Date) => {
  const startDate = startOfDay(date);
  const zonedDate = toZonedTime(date, "Europe/Kyiv");
  const difference = date.getTime() - zonedDate.getTime();
  return new Date(startDate.getTime() + dateDifference.valueOf() + difference);
};

export default resolveStartDate;
