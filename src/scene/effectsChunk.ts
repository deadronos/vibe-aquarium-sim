/**
 * The browser module map remembers a failed module URL for the life of the page.
 * A new `React.lazy` of the same `import()` does not ask for the file again.
 * The next attempt fetches the built chunk with a new query, and points the
 * post-processing import at that query too, so a 404 of either file can succeed later.
 * The other imports stay on their original URLs, which are already evaluated.
 *
 * The rewritten chunk is imported from a `blob:` URL. If the page ever gets a Content
 * Security Policy, `script-src` has to allow `blob:` or this retry cannot run.
 */
const relativeImport = /(?:from|import)\s*(["'])(\.\/[^"']+\.js)\1/g;

/** Any relative specifier, static or dynamic, that would resolve against the `blob:` URL. */
const leftoverRelativeImport = /(?:from|import)\s*\(?\s*["']\.{1,2}\//;

/** The post chunk could not be fetched or evaluated. `retryable` is false when another try cannot help. */
export class EffectsChunkError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'EffectsChunkError';
    this.retryable = retryable;
  }
}

export const rewriteEffectsChunkSource = (source: string, chunkUrl: URL, attempt: number) => {
  relativeImport.lastIndex = 0;
  const rewritten = source.replace(relativeImport, (match, quote: string, spec: string) => {
    const keyword = match.startsWith('import') ? 'import' : 'from';
    const absolute = new URL(spec, chunkUrl).href;
    const next = spec.startsWith('./postprocessing-') ? `${absolute}?retry=${attempt}` : absolute;
    return `${keyword}${quote}${next}${quote}`;
  });
  // The rewrite matches minified Rolldown output. If that output changes shape, fail loudly
  // instead of importing a module whose relative imports point into `blob:`.
  if (leftoverRelativeImport.test(rewritten)) {
    throw new EffectsChunkError(
      'Effects chunk has a relative import the retry cannot rewrite',
      false
    );
  }
  return rewritten;
};

/**
 * Chromium: "Failed to fetch dynamically imported module: <url>".
 * Firefox: "error loading dynamically imported module: <url>".
 * Safari: "Importing a module script failed."
 */
const moduleLoadMessage = /dynamically imported module|Importing a module script failed/i;

/** A download failure of the post stack, as opposed to an error thrown after it loaded. */
export const isEffectsChunkError = (error: unknown) =>
  error instanceof EffectsChunkError ||
  (error instanceof TypeError && moduleLoadMessage.test(error.message));

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
    throw new EffectsChunkError(`Effects chunk responded ${response.status}`, true);
  }
  const source = rewriteEffectsChunkSource(await response.text(), url, attempt);
  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  try {
    return (await import(/* @vite-ignore */ blobUrl)) as { Effects: unknown };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
};

/**
 * True when the deployed `index.html` no longer loads this page's entry script, i.e. a new
 * build replaced this one and its hashed chunks are gone. Network trouble reads as "not stale".
 */
export const newVersionDeployed = async () => {
  const entry = document.querySelector('script[type="module"][src]')?.getAttribute('src');
  if (!entry) return false;
  try {
    const response = await fetch(window.location.pathname, { cache: 'no-store' });
    if (!response.ok) return false;
    return !(await response.text()).includes(entry);
  } catch {
    return false;
  }
};
