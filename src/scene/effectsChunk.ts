/**
 * The browser module map remembers a failed module URL for the life of the page.
 * A new `React.lazy` of the same `import()` does not ask for the file again.
 * The next attempt fetches the built chunk with a new query, and points the
 * post-processing import at that query too, so a 404 of either file can succeed later.
 * The other imports stay on their original URLs, which are already evaluated.
 */
const relativeImport = /(?:from|import)\s*(["'])(\.\/[^"']+\.js)\1/g;

export const rewriteEffectsChunkSource = (source: string, chunkUrl: URL, attempt: number) => {
  relativeImport.lastIndex = 0;
  return source.replace(relativeImport, (match, quote: string, spec: string) => {
    const keyword = match.startsWith('import') ? 'import' : 'from';
    const absolute = new URL(spec, chunkUrl).href;
    const next = spec.startsWith('./postprocessing-') ? `${absolute}?retry=${attempt}` : absolute;
    return `${keyword}${quote}${next}${quote}`;
  });
};

/** The preload helper inserts this link before the dynamic import runs. */
export const effectsChunkUrl = (error?: unknown) => {
  if (typeof document !== 'undefined') {
    const link = document.querySelector('link[rel="modulepreload"][href*="/Effects-"]');
    if (link instanceof HTMLLinkElement && link.href.includes('/Effects-')) return link.href;
  }
  const message = error instanceof Error ? error.message : '';
  const match = message.match(/https?:\/\/\S*\/Effects-[^/?#\s'"]+\.js/);
  return match?.[0] ?? null;
};

export const importEffectsModule = async (attempt: number, chunkUrl: string) => {
  const url = new URL(chunkUrl);
  const response = await fetch(`${url.href}?retry=${attempt}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Effects chunk responded ${response.status}`);
  }
  const source = rewriteEffectsChunkSource(await response.text(), url, attempt);
  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  try {
    return (await import(/* @vite-ignore */ blobUrl)) as { Effects: unknown };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
};
