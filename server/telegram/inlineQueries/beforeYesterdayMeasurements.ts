import { subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export default defineMeasurementsInlineQuery({
  date: () => subDays(new Date(), 1),
  searchWords: ['заміри', 'measurements', 'замеры'],
  selfArticle: {
    id: "id-before-yesterday-measurements",
    title: "Cвої заміри за позавчора",
    description: () => `Надіслати свої заміри за: ${toZonedTime(subDays(new Date(), 1), "Europe/Kyiv").toLocaleDateString("uk-UA")}`,
    thumbnail_url: (user, { getPhotoUrl }) => getPhotoUrl(user._id.toString(), user.photoUrl),
  },
  managedArticle: {
    id: "id-before-yesterday-measurements",
    title: (user) => {
      let name = `${user.meta?.firstName} ${user.meta?.firstName}`.trim();
      if (!name) {
        name = `${user.firstName} ${user.lastName}`.trim();
      }
      return `Заміри за позавчора від ${name}`;
    },
    description: () => `Надіслати заміри за: ${toZonedTime(subDays(new Date(), 1), "Europe/Kyiv").toLocaleDateString("uk-UA")}`,
    thumbnail_url: (user, { getPhotoUrl }) => getPhotoUrl(user._id.toString(), user.photoUrl),
  },
});
