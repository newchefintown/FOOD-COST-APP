import React, { useState, useRef } from 'react';
import { Recipe, Ingredient } from '../types';
import { generateMarketingPost } from '../services/gemini';
import { Camera, RefreshCw, Copy, Check, Instagram, Share2 } from 'lucide-react';

interface MarketingGeneratorProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
}

const MarketingGenerator: React.FC<MarketingGeneratorProps> = ({ recipes, ingredients }) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [generatedCaption, setGeneratedCaption] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);

  const handleGenerate = async () => {
    if (!selectedRecipe) return;
    setLoading(true);
    
    // Get ingredient names
    const recipeIngredientNames = selectedRecipe.ingredients
      .map(ri => ingredients.find(i => i.id === ri.ingredientId)?.name)
      .filter(n => n) as string[];

    const caption = await generateMarketingPost(
      selectedRecipe.name, 
      selectedRecipe.description, 
      recipeIngredientNames
    );
    
    setGeneratedCaption(caption || "");
    setLoading(false);
    setCopied(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-120px)] overflow-y-auto">
      {/* Left Side: Controls */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <Share2 className="mr-2 text-pink-500" />
            Social Media Generator
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Select a Dish to Promote</label>
              <select 
                value={selectedRecipeId}
                onChange={(e) => {
                  setSelectedRecipeId(e.target.value);
                  setGeneratedCaption('');
                  setImagePreview(null);
                }}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-slate-50"
              >
                <option value="">-- Choose a Recipe --</option>
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {selectedRecipe && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-sm font-medium text-slate-600 mb-2">Upload Food Photo</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors flex flex-col items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <Camera size={32} className="mb-2" />
                  <span className="text-sm">Click to upload photo</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!selectedRecipe || loading}
              className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all flex justify-center items-center ${
                !selectedRecipe 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin mr-2" /> Generating Magic...
                </>
              ) : (
                <>
                  <Instagram className="mr-2" /> Generate Caption
                </>
              )}
            </button>
          </div>
        </div>

        {generatedCaption && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in slide-in-from-bottom-5">
             <div className="flex justify-between items-center mb-3">
               <h3 className="font-bold text-slate-700">Generated Caption</h3>
               <button 
                 onClick={copyToClipboard}
                 className="text-sm flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
               >
                 {copied ? <Check size={16} className="mr-1" /> : <Copy size={16} className="mr-1" />}
                 {copied ? 'Copied!' : 'Copy Text'}
               </button>
             </div>
             <textarea
               readOnly
               value={generatedCaption}
               className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none resize-none"
             />
           </div>
        )}
      </div>

      {/* Right Side: Phone Preview */}
      <div className="flex justify-center items-start pt-4">
         <div className="w-[320px] bg-white border border-slate-200 shadow-2xl rounded-[30px] overflow-hidden relative">
            {/* Phone Status Bar */}
            <div className="h-6 bg-slate-100 flex justify-between items-center px-4 text-[10px] text-slate-800 font-semibold">
               <span>9:41</span>
               <div className="flex space-x-1">
                 <div className="w-3 h-3 bg-slate-800 rounded-full opacity-20"></div>
                 <div className="w-3 h-3 bg-slate-800 rounded-full opacity-20"></div>
                 <div className="w-3 h-3 bg-slate-800 rounded-full"></div>
               </div>
            </div>

            {/* App Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-100">
               <div className="font-bold text-sm">IndoFood</div>
               <Instagram size={18} />
            </div>

            {/* Post Image */}
            <div className="w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-300 relative">
               {imagePreview ? (
                 <img src={imagePreview} alt="Food" className="w-full h-full object-cover" />
               ) : (
                 <div className="flex flex-col items-center">
                   <Camera size={40} />
                   <span className="text-xs mt-2">Upload a photo</span>
                 </div>
               )}
            </div>

            {/* Actions */}
            <div className="flex justify-between px-3 py-2">
               <div className="flex space-x-3 text-slate-800">
                  <div className="hover:text-pink-500 cursor-pointer">❤️</div>
                  <div className="hover:text-blue-500 cursor-pointer">💬</div>
                  <div className="hover:text-green-500 cursor-pointer">✈️</div>
               </div>
               <div className="hover:text-slate-600 cursor-pointer">🔖</div>
            </div>

            {/* Likes */}
            <div className="px-3 text-xs font-bold text-slate-800 mb-1">
               243 likes
            </div>

            {/* Caption */}
            <div className="px-3 pb-6 text-xs text-slate-800">
               <span className="font-bold mr-1">indofood_official</span>
               {generatedCaption ? (
                 <span className="whitespace-pre-wrap">{generatedCaption}</span>
               ) : (
                 <span className="text-slate-400 italic">Your AI caption will appear here...</span>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default MarketingGenerator;