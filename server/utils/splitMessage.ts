const _splitRecursive = (
	content: string,
	limit: number,
	separator: string,
	fallbackSeparators: string[],
): string[] => {
	if (content.length <= limit) {
		return [content];
	}

	const chunks: string[] = [];
	let currentChunk = "";

	const parts = content.split(separator);

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		const nextChunk = currentChunk + (currentChunk ? separator : "") + part;

		if (nextChunk.length > limit) {
			if (currentChunk) {
				chunks.push(currentChunk);
				currentChunk = "";
			}

			if (part.length > limit) {
				if (fallbackSeparators.length > 0) {
					const [nextSeparator, ...restSeparators] = fallbackSeparators;
					chunks.push(
						..._splitRecursive(part, limit, nextSeparator, restSeparators),
					);
				} else {
					let remainingPart = part;
					while (remainingPart.length > limit) {
						chunks.push(remainingPart.slice(0, limit));
						remainingPart = remainingPart.slice(limit);
					}
					currentChunk = remainingPart;
				}
			} else {
				currentChunk = part;
			}
		} else {
			currentChunk = nextChunk;
		}
	}

	if (currentChunk) {
		chunks.push(currentChunk);
	}

	return chunks;
};

export const splitMessage = (
	content: string,
	limit: number = 4096,
): string[] => {
	return _splitRecursive(content, limit, "\n\n", ["\n"]);
};
