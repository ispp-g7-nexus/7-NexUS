export interface Meal {
  allergens: any;
  id?: string;
  name: string;
  description?: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  isGlutenFree?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  image?: string;
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
  isPublished?: boolean;
  days: MenuDay[];
}
