
import React, { useState, useRef } from 'react';
import { Ingredient, Unit, INGREDIENT_CATEGORIES } from '../types';
import { Plus, Trash2, Edit2, Search, Upload, FileSpreadsheet } from 'lucide-react';
import { read, utils } from 'xlsx';

interface IngredientManagerProps {
  ingredients: Ingredient[];
  onAddIngredient: (ing: Ingredient) => void;
  onBulkAddIngredients: (ings: Ingredient[]) => void;
  onUpdateIngredient: (ing: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
}

const IngredientManager: React.FC<IngredientManagerProps> = ({
  ingredients,
  onAddIngredient,
  onBulkAddIngredients,
  onUpdateIngredient,
  onDeleteIngredient
}) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newIng, setNewIng] = useState<Partial<Ingredient>>({
    name: '',
    category: 'Others',
    purchaseUnit: Unit.KILOGRAM,
    purchaseCost: 0,
    purchaseQuantity: 1,
  });

  const calculateBaseCost = (unit: Unit, cost: number, quantity: number) => {
    let baseFactor = 1;
    if (unit === Unit.KILOGRAM) baseFactor = 1000; // to grams
    if (unit === Unit.LITER) baseFactor = 1000; // to ml
    // grams, ml, pieces stay 1 (approx)
    
    const totalBaseUnits = quantity * baseFactor;
    return totalBaseUnits > 0 ? cost / totalBaseUnits : 0;
  }

  const handleSave = () => {
    if (!newIng.name || newIng.purchaseCost === undefined || !newIng.purchaseQuantity) return;

    const quantity = Number(newIng.purchaseQuantity);
    const cost = Number(newIng.purchaseCost);
    const unit = newIng.purchaseUnit as Unit;
    const costPerBaseUnit = calculateBaseCost(unit, cost, quantity);

    const ingredient: Ingredient = {
      id: isEditing || crypto.randomUUID(),
      name: newIng.name,
      category: newIng.category || 'Others',
      purchaseUnit: unit,
      purchaseCost: cost,
      purchaseQuantity: quantity,
      costPerBaseUnit: costPerBaseUnit
    };

    if (isEditing) {
      onUpdateIngredient(ingredient);
      setIsEditing(null);
    } else {
      onAddIngredient(ingredient);
    }

    setNewIng({
      name: '',
      category: 'Others',
      purchaseUnit: Unit.KILOGRAM,
      purchaseCost: 0,
      purchaseQuantity: 1,
    });
  };

  const startEdit = (ing: Ingredient) => {
    setIsEditing(ing.id);
    setNewIng(ing);
  };

  const parseUnit = (raw: string): Unit => {
    const lower = raw.toLowerCase().trim();
    if (lower === 'kg' || lower === 'kilogram' || lower === 'kgs') return Unit.KILOGRAM;
    if (lower === 'g' || lower === 'gram' || lower === 'gms') return Unit.GRAM;
    if (lower === 'l' || lower === 'liter' || lower === 'litre') return Unit.LITER;
    if (lower === 'ml' || lower === 'milliliter') return Unit.MILLILITER;
    if (lower === 'oz' || lower === 'ounce') return Unit.OUNCE;
    if (lower === 'lb' || lower === 'pound' || lower === 'lbs') return Unit.POUND;
    return Unit.PIECE; // Default
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData: any[] = utils.sheet_to_json(sheet);

      const parsedIngredients: Ingredient[] = [];

      jsonData.forEach((row) => {
        // Flexible column mapping
        const name = row['Name'] || row['name'] || row['Ingredient'] || row['ingredient'] || row['Item'];
        let category = row['Category'] || row['category'] || 'Others';
        
        // Normalize category if matches one of our standard ones
        const matchCat = INGREDIENT_CATEGORIES.find(c => c.toLowerCase() === String(category).toLowerCase());
        if (matchCat) category = matchCat;

        const cost = parseFloat(row['Cost'] || row['cost'] || row['Price'] || row['price'] || '0');
        const qty = parseFloat(row['Quantity'] || row['quantity'] || row['Qty'] || row['qty'] || '1');
        const unitRaw = row['Unit'] || row['unit'] || row['UOM'] || 'kg';

        if (name && cost > 0) {
          const unit = parseUnit(String(unitRaw));
          const costPerBaseUnit = calculateBaseCost(unit, cost, qty);

          parsedIngredients.push({
            id: crypto.randomUUID(),
            name: String(name),
            category: String(category),
            purchaseUnit: unit,
            purchaseCost: cost,
            purchaseQuantity: qty,
            costPerBaseUnit: costPerBaseUnit
          });
        }
      });

      if (parsedIngredients.length > 0) {
        onBulkAddIngredients(parsedIngredients);
        alert(`Successfully imported ${parsedIngredients.length} ingredients.`);
      } else {
        alert("No valid ingredients found in file. Please check column headers (Name, Cost, Quantity, Unit).");
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to parse Excel file.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}</h2>
          
          {!isEditing && (
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="text-sm flex items-center text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {isImporting ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <FileSpreadsheet size={16} className="mr-2 text-emerald-600" />
                )}
                Import Excel
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input
              type="text"
              value={newIng.name}
              onChange={e => setNewIng({ ...newIng, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. Tomato Paste"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <select
              value={newIng.category}
              onChange={e => setNewIng({ ...newIng, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Purchase Unit</label>
            <select
              value={newIng.purchaseUnit}
              onChange={e => setNewIng({ ...newIng, purchaseUnit: e.target.value as Unit })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Qty per Unit</label>
            <input
              type="number"
              value={newIng.purchaseQuantity}
              onChange={e => setNewIng({ ...newIng, purchaseQuantity: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Total Cost (Rp)</label>
            <input
              type="number"
              value={newIng.purchaseCost || ''}
              onChange={e => setNewIng({ ...newIng, purchaseCost: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="15000"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          {isEditing && (
            <button 
              onClick={() => { setIsEditing(null); setNewIng({ name: '', category: 'Others', purchaseUnit: Unit.KILOGRAM, purchaseCost: 0, purchaseQuantity: 1 }); }}
              className="px-4 py-2 text-slate-600 mr-2 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {isEditing ? <Edit2 size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
            {isEditing ? 'Update Ingredient' : 'Add to Inventory'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Inventory ({ingredients.length})</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Purchase Info</th>
                <th className="px-6 py-3">Base Cost (Ref)</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIngredients.map(ing => (
                <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">{ing.name}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                      {ing.category}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    Rp {ing.purchaseCost.toLocaleString('id-ID')} / {ing.purchaseQuantity} {ing.purchaseUnit}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    Rp {(ing.costPerBaseUnit * 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} / 1k{ing.purchaseUnit === Unit.KILOGRAM || ing.purchaseUnit === Unit.GRAM ? 'g' : 'units'}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => startEdit(ing)} className="text-blue-500 hover:text-blue-700 mx-2">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => onDeleteIngredient(ing.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredIngredients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No ingredients found. Add some above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IngredientManager;
