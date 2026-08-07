// Retries a flaky async operation (network calls, mainly) with exponential
// backoff. Not for anything with side effects that shouldn't repeat (e.g. a
// non-idempotent write) - this is meant for read-ish or safely-repeatable
// calls like a file upload, where a dropped connection is far more likely
// than the request having already fully succeeded server-side.
//
// `shouldRetry(error)` lets the caller skip retrying errors that will never
// succeed on a second try (e.g. a 4xx validation error) - defaults to
// retrying everything, since the two current call sites (Cloudinary upload)
// don't have a clean way to distinguish "your file is bad" from "the
// network hiccuped" from the thrown Error alone.
export async function withRetry(fn, { attempts = 3, baseDelayMs = 500, shouldRetry = () => true } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts || !shouldRetry(err)) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
