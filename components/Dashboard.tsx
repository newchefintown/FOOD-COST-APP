
import React, { useMemo } from 'react';
import { Recipe, CostBreakdown, Ingredient } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, TrendingUp, Utensils, AlertCircle } from 'lucide-react';

interface DashboardProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  getCostBreakdown: (recipe: Recipe) => CostBreakdown;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb'];

const Dashboard: React.FC<DashboardProps> = ({ recipes, ingredients, getCostBreakdown }) => {
  const stats = useMemo(() => {
    let totalMenuRecipes = recipes.length;
    let avgFoodCostPercent = 0;
    let warnings = 0;
    let profitableCount = 0;

    recipes.forEach(r => {
      const costs = getCostBreakdown(r);
      
      const margin = costs.actualPrice 
        ? ((costs.actualPrice - costs.totalCost) / costs.actualPrice) * 100 
        : 0;
      
      const fcPercent = costs.actualPrice 
        ? (costs.totalIngredientCost / costs.actualPrice) * 100 
        : (costs.totalIngredientCost / costs.suggestedPrice) * 100;
        
      avgFoodCostPercent += fcPercent;

      if (fcPercent > r.targetFoodCostPercentage) warnings++;
      if (margin > 20) profitableCount++;
    });

    return {
      totalMenuRecipes,
      avgFoodCostPercent: totalMenuRecipes ? (avgFoodCostPercent / totalMenuRecipes).toFixed(1) : '0',
      warnings,
      profitableCount
    };
  }, [recipes, getCostBreakdown]);

  const categoryData = useMemo(() => {
    const categoryMap: Record<string, number> = {};

    recipes.forEach(recipe => {
      recipe.ingredients.forEach(ri => {
        const ingredient = ingredients.find(i => i.id === ri.ingredientId);
        if (ingredient) {
          // Calculate raw cost of this ingredient usage in the recipe
          const cost = ri.quantity * ingredient.costPerBaseUnit;
          const cat = ingredient.category || 'Others';
          categoryMap[cat] = (categoryMap[cat] || 0) + cost;
        }
      });
    });

    const data = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort highest cost first
    
    // Normalize to percentages or keep absolute? Let's keep absolute for the chart but can show % in tooltip
    return data.length > 0 ? data : [{ name: 'No Data', value: 1 }];
  }, [recipes, ingredients]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Recipes</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.totalMenuRecipes}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Utensils size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Avg Food Cost</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-2">{stats.avgFoodCostPercent}%</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">Target is usually ~30%</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Cost Alerts</p>
              <h3 className="text-3xl font-bold text-amber-600 mt-2">{stats.warnings}</h3>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertCircle size={20} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">Items above target cost</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Items</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">{stats.totalMenuRecipes}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Recipe Cost Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">Cost contribution by category across all recipes</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
             <button className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <div className="bg-indigo-100 p-2 rounded-full mr-4 text-indigo-600">
                  <Utensils size={18} />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Create New Recipe</h4>
                  <p className="text-sm text-slate-500">Start from scratch or use AI</p>
                </div>
             </button>
             <button className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <div className="bg-emerald-100 p-2 rounded-full mr-4 text-emerald-600">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Update Ingredient Prices</h4>
                  <p className="text-sm text-slate-500">Adjust specific costs in bulk</p>
                </div>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
