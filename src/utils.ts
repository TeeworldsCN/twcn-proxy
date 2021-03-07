import { DateTime } from 'luxon';

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

export const toTimestamp = (ddnetTime: string) => {
  const time = DateTime.fromISO(`${ddnetTime.slice(0, 10)}T${ddnetTime.slice(11, 16)}+0100`);
  if (time.isValid) return time.toMillis();
  return 0;
};

export const toRacetime = (time: string) => {
  if (!time) return NaN;

  const data = time.split('.')[0].split(':').reverse();
  let factor = 1;
  let result = 0;
  for (let part of data) {
    result += (parseInt(part) || 0) * factor;
    factor = factor * 60;
  }
  return result;
};
