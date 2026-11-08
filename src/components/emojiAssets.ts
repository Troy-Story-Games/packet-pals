const urls = import.meta.glob<string>('../assets/emoji/*.svg', {
  eager: true,
  import: 'default',
  query: '?url',
});

const byCode = new Map(
  Object.entries(urls).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
);

/** URL of a bundled Twemoji SVG by code point (e.g. "1f996"). */
export function emojiUrl(code: string): string | undefined {
  return byCode.get(code);
}
