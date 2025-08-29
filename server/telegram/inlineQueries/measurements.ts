import { toZonedTime } from "date-fns-tz";

export default defineMeasurementsInlineQuery({
  date: () => new Date(),
  searchWords: ['заміри', 'measurements', 'замеры'],
  selfArticle: {
    id: "id-measurements",
    title: "Cвої заміри за сьогодні",
    description: () => `Надіслати свої заміри за: ${toZonedTime(new Date(), "Europe/Kyiv").toLocaleDateString("uk-UA")}`,
    thumbnail_url: (user, { getPhotoUrl }) => getPhotoUrl(user._id.toString(), user.photoUrl),
  },
  managedArticle: {
    id: "id-measurements",
    title: (user) => {
      let name = `${user.meta?.firstName} ${user.meta?.firstName}`.trim();
      if (!name) {
        name = `${user.firstName} ${user.lastName}`.trim();
      }
      return `Заміри за сьогодні від ${name}`;
    },
    description: () => `Надіслати заміри за: ${toZonedTime(new Date(), "Europe/Kyiv").toLocaleDateString("uk-UA")}`,
    thumbnail_url: (user, { getPhotoUrl }) => getPhotoUrl(user._id.toString(), user.photoUrl),
  },
});
