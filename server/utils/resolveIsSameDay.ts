import { IsSameDayOptions, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { dateDifference } from "../../constants";

const resolveIsSameDay = (
	laterDate: Date,
	earlierDate: Date,
	options?: IsSameDayOptions & {
		timezone?: string;
		withoutDateDifference?: boolean;
	},
) => {
	const { timezone, withoutDateDifference, ...rest } = options ?? {};
	const zonedLaterDate = new Date(
		toZonedTime(laterDate, timezone ?? "Europe/Kyiv").getTime() -
			(withoutDateDifference ? 0 : dateDifference.valueOf()),
	);
	const zonedEarlierDate = new Date(
		toZonedTime(earlierDate, timezone ?? "Europe/Kyiv").getTime() -
			(withoutDateDifference ? 0 : dateDifference.valueOf()),
	);
	return isSameDay(zonedLaterDate, zonedEarlierDate, rest);
};

export default resolveIsSameDay;
