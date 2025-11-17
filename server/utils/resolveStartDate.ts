import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { dateDifference } from "../../constants";

const resolveStartDate = (
	date: Date,
	timezone: string = "Europe/Kyiv",
	withoutDateDifference: boolean = false,
) => {
	const zonedDate = new Date(
		toZonedTime(date, timezone).getTime() -
			(withoutDateDifference ? 0 : dateDifference.valueOf()),
	);
	const startDate = startOfDay(zonedDate);
	const difference = date.getTime() - zonedDate.getTime();
	return new Date(startDate.getTime() + difference);
};

export default resolveStartDate;
