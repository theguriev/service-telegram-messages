import { toZonedTime } from "date-fns-tz";

export default defineReportInlineQuery({
	date: () => new Date(),
	searchWords: ["звіт", "report", "отчет", "отчёт"],
	selfArticle: {
		id: "id-report",
		title: "Cвій звіт за сьогодні",
		description: () =>
			`Надіслати свій звіт за: ${toZonedTime(new Date(), "Europe/Kyiv").toLocaleDateString("uk-UA")}`,
		thumbnail_url: (user, { getPhotoUrl }) =>
			getPhotoUrl(user._id.toString(), user.photoUrl),
	},
	managedArticle: {
		id: "id-report",
		title: (user) => {
			let name = `${user.meta?.firstName} ${user.meta?.firstName}`.trim();
			if (!name) {
				name = `${user.firstName} ${user.lastName}`.trim();
			}
			return `Звіт за сьогодні від ${name}`;
		},
		description: () =>
			`Надіслати звіт за: ${toZonedTime(new Date(), "Europe/Kyiv").toLocaleDateString("uk-UA")}`,
		thumbnail_url: (user, { getPhotoUrl }) =>
			getPhotoUrl(user._id.toString(), user.photoUrl),
	},
});
