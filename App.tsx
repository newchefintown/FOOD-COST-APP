
import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import IngredientManager from './components/IngredientManager';
import RecipeManager from './components/RecipeManager';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Ingredient, Recipe, ViewState, CostBreakdown, Unit } from './types';
import { LayoutDashboard, ShoppingBasket, ChefHat, Settings, Download } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // -- PWA Install Logic --
  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };
  
  // -- State Management --
  // Initialize with some dummy data if empty (Updated for IDR prices and new Categories)
  const [ingredients, setIngredients] = useLocalStorage<Ingredient[]>('forketta_ingredients', [
    { id: '1', name: 'All-Purpose Flour', category: 'Flours', purchaseUnit: Unit.KILOGRAM, purchaseCost: 18000, purchaseQuantity: 1, costPerBaseUnit: 18 },
    { id: '2', name: 'Eggs (Large Tray)', category: 'Dairy', purchaseUnit: Unit.PIECE, purchaseCost: 65000, purchaseQuantity: 30, costPerBaseUnit: 2166.67 },
    { id: '3', name: 'Fresh Milk', category: 'Dairy', purchaseUnit: Unit.LITER, purchaseCost: 28000, purchaseQuantity: 1, costPerBaseUnit: 28 },
    { id: '4', name: 'Ground Beef', category: 'Meat', purchaseUnit: Unit.KILOGRAM, purchaseCost: 140000, purchaseQuantity: 1, costPerBaseUnit: 140 },
    { id: '5', name: 'Olive Oil', category: 'Condiments', purchaseUnit: Unit.LITER, purchaseCost: 125000, purchaseQuantity: 1, costPerBaseUnit: 125 },
    { id: '6', name: 'Tomatoes', category: 'Vegetables', purchaseUnit: Unit.KILOGRAM, purchaseCost: 15000, purchaseQuantity: 1, costPerBaseUnit: 15 },
  ]);

  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('forketta_recipes', []);

  // -- Logic --

  const handleAddIngredient = (ing: Ingredient) => {
    setIngredients((prev) => [...prev, ing]);
  };

  const handleBulkAddIngredients = (newIngredients: Ingredient[]) => {
    setIngredients((prev) => [...prev, ...newIngredients]);
  };

  const handleUpdateIngredient = (updatedIng: Ingredient) => {
    setIngredients(ingredients.map(i => i.id === updatedIng.id ? updatedIng : i));
  };

  const handleDeleteIngredient = (id: string) => {
    // Check if used in recipes
    const isUsed = recipes.some(r => r.ingredients.some(ri => ri.ingredientId === id));
    if (isUsed) {
      alert("Cannot delete ingredient because it is used in a recipe.");
      return;
    }
    setIngredients(ingredients.filter(i => i.id !== id));
  };

  const handleSaveRecipe = (recipe: Recipe) => {
    const exists = recipes.find(r => r.id === recipe.id);
    if (exists) {
      setRecipes(recipes.map(r => r.id === recipe.id ? recipe : r));
    } else {
      setRecipes([...recipes, recipe]);
    }
  };

  const handleDeleteRecipe = (id: string) => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      setRecipes(recipes.filter(r => r.id !== id));
    }
  };

  // Cost Calculation Engine
  const calculateRecipeCost = useCallback((recipe: Recipe): CostBreakdown => {
    let totalIngredientCost = 0;

    recipe.ingredients.forEach(item => {
      const ing = ingredients.find(i => i.id === item.ingredientId);
      if (ing) {
        // Simplified: assuming item.quantity is already in base units (e.g., grams) matching costPerBaseUnit
        // Real-world needs a Unit Conversion Utility here.
        totalIngredientCost += (item.quantity * ing.costPerBaseUnit);
      }
    });

    // Add Overhead %
    const overheadCost = totalIngredientCost * (recipe.overheadPercentage / 100);
    
    // Total Cost
    const totalCost = totalIngredientCost + recipe.laborCost + overheadCost;
    
    // Per Serving
    const costPerServing = recipe.servings > 0 ? totalCost / recipe.servings : 0;

    // Suggested Price based on Target Food Cost %
    // Formula: Price = IngredientCost / (TargetPercentage / 100)
    
    const ingredientCostPerServing = recipe.servings > 0 ? totalIngredientCost / recipe.servings : 0;
    const targetDecimal = recipe.targetFoodCostPercentage / 100;
    const suggestedPrice = targetDecimal > 0 ? ingredientCostPerServing / targetDecimal : 0;

    return {
      totalIngredientCost,
      laborCost: recipe.laborCost,
      overheadCost,
      totalCost,
      costPerServing,
      suggestedPrice
    };
  }, [ingredients]);

  // -- Render --

  // Checkered Tablecloth Pattern (Gingham)
  const checkeredStyle = {
    backgroundColor: 'white',
    backgroundImage: `
      linear-gradient(90deg, rgba(239, 68, 68, 0.4) 50%, transparent 50%),
      linear-gradient(rgba(239, 68, 68, 0.4) 50%, transparent 50%)
    `,
    backgroundSize: '50px 50px',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Navigation */}
      <nav 
        style={checkeredStyle}
        className="w-full md:w-64 flex-shrink-0 md:h-screen sticky top-0 flex flex-col justify-between shadow-xl border-r border-red-200"
      >
        <div className="relative z-10">
          <div className="p-6">
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-red-100 text-center">
              <h1 className="text-2xl font-bold flex flex-col items-center tracking-tight text-slate-800">
                <div className="bg-red-500 text-white p-2 rounded-full mb-2 shadow-sm">
                   <ChefHat size={24} /> 
                </div>
                <span className="text-red-600">Indo</span>
                <span className="text-slate-800">Food Cost</span>
              </h1>
              <p className="text-[10px] font-medium text-slate-500 mt-2 uppercase tracking-wide">
                Simple Restaurant Management APP
              </p>
            </div>
          </div>
          
          <div className="px-3 space-y-2">
            <button 
              onClick={() => setActiveView('dashboard')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all shadow-sm ${
                activeView === 'dashboard' 
                  ? 'bg-red-600 text-white shadow-red-200' 
                  : 'bg-white/90 text-slate-700 hover:bg-white hover:text-red-600'
              }`}
            >
              <LayoutDashboard size={20} className="mr-3" /> 
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveView('ingredients')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all shadow-sm ${
                activeView === 'ingredients' 
                  ? 'bg-red-600 text-white shadow-red-200' 
                  : 'bg-white/90 text-slate-700 hover:bg-white hover:text-red-600'
              }`}
            >
              <ShoppingBasket size={20} className="mr-3" /> 
              <span className="font-medium">Ingredients</span>
            </button>
            <button 
              onClick={() => setActiveView('recipes')}
              className={`w-full flex items-center px-4 py-3 rounded-lg transition-all shadow-sm ${
                activeView === 'recipes' 
                  ? 'bg-red-600 text-white shadow-red-200' 
                  : 'bg-white/90 text-slate-700 hover:bg-white hover:text-red-600'
              }`}
            >
              <ChefHat size={20} className="mr-3" /> 
              <span className="font-medium">Recipes</span>
            </button>
          </div>
        </div>

        <div className="p-4 relative z-10 space-y-3">
           {showInstallBtn && (
             <button 
               onClick={handleInstallClick}
               className="w-full flex items-center justify-center bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-slate-800 transition-colors animate-pulse"
             >
               <Download size={16} className="mr-2" />
               <span className="font-bold text-sm">Install App</span>
             </button>
           )}

           <div className="flex items-center justify-center text-slate-700 text-xs bg-white/80 backdrop-blur rounded-full py-2 shadow-sm border border-red-100">
             <Settings size={14} className="mr-2" />
             <span className="font-medium">v1.1.0</span>
           </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 capitalize flex items-center">
            {activeView === 'dashboard' && <LayoutDashboard className="mr-2 text-red-500" />}
            {activeView === 'ingredients' && <ShoppingBasket className="mr-2 text-red-500" />}
            {(activeView === 'recipes' || activeView === 'recipe-builder') && <ChefHat className="mr-2 text-red-500" />}
            {activeView}
          </h2>
          <div className="text-sm font-medium bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-slate-600">
             {ingredients.length} Ingredients <span className="mx-2 text-slate-300">|</span> {recipes.length} Recipes
          </div>
        </header>

        {activeView === 'dashboard' && (
          <Dashboard recipes={recipes} ingredients={ingredients} getCostBreakdown={calculateRecipeCost} />
        )}

        {activeView === 'ingredients' && (
          <IngredientManager 
            ingredients={ingredients}
            onAddIngredient={handleAddIngredient}
            onBulkAddIngredients={handleBulkAddIngredients}
            onUpdateIngredient={handleUpdateIngredient}
            onDeleteIngredient={handleDeleteIngredient}
          />
        )}

        {(activeView === 'recipes' || activeView === 'recipe-builder') && (
          <RecipeManager 
            recipes={recipes}
            ingredients={ingredients}
            onSaveRecipe={handleSaveRecipe}
            onDeleteRecipe={handleDeleteRecipe}
            getCostBreakdown={calculateRecipeCost}
          />
        )}
      </main>
    </div>
  );
};

export default App;
