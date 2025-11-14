import { subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export default defineReportInlineQuery({
	date: () => subDays(new Date(), 2),
	searchWords: ["звіт", "report", "отчет", "отчёт"],
	selfArticle: {
		id: "id-before-yesterday-report",
		title: "Cвій звіт за позавчора",
		description: () =>
			`Надіслати свій звіт за: ${toZonedTime(subDays(new Date(), 2), "Europe/Kyiv").toLocaleDateString("uk-UA")}`,
		thumbnail_url: (user, { getPhotoUrl }) =>
			getPhotoUrl(user._id.toString(), user.photoUrl),
	},
	managedArticle: {
		id: "id-before-yesterday-report",
		title: (user) => {
			let name = `${user.meta?.firstName} ${user.meta?.firstName}`.trim();
			if (!name) {
				name = `${user.firstName} ${user.lastName}`.trim();
			}
			return `Звіт за позавчора від ${name}`;
		},
		description: () =>
			`Надіслати звіт за: ${toZonedTime(subDays(new Date(), 2), "Europe/Kyiv").toLocaleDateString("uk-UA")}`,
		thumbnail_url: (user, { getPhotoUrl }) =>
			getPhotoUrl(user._id.toString(), user.photoUrl),
	},
});
