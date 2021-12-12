export const NOP = () => {};

export const camelToKebab = (str: string): string =>
  str.replace(/([A-Z])/g, (m) => "-" + m.toLowerCase());
