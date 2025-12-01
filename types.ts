
export enum Unit {
  GRAM = 'g',
  KILOGRAM = 'kg',
  MILLILITER = 'ml',
  LITER = 'l',
  PIECE = 'pc',
  OUNCE = 'oz',
  POUND = 'lb'
}

export const INGREDIENT_CATEGORIES = [
  'Meat', 
  'Seafood', 
  'Flours', 
  'Dairy', 
  'Bakery', 
  'Condiments', 
  'Vegetables', 
  'Pasta', 
  'Fruits', 
  'Alcohol', 
  'Others'
] as const;

export type IngredientCategory = typeof INGREDIENT_CATEGORIES[number];

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  purchaseUnit: Unit;
  purchaseCost: number; // Cost per purchase unit
  purchaseQuantity: number; // Amount in one purchase unit (e.g., 5 for 5kg bag)
  costPerBaseUnit: number; // Calculated internally (e.g., cost per 1 gram)
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number; // In the ingredient's base unit (e.g., grams)
  unit: Unit; // The unit used in the recipe
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  servings: number;
  ingredients: RecipeIngredient[];
  laborCost: number; // Flat rate or per hour calculation simplified
  overheadPercentage: number; // e.g., 10%
  targetFoodCostPercentage: number; // e.g., 30%
  instructions?: string;
  imageUrl?: string;
}

export interface CostBreakdown {
  totalIngredientCost: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
  costPerServing: number;
  suggestedPrice: number;
  actualPrice?: number;
  currentMargin?: number;
}

export type ViewState = 'dashboard' | 'ingredients' | 'recipes' | 'recipe-builder';
