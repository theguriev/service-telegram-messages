export const splitMessage = (
    content: string,
    limit: number = 4096,
): string[] => {
    if (content.length <= limit) {
        return [content];
    }

    const chunks: string[] = [];
    let currentChunk = "";

    const blocks = content.split("\n\n");

    for (const block of blocks) {
        if ((currentChunk + (currentChunk ? "\n\n" : "") + block).length > limit) {
            if (currentChunk) {
                chunks.push(currentChunk);
                currentChunk = "";
            }

            if (block.length > limit) {
                const lines = block.split("\n");
                for (const line of lines) {
                    if (
                        (currentChunk + (currentChunk ? "\n" : "") + line).length > limit
                    ) {
                        if (currentChunk) {
                            chunks.push(currentChunk);
                            currentChunk = "";
                        }

                        if (line.length > limit) {
                            let remainingLine = line;
                            while (remainingLine.length > limit) {
                                chunks.push(remainingLine.slice(0, limit));
                                remainingLine = remainingLine.slice(limit);
                            }
                            currentChunk = remainingLine;
                        } else {
                            currentChunk = line;
                        }
                    } else {
                        currentChunk += (currentChunk ? "\n" : "") + line;
                    }
                }
            } else {
                currentChunk = block;
            }
        } else {
            currentChunk += (currentChunk ? "\n\n" : "") + block;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
};
