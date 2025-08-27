type Transaction = Awaited<ReturnType<typeof getTransactions>>[number];

export default async function getAllTransactions(): Promise<Transaction[]>;
export default async function getAllTransactions(
  options: Omit<Parameters<typeof getTransactions>[0], "offset" | "limit">
): Promise<Transaction[]>;
export default async function getAllTransactions(
  options: Omit<Parameters<typeof getTransactions>[0], "offset" | "limit">,
  predicate: (transaction: Transaction, index: number) => boolean
): Promise<Transaction | undefined>;

export default async function getAllTransactions(
  options: Omit<Parameters<typeof getTransactions>[0], "offset" | "limit"> = {},
  predicate?: (transaction: Transaction, index: number) => boolean
): Promise<undefined | Transaction | Transaction[]> {
  const step = 1000;

  if (!predicate) {
    let transactions: Awaited<ReturnType<typeof getTransactions>> = [];
    for (let offset = 0; transactions.length === offset; offset += step) {
      const nextTransactions = await getTransactions({
        ...options,
        limit: step,
        offset,
      });
      transactions = [...transactions, ...nextTransactions];
    }

    return transactions;
  }

  for (let offset = 0, transactions = 0; transactions === offset; offset += step) {
    const nextTransactions = await getTransactions({
      ...options,
      limit: step,
      offset,
    });
    const foundTransaction = nextTransactions.find(predicate);
    if (foundTransaction) return foundTransaction;
    transactions += nextTransactions.length;
  }
  return undefined;
};
