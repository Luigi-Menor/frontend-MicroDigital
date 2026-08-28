export function cn(...valores: Array<string | false | null | undefined>): string {
  return valores.filter(Boolean).join(" ");
}
