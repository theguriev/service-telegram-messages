import { Types } from "mongoose";

export type User = InferAggregateFromSchema<typeof schemaUser>;
export type Message = InferAggregateFromSchema<typeof schemaMessage>;

export interface Measurement {
  _id: Types.ObjectId;
  userId: string;
  timestamp: number;
  type: string;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

export interface Category {
  _id: Types.ObjectId;
  name: string;
  userId: string;
  mealId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export interface Ingredient {
  _id: Types.ObjectId;
  name: string;
  userId: string;
  calories: number;
  proteins: number;
  grams: number;
  categoryId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export interface Set {
  _id: Types.ObjectId;
  userId: string;
  ingredients: {
    _id: Types.ObjectId;
    id: string;
    value: number;
    additionalInfo?: string;
  }[],
  createdAt: Date;
  updatedAt: Date;
};

export interface Note {
  _id: Types.ObjectId;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface ReportUser extends User {
  measurements: Measurement[];
  sets: (Omit<Set, 'ingredients'> & {
    ingredients: (ArrayType<Set["ingredients"]> & {
      ingredient: Ingredient & {
        category: Category;
      }
    })[]
  })[];
  messages: Message[];
  notes: Note[];
};
