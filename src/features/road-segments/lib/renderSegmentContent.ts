const escapeHtml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');

const inline = (value: string): string =>
	escapeHtml(value)
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\[(.+?)\]\((\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

/** Минимальный рендер Markdown-контента сегмента (заголовки, списки, абзацы). */
export const renderSegmentContent = (content: string): string => {
	const blocks = content.split(/\n{2,}/);
	const html: string[] = [];

	for (const rawBlock of blocks) {
		const block = rawBlock.trim();
		if (!block) continue;

		const heading = /^(#{2,4})\s+(.+)$/.exec(block);
		if (heading) {
			const level = heading[1].length;
			html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
			continue;
		}

		const lines = block.split('\n').map((line) => line.trim());
		if (lines.every((line) => /^[-*]\s+/.test(line))) {
			const items = lines.map((line) => `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
			html.push(`<ul>${items.join('')}</ul>`);
			continue;
		}

		html.push(`<p>${lines.map(inline).join(' ')}</p>`);
	}

	return html.join('\n');
};
