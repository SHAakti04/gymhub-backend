export function getPagination(input: { page?: number | string; limit?: number | string }) {
  const page = Math.max(Number(input.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(input.limit ?? 20), 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}