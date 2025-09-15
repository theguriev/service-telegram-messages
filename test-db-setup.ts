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
