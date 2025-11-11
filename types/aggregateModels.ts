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

export interface CategoryV2 {
  _id: Types.ObjectId;
  name: string;
  userId: string;
  templateId: Types.ObjectId;
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

export interface IngredientV2 {
  _id: Types.ObjectId;
  name: string;
  userId: string;
  calories: number;
  proteins: number;
  grams: number;
  unit: "grams" | "pieces";
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
  allIngredients: Ingredient[];
  allIngredientsV2: IngredientV2[];
  sets: (Omit<Set, 'ingredients'> & {
    ingredients: (ArrayType<Set["ingredients"]> & {
      ingredient?: Ingredient & {
        category: Category;
      }
    })[]
  })[];
  setsV2: (Omit<Set, 'ingredients'> & {
    ingredients: (ArrayType<Set["ingredients"]> & {
      ingredient?: IngredientV2 & {
        category: CategoryV2;
      }
    })[]
  })[];
  messages: Message[];
  notes: Note[];
  notesV2: Note[];
};
