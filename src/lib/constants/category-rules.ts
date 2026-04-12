/** Seeded category group names — used for validation and form hints. */
export const SALARY_WAGES_PARENT_NAME = "Salary & Wages";
export const OTHER_INCOME_PARENT_NAME = "Other Income";
export const GIFTS_OCCASIONS_PARENT_NAME = "Gifts & Occasions";

export const GIFT_SUBCATEGORIES_REQUIRING_RECIPIENT = [
  "Birthday Gifts",
  "Personal Gifts",
] as const;

export function giftRecipientRequiredForSubcategory(name: string): boolean {
  return (GIFT_SUBCATEGORIES_REQUIRING_RECIPIENT as readonly string[]).includes(
    name,
  );
}
