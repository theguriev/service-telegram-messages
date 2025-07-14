import type { Types } from "mongoose";

const getBalance = async (base: string, userId: Types.ObjectId | string) => {
  const { balance } = await $fetch<{ balance: number }>(`/private/balance/${userId}`, {
    retry: 5,
    retryDelay: 1000,
    baseURL: base,
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return balance;
};

export default getBalance;
