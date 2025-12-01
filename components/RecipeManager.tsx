
import React, { useState, useMemo } from 'react';
import { Recipe, Ingredient, Unit, RecipeIngredient, CostBreakdown } from '../types';
import { generateRecipeDraft, analyzeProfitability } from '../services/gemini';
import { Trash2, Plus, ArrowLeft, Save, Sparkles, ChefHat, Info, Mail, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface RecipeManagerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onSaveRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  getCostBreakdown: (recipe: Recipe) => CostBreakdown;
}

const RecipeManager: React.FC<RecipeManagerProps> = ({ 
  recipes, ingredients, onSaveRecipe, onDeleteRecipe, getCostBreakdown 
}) => {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  const emptyRecipe: Recipe = {
    id: '',
    name: 'New Recipe',
    description: '',
    servings: 4,
    ingredients: [],
    laborCost: 0,
    overheadPercentage: 10,
    targetFoodCostPercentage: 30,
  };

  const handleCreateNew = () => {
    setActiveRecipe({ ...emptyRecipe, id: crypto.randomUUID() });
    setView('edit');
    setAiAnalysis('');
  };

  const handleEdit = (recipe: Recipe) => {
    setActiveRecipe({ ...recipe });
    setView('edit');
    setAiAnalysis('');
  };

  const handleGenerateAI = async () => {
    if (!activeRecipe?.name) return;
    setAiLoading(true);
    try {
      const draft = await generateRecipeDraft(activeRecipe.name, ingredients);
      
      // Map suggested ingredients to existing ones or create temp ones
      const newIngredients: RecipeIngredient[] = [];
      
      draft.ingredients?.forEach((suggested: any) => {
        // Try to find exact match
        const match = ingredients.find(i => i.name.toLowerCase() === suggested.name.toLowerCase());
        if (match) {
          // Logic to convert suggested quantity to base unit (simplified here)
           let qty = suggested.quantity;
           if (suggested.unit === 'kg') qty = qty * 1000;
           if (suggested.unit === 'l') qty = qty * 1000;

           newIngredients.push({
             ingredientId: match.id,
             quantity: qty,
             unit: suggested.unit
           });
        } else {
          // In a real app, we'd prompt to create this ingredient.
          // For now, we skip or could add a dummy placeholder.
          console.log("Missing ingredient from AI:", suggested.name);
        }
      });

      setActiveRecipe(prev => {
         if (!prev) return null;
         return {
           ...prev,
           description: draft.description || prev.description,
           instructions: draft.instructions || prev.instructions,
           servings: draft.servings || prev.servings,
           ingredients: newIngredients.length > 0 ? newIngredients : prev.ingredients
         };
      });
    } catch (e) {
      alert("Failed to generate recipe. Check console.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAnalyzeProfit = async () => {
    if (!activeRecipe) return;
    const costs = getCostBreakdown(activeRecipe);
    setAiAnalysisLoading(true);
    const analysis = await analyzeProfitability(activeRecipe.name, costs.costPerServing, costs.suggestedPrice);
    setAiAnalysis(analysis || "No analysis returned.");
    setAiAnalysisLoading(false);
  };

  const addIngredientToRecipe = () => {
    if (!activeRecipe || ingredients.length === 0) return;
    const firstIng = ingredients[0];
    const newItem: RecipeIngredient = {
      ingredientId: firstIng.id,
      quantity: 100,
      unit: Unit.GRAM
    };
    setActiveRecipe({
      ...activeRecipe,
      ingredients: [...activeRecipe.ingredients, newItem]
    });
  };

  const updateRecipeIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    if (!activeRecipe) return;
    const newItems = [...activeRecipe.ingredients];
    newItems[index] = { ...newItems[index], [field]: value };
    setActiveRecipe({ ...activeRecipe, ingredients: newItems });
  };

  const removeRecipeIngredient = (index: number) => {
    if (!activeRecipe) return;
    const newItems = activeRecipe.ingredients.filter((_, i) => i !== index);
    setActiveRecipe({ ...activeRecipe, ingredients: newItems });
  };

  // Helper calculation for the edit view
  const currentCost = useMemo(() => {
    if (!activeRecipe) return null;
    return getCostBreakdown(activeRecipe);
  }, [activeRecipe, getCostBreakdown]);

  const handleSendToOffice = () => {
    if (!activeRecipe || !currentCost) return;

    const ingredientListText = activeRecipe.ingredients.map(ri => {
      const ingData = ingredients.find(i => i.id === ri.ingredientId);
      return `- ${ingData?.name || 'Unknown'}: ${ri.quantity} ${ri.unit}`;
    }).join('\n');

    const emailBody = `
RECIPE SUBMISSION: ${activeRecipe.name.toUpperCase()}
----------------------------------------
Description: ${activeRecipe.description || 'N/A'}
Servings: ${activeRecipe.servings}

INGREDIENTS:
${ingredientListText}

INSTRUCTIONS:
${activeRecipe.instructions || 'No instructions provided.'}

----------------------------------------
COSTING BREAKDOWN (IDR):
Total Ingredient Cost: Rp ${currentCost.totalIngredientCost.toLocaleString('id-ID')}
Labor Cost: Rp ${currentCost.laborCost.toLocaleString('id-ID')}
Overhead (${activeRecipe.overheadPercentage}%): Rp ${currentCost.overheadCost.toLocaleString('id-ID')}

TOTAL RECIPE COST: Rp ${currentCost.totalCost.toLocaleString('id-ID')}
COST PER SERVING: Rp ${currentCost.costPerServing.toLocaleString('id-ID')}

SUGGESTED SELLING PRICE: Rp ${currentCost.suggestedPrice.toLocaleString('id-ID')}
(Based on ${activeRecipe.targetFoodCostPercentage}% Food Cost Target)
    `;

    const subject = `New Recipe: ${activeRecipe.name} - Costing Approval`;
    
    // Create mailto link
    const mailtoLink = `mailto:office@forkettabali.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    
    window.open(mailtoLink, '_blank');
  };

  if (view === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Recipes</h2>
          <button 
            onClick={handleCreateNew}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center"
          >
            <Plus size={18} className="mr-2" /> New Recipe
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => {
            const costs = getCostBreakdown(recipe);
            return (
              <div key={recipe.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer relative group">
                 <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteRecipe(recipe.id); }}
                      className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
                 <div onClick={() => handleEdit(recipe)}>
                   <h3 className="font-bold text-slate-800 text-lg mb-1">{recipe.name}</h3>
                   <p className="text-sm text-slate-500 mb-4 line-clamp-2">{recipe.description || 'No description'}</p>
                   
                   <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs text-slate-400">Cost/Serving</p>
                        <p className="font-semibold text-slate-700">Rp {costs.costPerServing.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Suggested Price</p>
                        <p className="font-bold text-emerald-600 text-lg">Rp {costs.suggestedPrice.toLocaleString('id-ID')}</p>
                      </div>
                   </div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Edit View
  if (!activeRecipe) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
      {/* Left Column: Editor */}
      <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2 pb-20">
        <div className="flex items-center space-x-4 mb-4">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} className="text-slate-600"/>
          </button>
          <h2 className="text-xl font-bold text-slate-800">Recipe Builder</h2>
        </div>

        {/* Basic Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex space-x-4">
             <div className="flex-1">
               <label className="block text-xs font-medium text-slate-500 mb-1">Recipe Name</label>
               <div className="flex space-x-2">
                 <input
                    type="text"
                    value={activeRecipe.name}
                    onChange={e => setActiveRecipe({ ...activeRecipe, name: e.target.value })}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Nasi Goreng Spesial"
                 />
                 <button 
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  className="bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-100 flex items-center text-sm font-medium transition-colors"
                 >
                   {aiLoading ? <span className="animate-spin mr-2">⏳</span> : <Sparkles size={16} className="mr-2" />}
                   Auto-Fill
                 </button>
               </div>
             </div>
             <div className="w-24">
               <label className="block text-xs font-medium text-slate-500 mb-1">Servings</label>
               <input
                  type="number"
                  value={activeRecipe.servings}
                  onChange={e => setActiveRecipe({ ...activeRecipe, servings: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
               />
             </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <textarea
              value={activeRecipe.description}
              onChange={e => setActiveRecipe({ ...activeRecipe, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-20 resize-none"
              placeholder="Delicious homemade fried rice..."
            />
          </div>
        </div>

        {/* Ingredients List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-800">Ingredients</h3>
             <button onClick={addIngredientToRecipe} className="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center">
               <Plus size={16} className="mr-1" /> Add Ingredient
             </button>
           </div>
           
           <div className="space-y-3">
             {activeRecipe.ingredients.map((item, idx) => {
               const ingredientData = ingredients.find(i => i.id === item.ingredientId);
               // Simple rough cost calc for display
               let costDisplay = 0;
               if (ingredientData) {
                  // Assuming item.quantity is in base units for calculation simplicity in this MVP
                  // In a real app, unit conversion logic is complex.
                  // Here we assume item.quantity is grams if base is kg/g.
                  costDisplay = item.quantity * ingredientData.costPerBaseUnit;
               }

               return (
                 <div key={idx} className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg group">
                    <select
                      value={item.ingredientId}
                      onChange={e => updateRecipeIngredient(idx, 'ingredientId', e.target.value)}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-800"
                    >
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center space-x-2 w-48">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateRecipeIngredient(idx, 'quantity', Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-slate-200 rounded text-sm text-right"
                      />
                      <span className="text-xs text-slate-500">{item.unit || 'g'}</span>
                    </div>
                    <div className="w-24 text-right font-mono text-sm text-slate-600">
                      Rp {costDisplay.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </div>
                    <button 
                      onClick={() => removeRecipeIngredient(idx)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
               );
             })}
             {activeRecipe.ingredients.length === 0 && (
               <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                 No ingredients added. Start building!
               </div>
             )}
           </div>
        </div>

         {/* Financial Settings */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h3 className="font-bold text-slate-800 mb-4">Cost Settings</h3>
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Labor Cost (Rp Flat)</label>
                <input
                   type="number"
                   value={activeRecipe.laborCost}
                   onChange={e => setActiveRecipe({ ...activeRecipe, laborCost: Number(e.target.value) })}
                   className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Overhead (%)</label>
                <input
                   type="number"
                   value={activeRecipe.overheadPercentage}
                   onChange={e => setActiveRecipe({ ...activeRecipe, overheadPercentage: Number(e.target.value) })}
                   className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Target Food Cost (%)</label>
                <input
                   type="number"
                   value={activeRecipe.targetFoodCostPercentage}
                   onChange={e => setActiveRecipe({ ...activeRecipe, targetFoodCostPercentage: Number(e.target.value) })}
                   className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
           </div>
         </div>
      </div>

      {/* Right Column: Live Costing & AI Analysis */}
      <div className="lg:col-span-1 space-y-6">
         {/* Cost Card */}
         <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg sticky top-6">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-lg flex items-center">
                 <ChefHat className="mr-2" size={20} /> Costing
               </h3>
               <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                 {activeRecipe.servings} Servings
               </span>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Ingredients</span>
                <span>Rp {currentCost?.totalIngredientCost.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Labor</span>
                <span>Rp {currentCost?.laborCost.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-400">
                <span>Overhead ({activeRecipe.overheadPercentage}%)</span>
                <span>Rp {currentCost?.overheadCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="h-px bg-slate-700 my-2"></div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Cost</span>
                <span>Rp {currentCost?.totalCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg space-y-2 mb-6">
              <div className="flex justify-between items-center">
                 <span className="text-sm text-slate-400">Cost Per Serving</span>
                 <span className="text-xl font-bold">Rp {currentCost?.costPerServing.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-sm text-emerald-400">Suggested Price</span>
                 <span className="text-xl font-bold text-emerald-400">Rp {currentCost?.suggestedPrice.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="text-right text-xs text-slate-500">
                 Target: {activeRecipe.targetFoodCostPercentage}% Food Cost
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => { onSaveRecipe(activeRecipe); setView('list'); }}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors flex justify-center items-center"
              >
                <Save size={18} className="mr-2" /> Save Recipe
              </button>

              <button 
                onClick={handleSendToOffice}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors flex justify-center items-center border border-slate-600"
              >
                <Send size={18} className="mr-2" /> Send to Office
              </button>
            </div>
         </div>

         {/* AI Analysis */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center">
                <Sparkles size={16} className="text-indigo-500 mr-2" /> AI Chef
              </h3>
            </div>
            
            {aiAnalysis ? (
               <div className="text-sm text-slate-600 prose prose-sm">
                 <div className="whitespace-pre-line">{aiAnalysis}</div>
                 <button onClick={() => setAiAnalysis('')} className="text-xs text-slate-400 mt-2 hover:text-slate-600 underline">Clear</button>
               </div>
            ) : (
              <div className="text-center py-6">
                 <p className="text-xs text-slate-400 mb-4">Get insights on pricing and profitability.</p>
                 <button 
                   onClick={handleAnalyzeProfit}
                   disabled={aiAnalysisLoading}
                   className="w-full py-2 border border-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm font-medium"
                 >
                   {aiAnalysisLoading ? 'Analyzing...' : 'Analyze Profitability'}
                 </button>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default RecipeManager;
