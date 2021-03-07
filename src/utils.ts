export const ddnetEncode = (str: string) =>
  encodeURIComponent(
    str
      .replace(/\-/g, '')
      .replace(/\\/g, '-92-')
      .replace(/\%/g, '-37-')
      .replace(/\?/g, '-63-')
      .replace(/\&/g, '-38-')
      .replace(/\=/g, '-61-')
      .replace(/\//g, '-47-')
  );
