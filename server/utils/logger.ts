import { isPlainObject } from "es-toolkit";
import { Context, InlineQueryContext } from "grammy";
import { InlineQueryResult } from "grammy/types";
import { H3Error, H3Event, MultiPartData, type HTTPHeaderName, type HTTPMethod } from "h3";
import { HydratedDocument, InferSchemaType } from "mongoose";
import util from "util";
import { createLogger, format, transport, transports } from "winston";
import LokiTransport from "winston-loki";

const winstonTypes = {
  httpRequestLog: "HTTP_REQUEST_LOG",
  httpRequestResponse: "HTTP_REQUEST_RESPONSE",
  inlineQueryLog: "INLINE_QUERY_LOG",
  inlineQueryResponse: "INLINE_QUERY_RESPONSE",
} as const;

const methodColors = {
  GET: "yellow",
  POST: "green",
  PUT: "blue",
  DELETE: "red",
};

declare module "logform" {
  export interface TransformableInfo {
    type: (typeof winstonTypes)[keyof typeof winstonTypes];
    id: string;
    query?: string;
    offsetStep?: number;
    offset?: number;
    request?: {
      method: HTTPMethod;
      url: URL;
      path: string;
      ip?: string;
      protocol: "https" | "http";
      host: string;
      headers: Partial<Record<HTTPHeaderName, string>>;
      body?: unknown;
      rawBody?: string;
      fingerprint?: string;
      formData?: FormData;
      multipartFormData?: MultiPartData[];
    };
    context?: InlineQueryContext<Context>;
    user?: HydratedDocument<InferSchemaType<typeof schemaUser>>;
    timestamp?: string;
  }
}

let loggerConfig:
  | {
      service: string;
      host: string;
      basicAuth?: string;
    }
  | undefined = undefined;

export const configureLogger = (
  service: string,
  host: string,
  basicAuth?: string,
) => {
  loggerConfig = {
    service,
    host,
    basicAuth,
  };
};

const consoleFormat = format.printf(
  ({
    type,
    timestamp,
    level,
    message,
    request,
    user,
    offsetStep,
    offset,
    query,
  }) => {
    const { method, path } = request ?? {};
    const methodColor = method ? methodColors[method] : undefined;
    const coloredMethod = methodColor
      ? util.styleText(methodColor, method)
      : method;
    const coloredTimestamp = util.styleText("gray", timestamp);

    const coloredInlineQuery =
      query !== undefined ? util.styleText("green", "inline query") : undefined;
    const coloredOffsetStep =
      offsetStep !== undefined
        ? util.styleText("yellow", `${offsetStep}`)
        : undefined;
    const coloredOffset =
      offset !== undefined
        ? util.styleText("yellow", `${offset}`)
        : undefined;

    const action = `[${coloredInlineQuery ?? coloredMethod}${coloredOffsetStep && coloredOffset ? ` (${coloredOffsetStep}:${coloredOffset})` : ""}: ${query ?? path}]`;

    const userName = user
      ? `${user.meta?.get("firstName") ?? ""} ${user.meta?.get("lastName") ?? ""}`.trim() ||
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : undefined;
    const coloredUserName = userName
      ? util.styleText("blue", userName)
      : userName;
    const coloredUserId = user
      ? util.styleText("gray", user._id.toString())
      : undefined;
    const userField = user ? ` (${coloredUserName} - ${coloredUserId})` : "";
    const responseField =
      type === winstonTypes.httpRequestResponse || type === winstonTypes.inlineQueryResponse
        ? ` ${util.styleText("magenta", "Response")}`
        : undefined;

    return `${coloredTimestamp} ${level} ${action}${userField}${responseField}: ${util.inspect(message, { colors: coloredTimestamp !== timestamp })}`;
  },
);

const transformErrors = (info: unknown) => {
  if (info instanceof Error) {
    return {
      ...Object.getOwnPropertyNames(info).reduce(
        (acc, key) => ({ ...acc, [key]: transformErrors(info[key]) }),
        {},
      ),
      name: info.name,
    };
  }

  if (isPlainObject(info)) {
    return Object.keys(info).reduce(
      (acc, key) => ({ ...acc, [key]: transformErrors(info[key]) }),
      {},
    );
  }

  return info;
};

const formatErrorStacks = format(transformErrors);

const getUser = async (event: H3Event | InlineQueryContext<Context>) => {
  if (event instanceof H3Event) {
    let userId: string | undefined = undefined;
    try {
      userId = await getUserId(event, { ignoreExpiration: true });
    } catch (error) {
      userId = undefined;
    }
    return userId ? await ModelUser.findById(userId) : undefined;
  }

  return await ModelUser.findOne({ id: event.from.id });
};

