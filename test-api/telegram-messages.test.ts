import { addDays, subDays } from "date-fns";
import { omit } from "es-toolkit";
import { regularId } from "../constants";

const baseURL = "http://localhost:3000";

const messageBody = {
  receiverId: 456,
};

const afterWizardMessage = {
  sex: "female",
  birthday: new Date(),
  height: 1,
  weight: 2,
  waist: 1,
  shoulder: 1,
  hip: 1,
  hips: 1,
  chest: 1,
  goalWeight: 1,
  whereDoSports: "gym",
  isGaveBirth: "yes",
  gaveBirth: new Date(),
  breastfeeding: "yes",
  receiverId: 123456789,
};

const measurementsMessage = {
  weight: {
    value: 70,
    lastValue: 80,
    startValue: 90,
    goal: 60,
  },
  waist: {
    value: 80,
    lastValue: 85,
    startValue: 90,
  },
  shoulder: {
    value: 90,
    lastValue: 95,
    startValue: 100,
  },
  hip: {
    value: 100,
  },
  hips: {
    value: 110,
  },
  chest: {
    value: 120,
  },
  receiverId: 123456789,
};
const onlyMeasurements = omit(measurementsMessage, ["receiverId"]);

describe.sequential("Message", () => {
  let adminAccessToken: string;
  let regularAccessToken: string;

  beforeAll(async () => {
    adminAccessToken = process.env.VALID_ADMIN_ACCESS_TOKEN;
    regularAccessToken = process.env.VALID_REGULAR_ACCESS_TOKEN;
  });

  describe("GET /message/can-send", () => {
    it("gets 200 with true before message sending", async () => {
      await $fetch("/message/can-send", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data.canSend).toBe(true);
        },
      });
    });
  });

  describe("GET /message", () => {
    it("gets 401 on authorization error", async () => {
      await $fetch("/message", {
        baseURL,
        method: "GET",
        ignoreResponseError: true,
        headers: {
          Accept: "application/json",
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(401);
        },
      });
    });

    it("gets 400 on validation error", async () => {
      await $fetch("/message", {
        baseURL,
        method: "GET",
        ignoreResponseError: true,
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        query: {
          startDate: "invalid",
          endDate: "invalid",
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(400);
        },
      });
    });

    it("gets 200 with empty messages", async () => {
      await $fetch("/message", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data).toEqual([]);
        },
      });
    });
  });

  describe("POST /message/first-messages", async () => {
    it("gets 403 for non admin", async () => {
      await $fetch("/message/first-messages", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        ignoreResponseError: true,
        body: { users: [regularId] },
        onResponse: ({ response }) => {
          expect(response.status).toBe(403);
        },
      });
    })

    it("gets 401 on authorization error", async () => {
      await $fetch("/message/first-messages", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        ignoreResponseError: true,
        body: { users: [regularId] },
        onResponse: ({ response }) => {
          expect(response.status).toBe(401);
        },
      });
    });

    it("gets 400 on validation error with empty request body", async () => {
      await $fetch("/message/first-messages", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${adminAccessToken};`,
        },
        ignoreResponseError: true,
        body: {  },
        onResponse: ({ response }) => {
          expect(response.status).toBe(400);
        },
      });
    });

    it("gets 400 on validation error with empty users array", async () => {
      await $fetch("/message/first-messages", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${adminAccessToken};`,
        },
        ignoreResponseError: true,
        body: { users: [] },
        onResponse: ({ response }) => {
          expect(response.status).toBe(400);
        },
      });
    });

    it("gets 400 on validation error with invalid user id", async () => {
      await $fetch("/message/first-messages", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${adminAccessToken};`,
        },
        ignoreResponseError: true,
        body: { users: ["invalidUserId"] },
        onResponse: ({ response }) => {
          expect(response.status).toBe(400);
        },
      });
    });

    it("gets 200 with empty result", async () => {
      await $fetch("/message/first-messages", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${adminAccessToken};`,
        },
        body: { users: [regularId] },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data).toEqual([]);
        },
      });
    })
  })

  describe("POST /message", () => {
    it("gets 400 on validation errors", async () => {
      await $fetch("/message", {
        baseURL,
        method: "POST",
        ignoreResponseError: true,
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        body: {},
        onResponse: ({ response }) => {
          expect(response.status).toBe(400);
        },
      });
    });

    it("gets 200 on valid message data", async () => {
      await $fetch("/message", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        body: messageBody,
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data.message).toMatchObject(messageBody);
        },
      });
    });

    it("gets 403 on valid message data but already sended message today", async () => {
      await $fetch("/message", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        body: messageBody,
        ignoreResponseError: true,
        onResponse: ({ response }) => {
          expect(response.status).toBe(403);
        },
      });
    });
  });

  describe("GET /message", () => {
    it("gets 200 with message data", async () => {
      await $fetch("/message", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data).toBeInstanceOf(Array);
          expect(response._data).toHaveLength(1);
          expect(response._data[0]).toBeInstanceOf(Object);
          expect(response._data[0]).toHaveProperty("content");
          expect(response._data[0]).toHaveProperty("receiverId", messageBody.receiverId);
        },
      });
    });

    it("gets 200 by too big start date with empty message data", async () => {
      await $fetch("/message", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        query: {
          startDate: addDays(new Date(), 1).toISOString(),
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data).toEqual([]);
        },
      });
    });

    it("gets 200 by too small end date with empty message data", async () => {
      await $fetch("/message", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        query: {
          endDate: subDays(new Date(), 1).toISOString(),
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data).toEqual([]);
        },
      });
    });

    it("gets 200 by valid date with message data", async () => {
      await $fetch("/message", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        query: {
          startDate: subDays(new Date(), 1).toISOString(),
          endDate: addDays(new Date(), 1).toISOString(),
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data).toBeInstanceOf(Array);
          expect(response._data).toHaveLength(1);
          expect(response._data[0]).toBeInstanceOf(Object);
          expect(response._data[0]).toHaveProperty("content");
          expect(response._data[0]).toHaveProperty("receiverId", messageBody.receiverId);
        },
      });
    });
  });

  describe("POST /message/first-messages", () => {
    it("gets 200 with message", async () => {
      await $fetch("/message/first-messages", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${adminAccessToken};`,
        },
        body: { users: [regularId] },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data).toBeInstanceOf(Array);
          expect(response._data).toHaveLength(1);
          expect(response._data[0]).toBeInstanceOf(Object);
          expect(response._data[0]).toHaveProperty("userId", regularId);
          expect(response._data[0]).toHaveProperty("message");
          expect(response._data[0].message).toBeInstanceOf(Object);
          expect(response._data[0].message).toHaveProperty("content");
          expect(response._data[0].message).toHaveProperty("userId", regularId);
          expect(response._data[0].message).toHaveProperty("receiverId", messageBody.receiverId);
        },
      });
    });
  });

  describe("GET /message/can-send", () => {
    it("gets 200 with false after message sending", async () => {
      await $fetch("/message/can-send", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data.canSend).toBe(false);
        },
      });
    });
  });

  describe("GET /message/after-wizard/can-send", () => {
    it("gets 401 on unauthorized access token", async () => {
      await $fetch("/message/after-wizard/can-send", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        ignoreResponseError: true,
        onResponse: ({ response }) => {
          expect(response.status).toBe(401);
        },
      });
    });

    it("gets 200 with true before message sending", async () => {
      await $fetch("/message/after-wizard/can-send", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data.canSend).toBe(true);
        },
      });
    });
  });

  describe("POST /message/after-wizard", () => {
    it("gets 401 on unauthorized access token", async () => {
      await $fetch("/message/after-wizard", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        ignoreResponseError: true,
        onResponse: ({ response }) => {
          expect(response.status).toBe(401);
        },
      });
    });

    it("gets 400 on validation errors", async () => {
      await $fetch("/message/after-wizard", {
        baseURL,
        method: "POST",
        ignoreResponseError: true,
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        body: {},
        onResponse: ({ response }) => {
          expect(response.status).toBe(400);
        },
      });
    });

    it("gets 200 on valid message data", async () => {
      await $fetch("/message/after-wizard", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        body: afterWizardMessage,
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data.content).toBeTypeOf("string");
        },
      });
    });
  });

  describe("GET /message/after-wizard/can-send", () => {
    it("gets 200 with false after message sending", async () => {
      await $fetch("/message/after-wizard/can-send", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data.canSend).toBe(false);
        },
      });
    });
  });

  describe("POST /message/measurements", () => {
    it("gets 401 on unauthorized access token", async () => {
      await $fetch("/message/measurements", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        ignoreResponseError: true,
        body: measurementsMessage,
        onResponse: ({ response }) => {
          expect(response.status).toBe(401);
        },
      });
    });

    it("gets 400 on validation errors with empty body", async () => {
      await $fetch("/message/measurements", {
        baseURL,
        method: "POST",
        ignoreResponseError: true,
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        body: {},
        onResponse: ({ response }) => {
          expect(response.status).toBe(400);
        },
      });
    });

    it("gets 200 on valid message data", async () => {
      await $fetch("/message/measurements", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        body: measurementsMessage,
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data.content).toBeTypeOf("string");
          expect(response._data.message.userId).toBe(regularId);
          expect(response._data.message.receiverId).toBe(measurementsMessage.receiverId);
          expect(response._data.message.measurements.map((value: {
            _id: string,
            id: string,
            type: string,
            value: number
          }) => omit(value, ["_id"]))).toEqual(
            Object.entries(onlyMeasurements).map(([type, value]) => ({ ...value, type })),
          );
        },
      });
    });
  });
});
