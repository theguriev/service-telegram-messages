import { bllsBase } from "~~/constants";

const getTransactions = async (options: {
  address?: string;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
  orderBy?: '_id' | 'from' | 'to' | 'symbol' | 'timestamp' | 'message' | 'value';
} = {}) => {
  return await $fetch<{
      _id: string;
      from: string;
      to: string;
      symbol: string;
      timestamp: number;
      message?: string;
      value: number;
    }[]>(`/billing/transactions`, {
      baseURL: bllsBase,
      query: {
        symbol: 'nka',
        ...options,
      },
      retry: 5,
      retryDelay: 1000,
    });
};

export default getTransactions;
