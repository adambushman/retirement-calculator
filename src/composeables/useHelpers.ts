export function formatRange(arr: Array<any>, prefix: string, suffix: string) {
  return `${prefix}${arr[0]!}${suffix} - ${prefix}${arr[1]!}${suffix}`;
}