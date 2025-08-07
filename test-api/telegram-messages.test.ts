
const baseURL = "http://localhost:3000";

const messageBody = {
  content: "Some message",
  receiverId: 456,
};

const selfMessageBody = {
  content: "Some self message",
};

const afterWizardMessage = {
  sex: "female",
  firstName: "Test",
  lastName: "Test",
  birthday: new Date(),
  height: 1,
  weight: 2,
  waist: 1,
  shoulder: 1,
  hip: 1,
  hips: 1,
  chest: 1,
  contraindications: "Test",
  eatingDisorder: "Test",
  spineIssues: "Test",
  endocrineDisorders: "Test",
  physicalActivity: "Test",
  foodIntolerances: "Test",
  goalWeight: 1,
  whereDoSports: "gym",
  isGaveBirth: "yes",
  gaveBirth: new Date(),
  breastfeeding: "yes",
  receiverId: 444812883
};

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

  describe("POST /message/self", () => {
    it("gets 204 on valid message data", async () => {
      await $fetch("/message/self", {
        baseURL,
        method: "POST",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${regularAccessToken};`,
        },
        body: selfMessageBody,
        onResponse: ({ response }) => {
          expect(response.status).toBe(204);
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
});
