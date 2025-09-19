import { ObjectId } from "mongodb";
import mongoose, { Schema } from "mongoose";
import { adminId, regularId } from "./constants";

export const adminUserSeedData = {
  _id: new ObjectId(adminId), // Specific ObjectId for admin
  id: 379669528,
  firstName: "AdminSeedFirstName",
  lastName: "AdminSeedLastName",
  username: "testadminseeduser",
  photoUrl: "https://example.com/adminseed.jpg",
  authDate: Math.floor(Date.now() / 1000) - 7200,
  hash: "seed-admin-hash",
  role: "admin",
  address: "0xb75f1a7a3c9c60857A37A3C008E5619f0a934673",
  privateKey:
    "0xcb4d8dd1bd0859cde9e07fc96011fb53a80c7aff4968a199197b59efbb759b14",
};

export const regularUserSeedData = {
  _id: new ObjectId(regularId), // Specific ObjectId for regular user
  id: 123456789, // Telegram ID, must match regularUserLoginPayload in users.test.ts
  firstName: "RegularSeedUser",
  lastName: "TestSeed",
  username: "testregularseeduser",
  photoUrl: "https://example.com/regularseed.jpg",
  authDate: Math.floor(Date.now() / 1000) - 7200,
  hash: "seed-regular-hash", // Placeholder
  role: "user",
  address: "0xCa23Cfc3dffE0bC7E8fFdbE1240008ad592da1d5",
  privateKey:
    "0xce60ab2312c1f4e507f59e196f6c4e8a9d664bdfac74d1e0cffaa4debd236f4e",
  meta: {
    managerId: adminUserSeedData.id, // Link to admin user
    firstName: "RegularSeedFirstName",
    lastName: "RegularSeedLastName",
    contraindications: "Test",
    eatingDisorder: "Test",
    spineIssues: "Test",
    endocrineDisorders: "Test",
    physicalActivity: "Test",
    foodIntolerances: "Test",
  },
};

export const measurementSeedData = {
  _id: new ObjectId(),
  userId: regularUserSeedData._id.toString(),
  timestamp: new Date().getTime(),
  type: "steps",
  meta: {
    value: 10000,
  }
};

export async function clearTestData() {
  try {
    await ModelUser.deleteMany({});
    await mongoose.model("Measuerements", new Schema({}, { strict: false })).deleteMany({});
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✓",
      "Test database cleared successfully."
    );
  } catch (error) {
    console.error("Error clearing test database:", error);
    throw error; // Rethrow to fail test setup if clearing fails
  }
}

export async function seedTestData() {
  try {
    await ModelUser.create([adminUserSeedData, regularUserSeedData]);
    await mongoose.model("Measurements", new Schema({}, { strict: false })).create([measurementSeedData]);
    console.log("\x1b[32m%s\x1b[0m", "✓", "Test database seeded successfully.");
  } catch (error) {
    console.error("Error seeding test database:", error);
    if (error.code === 11000) {
      console.warn(
        "Duplicate key error during seeding. This might indicate an issue with clearing data or ObjectId reuse."
      );
    }
    throw error;
  }
}
