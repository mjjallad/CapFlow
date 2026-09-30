import { normalizeJordanPhone } from "@/lib/phone";

/**
 * The PostgREST `or` filter for a captain search box: name, both phone numbers
 * and the platform id. A typed phone is also matched in its canonical form, so
 * "0791234567" finds the captain stored as "+962791234567".
 */
export function captainSearchFilter(query: string): string {
  const term = escape(query.trim());
  const clauses = [
    `full_name.ilike.%${term}%`,
    `phone.ilike.%${term}%`,
    `phone_secondary.ilike.%${term}%`,
    `external_user_id.ilike.%${term}%`,
  ];

  const canonical = normalizeJordanPhone(query);
  if (canonical) {
    clauses.push(`phone.eq.${canonical}`, `phone_secondary.eq.${canonical}`);
  }

  return clauses.join(",");
}

/** Commas and parentheses would otherwise split or close the filter expression. */
function escape(value: string): string {
  return value.replace(/[(),]/g, " ");
}
