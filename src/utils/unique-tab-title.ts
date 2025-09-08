const isBaseTitleAvailable = (existingTitles: string[], titlePrefix: string): boolean => {
  return !existingTitles.includes(titlePrefix);
};

const extractNumberFromTitle = (title: string, titlePrefix: string): number | null => {
  if (title === titlePrefix) return 1;

  if (!title.startsWith(`${titlePrefix} `)) return null;

  const numberPart = title.slice(titlePrefix.length + 1);
  const num = parseInt(numberPart, 10);

  return !isNaN(num) && num > 0 && numberPart === num.toString() ? num : null;
};

const findMaxTitleNumber = (existingTitles: string[], titlePrefix: string): number => {
  let maxNumber = 0;

  for (const title of existingTitles) {
    const number = extractNumberFromTitle(title, titlePrefix);
    if (number !== null) {
      maxNumber = Math.max(maxNumber, number);
    }
  }

  return maxNumber;
};

export const getUniqueTabTitle = (existingTitles: string[], titlePrefix = 'Untitled'): string => {
  if (isBaseTitleAvailable(existingTitles, titlePrefix)) {
    return titlePrefix;
  }

  const maxNumber = findMaxTitleNumber(existingTitles, titlePrefix);
  return `${titlePrefix} ${maxNumber + 1}`;
};
