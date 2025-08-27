import { InlineQueryResultBuilder } from "grammy";
import {
  InlineQueryResult,
  InlineQueryResultArticle,
  InputTextMessageContent,
} from "grammy/types";
import { PipelineStage } from "mongoose";

type Word<T extends string> = T extends `${string} ${string}`
  ? never
  : T extends ""
    ? never
    : T;

type InlineQueryResultOptions<T, K extends keyof T> = Omit<
  T,
  "type" | "id" | "input_message_content" | K
>;
type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
};
type OptionalFields<T> = Pick<T, OptionalKeys<T>[keyof T]>;

type CallableOptionRequest<T, R extends User> = (
  user: R,
  ctx: InlineQueryResultParams,
) => T | Promise<T>;
type OptionRequest<T, R extends User> = T | CallableOptionRequest<T, R>;
type OptionsRequests<T extends object, R extends User> = {
  [K in keyof T]: T[K] extends undefined
    ? undefined | OptionRequest<T[K], R>
    : OptionRequest<T[K], R>;
};

type ArticleOptions = InlineQueryResultOptions<
  InlineQueryResultArticle,
  "title"
>;

type CustomPipeline = PipelineStage | PipelineStage[];
type TextOptions =
  | Omit<
      InlineQueryResultOptions<InputTextMessageContent, "message_text">,
      "message_text"
    >
  | undefined;
type ManagedInlineQueryParams<T extends string, R extends User> = {
  selfArticle: {
    id: OptionRequest<string, R>;
    title: OptionRequest<string, R>;
    text: OptionRequest<string, R>;
    textOptions?: OptionRequest<TextOptions, R>;
  } & OptionsRequests<ArticleOptions, R>;
  managedArticle: {
    id: OptionRequest<string, R>;
    title: OptionRequest<string, R>;
    text: OptionRequest<string, R>;
    textOptions?: OptionRequest<TextOptions, R>;
  } & OptionsRequests<ArticleOptions, R>;
  searchWords: Word<T>[];
  customPipeline?:
    | CustomPipeline
    | ((
        ctx: InlineQueryResultParams,
      ) => CustomPipeline | Promise<CustomPipeline>);
};

const getOptions = async <T extends object, R extends User>(
  options: OptionsRequests<T, R>,
  user: R,
  ctx: InlineQueryResultParams,
) => {
  const asyncOptions = Object.entries(options).map(async ([key, value]) => {
    const option = value as OptionRequest<T[keyof T], R> | undefined;
    const result =
      typeof option === "function"
        ? (option as CallableOptionRequest<T[keyof T], R>)(user, ctx)
        : option;
    return [key, result instanceof Promise ? await result : result] as const;
  });

  return (await Promise.all(asyncOptions)).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: value,
    }),
    {} as T,
  );
};

const defineManagedInlineQuery = <
  const TWord extends string,
  R extends User = User,
>({
  selfArticle,
  managedArticle,
  searchWords,
  customPipeline = [],
}: ManagedInlineQueryParams<TWord, R>) => {
  const getResults: InlineQueryFunc = async (params) => {
    const { query, offset, limit, currentUser, getPhotoUrl } = params;
    const [lastRequestEntry, ...restRequests] = query
      .split(/\s?(?<!\S)(?:и|та|and|\+|\&|\|)(?!\S)\s?/i)
      .reverse();
    const [lastRequest, ...userParts] = lastRequestEntry.split(" ");
    const user = userParts.join(" ");
    const requests = [lastRequest, ...restRequests];
    const visible = searchWords.some((word) =>
      requests.some((request) => word.match(new RegExp(request, "i"))),
    );
    if (!visible) return [];

    const regexExpression = (field: string) => ({
      $expr: {
        $regexMatch: {
          input: { $toString: `$${field}` },
          regex: user,
          options: "i",
        },
      },
    });
    const customPipelineResult =
      typeof customPipeline === "function"
        ? customPipeline(params)
        : customPipeline;
    const awaitedCustomPipelineResult =
      customPipelineResult instanceof Promise
        ? await customPipelineResult
        : customPipelineResult;
    const pipeline: PipelineStage[] = [
      {
        $match: {
          $and: [
            {
              $or: [
                { _id: currentUser._id },
                { "meta.managerId": currentUser.id },
              ],
            },
            ...(user
              ? [
                  {
                    $or: [
                      regexExpression("_id"),
                      regexExpression("id"),
                      regexExpression("firstName"),
                      regexExpression("lastName"),
                      regexExpression("username"),
                      regexExpression("meta.firstName"),
                      regexExpression("meta.lastName"),
                    ],
                  },
                ]
              : []),
          ],
        },
      },
      ...(Array.isArray(awaitedCustomPipelineResult)
        ? awaitedCustomPipelineResult
        : [awaitedCustomPipelineResult]),
      { $skip: offset },
      { $limit: limit },
    ];

    const results: InlineQueryResult[] = [];
    const managedUsers = await ModelUser.aggregate<R>(pipeline);
    for (const aggregatedUser of managedUsers) {
      const userArticle =
        aggregatedUser._id.toString() === currentUser._id.toString()
          ? selfArticle
          : managedArticle;
      const { id, title, text, textOptions, ...options } = await getOptions(
        userArticle,
        aggregatedUser,
        params,
      );
      results.push(
        InlineQueryResultBuilder.article(
          `${id}-${aggregatedUser._id.toString()}`,
          title,
          options,
        ).text(text, {
          ...(textOptions || {}),
          message_text: text,
        }),
      );
    }

    return results;
  };

  return getResults;
};

export default defineManagedInlineQuery;