const getLoggerInstance = async (
  event: H3Event | InlineQueryContext<Context>,
  type: keyof typeof winstonTypes,
) => {
  if (!loggerConfig) {
    throw new Error("Logger not configured");
  }

  const user = await getUser(event);

  let fingerprint: string | undefined = undefined;
  let rawBody: string | undefined = undefined;
  let requestBody: any | undefined = undefined;
  let formData: FormData | undefined = undefined;
  let multipartFormData: MultiPartData[] | undefined = undefined;

  if (event instanceof H3Event) {
    try {
      fingerprint = await getRequestFingerprint(event);
    } catch (error) {
      fingerprint = undefined;
    }
    try {
      rawBody = await readRawBody(event);
    } catch (error) {
      rawBody = undefined;
    }
    try {
      requestBody = await readBody(event, { strict: true });
    } catch (error) {
      requestBody = undefined;
    }
    try {
      if (getHeader(event, "content-type").toLowerCase().includes("application/x-www-form-urlencoded")) {
        formData = await readFormData(event);
      }
    } catch (error) {
      formData = undefined;
    }
    try {
      if (getHeader(event, "content-type").toLowerCase().includes("multipart/form-data")) {
        multipartFormData = await readMultipartFormData(event);
      }
    } catch (error) {
      multipartFormData = undefined;
    }
  }

  const loggerTransports: transport[] = [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        consoleFormat,
      ),
    }),
  ];

  if (process.env.VITEST !== "true") {
    loggerTransports.push(
      new LokiTransport({
        host: loggerConfig.host,
        basicAuth: loggerConfig.basicAuth,
        json: true,
        format: format.combine(formatErrorStacks(), format.json()),
        labels:
          event instanceof H3Event
            ? {
                id: event.context.id,
                service: loggerConfig.service,
                method: event.method,
                path: event.path,
              }
            : {
                id: event.inlineQuery.id,
                service: loggerConfig.service,
                query: event.inlineQuery.query.trim(),
                offsetStep: (event.inlineQuery.offset || "0:0")
                  .split(":")
                  .map(Number)[0],
                offset: (event.inlineQuery.offset || "0:0")
                  .split(":")
                  .map(Number)[1],
              },
        batching: true,
        gracefulShutdown: true,
        clearOnError: false,
        replaceTimestamp: true,
        onConnectionError: (err) =>
          console.error("Loki connection error:", err),
      }),
    );
  }

  return createLogger({
    level: "http",
    defaultMeta:
      event instanceof H3Event
        ? {
            service: loggerConfig.service,
            id: event.context.id,
            type: winstonTypes[type],
            request: {
              method: event.method,
              url: getRequestURL(event, {
                xForwardedHost: true,
                xForwardedProto: true,
              }),
              path: event.path,
              ip: getRequestIP(event),
              protocol: getRequestProtocol(event),
              host: getRequestHost(event),
              headers: getRequestHeaders(event),
              body: requestBody,
              rawBody,
              fingerprint,
              formData,
              multipartFormData,
            },
            user,
          }
        : {
            service: loggerConfig.service,
            id: event.inlineQuery.id,
            type: winstonTypes[type],
            query: event.inlineQuery.query.trim(),
            offsetStep: (event.inlineQuery.offset || "0:0")
              .split(":")
              .map(Number)[0],
            offset: (event.inlineQuery.offset || "0:0")
              .split(":")
              .map(Number)[1],
            context: event,
            user,
          },
    transports: loggerTransports,
  });
};

export const getLogger = async (
  event: H3Event | InlineQueryContext<Context>,
) => {
  return getLoggerInstance(
    event,
    event instanceof H3Event ? "httpRequestLog" : "inlineQueryLog",
  );
};

export const sendResponseLog = async (event: H3Event, response?: unknown) => {
  const loggerInstance = await getLoggerInstance(event, "httpRequestResponse");

  let body: unknown | undefined = response;

  if (response instanceof Error) {
    body = {
      error: true,
      url: getRequestURL(event, {
        xForwardedHost: true,
        xForwardedProto: true,
      }).toString(),
      statusCode:
        response instanceof H3Error
          ? response.statusCode
          : getResponseStatus(event),
      statusMessage:
        response instanceof H3Error
          ? (response.statusMessage ?? "Server Error")
          : (getResponseStatusText(event) ?? "Server Error"),
      message: response.message,
      data: (response as H3Error).data,
      stack: process.env.NODE_ENV === "production" ? undefined : response.stack,
    };
  }

  return loggerInstance.http({
    response: {
      status: getResponseStatus(event),
      statusText:
        response instanceof Error
          ? (getResponseStatusText(event) ?? "Server Error")
          : getResponseStatusText(event),
      headers: getResponseHeaders(event),
      body,
    },
    error: response instanceof Error ? response : undefined,
  });
};

export const sendInlineQueryResponseLog = async (
  event: InlineQueryContext<Context>,
  results: InlineQueryResult[] | Error,
  newOffset?: [number, number] | []
) => {
  const loggerInstance = await getLoggerInstance(event, "inlineQueryResponse");

  return loggerInstance.info({
    response: results instanceof Error ? undefined : results,
    error: results instanceof Error ? results : undefined,
    newOffsetStep: newOffset?.[0],
    newOffset: newOffset?.[1],
  });
};
