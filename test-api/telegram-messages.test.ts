const baseURL = "http://localhost:3000";

const messageBody = {
  content: "Some message",
  receiverId: 456,
};

const selfMessageBody = {
  content: "Some self message",
};

describe.sequential("Message", () => {
  const validAccessToken = issueAccessToken(
    { userId: 123 },
    { secret: process.env.SECRET }
  );

  describe("GET /message/can-send", () => {
    it("gets 200 with true before message sending", async () => {
      await $fetch("/message/can-send", {
        baseURL,
        method: "GET",
        headers: {
          Accept: "application/json",
          Cookie: `accessToken=${validAccessToken};`,
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
          Cookie: `accessToken=${validAccessToken};`,
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
          Cookie: `accessToken=${validAccessToken};`,
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
          Cookie: `accessToken=${validAccessToken};`,
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
          Cookie: `accessToken=${validAccessToken};`,
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
          Cookie: `accessToken=${validAccessToken};`,
        },
        onResponse: ({ response }) => {
          expect(response.status).toBe(200);
          expect(response._data.canSend).toBe(false);
        },
      });
    });
  });
});
