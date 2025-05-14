import { useTelegram as originalUseTelegram } from "#imports";
import { Api } from "grammy";
import { Mock, vi } from "vitest";

type DeepMockedObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? Mock<(...args: any[]) => any>
    : T[K] extends object
      ? DeepMockedObject<T[K]>
      : T[K];
};

const deepObjectMock = <T>(obj: T): DeepMockedObject<T> => {
  return Object.getOwnPropertyNames(obj).reduce((acc, key) => {
    const value = obj[key];

    if (key === 'constructor') {
      return { ...acc, [key]: value }
    } else if (key === 'config') {
      return {
        ...acc,
        [key]: {
          use: vi.fn(),
          installedTransformers: vi.fn(),
        }
      }
    } else if (typeof value === "object" && value !== null) {
      return { ...acc, [key]: deepObjectMock(value) };
    } else if (typeof value === "function") {
      return { ...acc, [key]: vi.fn() };
    }

    return { ...acc, [key]: value };
  }, {} as DeepMockedObject<T>);
};

const mockedTelegramApi = deepObjectMock<ReturnType<typeof originalUseTelegram>>(Api.prototype);

export const useTelegram = vi.fn(() => mockedTelegramApi);
