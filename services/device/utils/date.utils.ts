export const formatApiDate = (targetDate: Date): string => {
  return `${targetDate.getDate()}-${targetDate.getMonth() + 1}-${targetDate.getFullYear()}`;
};
