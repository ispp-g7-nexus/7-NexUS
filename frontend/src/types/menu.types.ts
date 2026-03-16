export interface Meal {
  id?: string;
  name: string;
  description?: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  allergens?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
}

export interface MenuDay {
  id?: string;
  day: string; // lunes, martes, etc.
  date: string; // YYYY-MM-DD format
  meals: Meal[];
}

export interface MenuWeek {
  id?: string;
  weekStart: string; // YYYY-MM-DD format
  weekEnd: string; // YYYY-MM-DD format
  days: MenuDay[];
}
