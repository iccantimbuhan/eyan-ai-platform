const IS_DEV = process.env.NODE_ENV !== "production";

export const logger = {
  info: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => {
    if (IS_DEV) {
      console.debug(...args);
    }
  },
};
