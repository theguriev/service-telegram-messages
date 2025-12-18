import { addDays, startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { dateDifference } from "../../constants";

const resolveWeekDateRange = (
	date: Date,
	timezone: string = "Europe/Kyiv",
	withoutDateDifference: boolean = false,
) => {
	const zonedDate = new Date(
		toZonedTime(date, timezone).getTime() -
			(withoutDateDifference ? 0 : dateDifference.valueOf()),
	);
	const startDate = startOfWeek(zonedDate, { weekStartsOn: 1 });
	const difference = date.getTime() - zonedDate.getTime();
	const weekStart = new Date(startDate.getTime() + difference);
	return {
		start: weekStart,
		end: addDays(weekStart, 7),
	};
};

export default resolveWeekDateRange;
