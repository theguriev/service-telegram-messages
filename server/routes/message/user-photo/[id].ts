import sharp from "sharp";
import objectIdTransform from "~/utils/objectIdTransform";

const paramsSchema = z.object({
  id: z.string().transform((value, ctx) => {
    const match = value.match(/(.+)\.webp$/);
    return objectIdTransform(match ? match[1] : value, ctx);
  })
});

export default eventHandler(async (event) => {
  const { id } = await zodValidateData(getRouterParams(event), paramsSchema.parse);
  const user = await ModelUser.findById(id);

  try {
    const response = await $fetch<ArrayBuffer>(user.photoUrl, { responseType: 'arrayBuffer' });

    const buffer = Buffer.from(response);
    const processedImage = await sharp(buffer)
      .webp()
      .toBuffer();

    return processedImage;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Image processing failed: ${(error as Error).message}`,
    });
  }
});
