import { isString } from "es-toolkit";
import { bllsBase } from "~~/constants";

interface BalancesResponse<T extends string = string> {
  totalAddresses: number;
  successfullRequests: number;
  failedRequests: number;
  results: {
    [K in T]: {
      address: K;
      success: boolean;
      incomeTransactionCount: number;
      outcomeTransactionCount: number;
      balanceBySymbol: Record<string, number | undefined>;
    }
  }
};

export default async function getBalance(address: string, currencySymbol: string): Promise<number>;
export default async function getBalance<const T extends string>(addresses: T[], currencySymbol: string): Promise<Record<T, number>>;

export default async function getBalance<const T extends string>(address: string | T[], currencySymbol: string) {
  if (isString(address)) {
    const balance = await $fetch<Record<string, number | undefined>>(`/billing/ballance/${address}`, {
      baseURL: bllsBase,
      retry: 5,
      retryDelay: 1000,
    });
    return balance?.[currencySymbol] ?? 0;
  }

  const limit = 100;
  const asyncBalances = Array.from({ length: Math.ceil(address.length / limit) }, async (_, offset) => {
    const chunk = address.slice(offset * limit, (offset + 1) * limit);
    const { results } = await $fetch<BalancesResponse<T>>(`/billing/ballance`, {
      method: 'POST',
      body: {
        addresses: chunk,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      baseURL: bllsBase,
      retry: 5,
      retryDelay: 1000,
    });
    return Object.values(results).reduce<Record<T, number>>((acc, { address, ballanceBySymbol }) => ({
      ...acc,
      [address]: ballanceBySymbol?.[currencySymbol] ?? 0,
    }), {} as Record<T, number>);
  });
  const balances = await Promise.all(asyncBalances);

  return balances.reduce((acc, balance) => ({
    ...acc,
    ...balance,
  }), {} as Record<T, number>);
};
