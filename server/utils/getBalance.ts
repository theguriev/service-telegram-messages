import { bllsBase } from "~~/constants";

const getBalance = async (address: string, currencySymbol: string) => {
  const balance = await $fetch<Record<string, number>>(`/billing/ballance/${address}`, {
    retry: 5,
    retryDelay: 1000,
    baseURL: bllsBase,
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  return balance?.[currencySymbol];
};

export default getBalance;
