import { Context, InlineQueryContext } from "grammy";
import { InlineQueryResult } from "grammy/types";
import { HydratedDocumentFromSchema } from "mongoose";
import { NitroRuntimeConfig } from "nitropack/types";

export interface InlineQueryResultParams {
  offset: number;
  limit: number;
  query: string;
  currentUser: HydratedDocumentFromSchema<typeof schemaUser>;
  getPhotoUrl: (id: string, photoUrl?: string) => string;
  ctx: InlineQueryContext<Context>;
  config: NitroRuntimeConfig;
};

export type InlineQueryReturnType = InlineQueryResult | InlineQueryResult[];

export type InlineQueryFunc = (params: InlineQueryResultParams) => InlineQueryReturnType | Promise<InlineQueryReturnType>;
