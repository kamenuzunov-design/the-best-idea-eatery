import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';

const ManageIngredients = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [ingredients, setIngredients] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState(null);
  
  // Identity
  const [nameBg, setNameBg] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  
  // Classification
  const [mainGroup, setMainGroup] = useState('');
  const [subGroup, setSubGroup] = useState('');
  const [cuisineOrigin, setCuisineOrigin] = useState('');
  
  // Nutrition
  const [calories, setCalories] = useState('');
  const [proteins, setProteins] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  
  // Meta
  const [allergensStr, setAllergensStr] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [shelfLife, setShelfLife] = useState('');
  
  // Pricing
  const [pricePer100, setPricePer100] = useState('');
  
  // Units Mapping
  const [unitsMapping, setUnitsMapping] = useState([]); // [{unit_id, weight_grams}]

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const qIngredients = query(collection(db, 'ingredients'));
    const unsubIngredients = onSnapshot(qIngredients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIngredients(data);
      setLoading(false);
    });

    const qMeasurements = query(collection(db, 'measurements'));
    const unsubMeasurements = onSnapshot(qMeasurements, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMeasurements(data);
    });

    return () => {
      unsubIngredients();
      unsubMeasurements();
    };
  }, []);

  const handleNameEnChange = (e) => {
    const val = e.target.value;
    setNameEn(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  const handleAddUnitMapping = () => {
    setUnitsMapping([...unitsMapping, { unit_id: '', weight_grams: '' }]);
  };

  const handleRemoveUnitMapping = (index) => {
    setUnitsMapping(unitsMapping.filter((_, i) => i !== index));
  };

  const handleUnitMappingChange = (index, field, value) => {
    const newMapping = [...unitsMapping];
    newMapping[index][field] = field === 'weight_grams' ? parseFloat(value) || '' : value;
    setUnitsMapping(newMapping);
  };

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (!nameBg || !nameEn || !slug) return;

    try {
      const ingredientData = {
        name_bg: nameBg,
        name_en: nameEn,
        slug: slug,
        classification: {
          main_group: mainGroup,
          sub_group: subGroup,
          cuisine_origin: cuisineOrigin
        },
        nutrition_per_100: {
          calories: parseFloat(calories) || 0,
          proteins: parseFloat(proteins) || 0,
          carbs: parseFloat(carbs) || 0,
          fats: parseFloat(fats) || 0
        },
        units_mapping: unitsMapping.filter(u => u.unit_id && u.weight_grams),
        meta: {
          allergens: allergensStr ? allergensStr.split(',').map(s => s.trim()).filter(Boolean) : [],
          tags: tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
          average_shelf_life_days: parseInt(shelfLife) || 0
        },
        price_per_100: parseFloat(pricePer100) || 0,
        currency: 'EUR',
        is_active: true,
        is_deleted: false,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'ingredients', editingId), ingredientData);
        await logActivity(user.uid, user.email, 'edit_ingredient', `Edited ingredient: ${nameEn}`);
      } else {
        ingredientData.createdAt = new Date().toISOString();
        await setDoc(doc(db, 'ingredients', slug), ingredientData);
        await logActivity(user.uid, user.email, 'add_ingredient', `Added ingredient: ${nameEn}`);
      }
      
      handleCancelEdit();
    } catch (error) {
      console.error("Error saving ingredient:", error);
      alert(isBg ? 'Грешка при запазване.' : 'Error saving.');
    }
  };

  const handleEditClick = (ing) => {
    setEditingId(ing.id);
    setNameBg(ing.name_bg || '');
    setNameEn(ing.name_en || '');
    setSlug(ing.slug || ing.id);
    setMainGroup(ing.classification?.main_group || '');
    setSubGroup(ing.classification?.sub_group || '');
    setCuisineOrigin(ing.classification?.cuisine_origin || '');
    setCalories(ing.nutrition_per_100?.calories ?? '');
    setProteins(ing.nutrition_per_100?.proteins ?? '');
    setCarbs(ing.nutrition_per_100?.carbs ?? '');
    setFats(ing.nutrition_per_100?.fats ?? '');
    setAllergensStr(ing.meta?.allergens?.join(', ') || '');
    setTagsStr(ing.meta?.tags?.join(', ') || '');
    setShelfLife(ing.meta?.average_shelf_life_days ?? '');
    setPricePer100(ing.price_per_100 ?? '');
    setUnitsMapping(ing.units_mapping || []);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNameBg('');
    setNameEn('');
    setSlug('');
    setMainGroup('');
    setSubGroup('');
    setCuisineOrigin('');
    setCalories('');
    setProteins('');
    setCarbs('');
    setFats('');
    setAllergensStr('');
    setTagsStr('');
    setShelfLife('');
    setPricePer100('');
    setUnitsMapping([]);
  };

  const handleDelete = async (id, ingName) => {
    if (!window.confirm(isBg ? 'Сигурни ли сте, че искате да изтриете този продукт?' : 'Are you sure you want to delete this ingredient?')) return;
    
    try {
      await deleteDoc(doc(db, 'ingredients', id));
      await logActivity(user.uid, user.email, 'delete_ingredient', `Deleted ingredient: ${ingName}`);
    } catch (error) {
      console.error("Error deleting ingredient:", error);
    }
  };

  const filteredIngredients = ingredients.filter(ing => 
    (ing.name_bg?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (ing.name_en?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Продукти / Съставки' : 'Ingredients'}</h1>
          <p className="text-xs font-medium text-primary/70">{ingredients.length} {isBg ? 'въведени' : 'items'}</p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        {/* Form */}
        <form onSubmit={handleSaveIngredient} className={`backdrop-blur-md border rounded-2xl p-4 shadow-lg mb-6 space-y-4 transition-colors ${editingId ? 'bg-blue-500/10 border-blue-500/40' : 'bg-surface-dark/80 border-primary/20'}`}>
          <div className="flex justify-between items-center border-b border-primary/10 pb-2">
            <h3 className="font-bold text-slate-100 text-sm uppercase tracking-widest">
              {editingId 
                ? (isBg ? 'Редактиране на продукт' : 'Edit Ingredient') 
                : (isBg ? 'Нов продукт' : 'New Ingredient')}
            </h3>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-200 uppercase font-bold">
                {isBg ? 'Отказ' : 'Cancel'}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Име (EN) *' : 'Name (EN) *'}</label>
              <input value={nameEn} onChange={handleNameEnChange} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="Tomato" />
            </div>
            <div>
              <label className="text-xs text-slate-400">{isBg ? 'Име (BG) *' : 'Name (BG) *'}</label>
              <input value={nameBg} onChange={(e) => setNameBg(e.target.value)} required className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm" placeholder="Домат" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400">{isBg ? 'Slug (ID) *' : 'Slug (ID) *'}</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!!editingId} className="w-full bg-background-dark border border-primary/20 rounded p-2 text-slate-100 text-sm opacity-70" placeholder="tomato" />
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Основна Група' : 'Main Group'}</label>
              <input value={mainGroup} onChange={(e) => setMainGroup(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="Зеленчуци" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Подгрупа' : 'Sub Group'}</label>
              <input value={subGroup} onChange={(e) => setSubGroup(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="Кореноплодни" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Кухня (Произход)' : 'Cuisine'}</label>
              <input value={cuisineOrigin} onChange={(e) => setCuisineOrigin(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="Световна" />
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2">
            <h4 className="text-xs font-bold text-slate-300 mb-2">{isBg ? 'Хранителни стойности (на 100g/ml)' : 'Nutrition (per 100g/ml)'}</h4>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Calories (kcal)</label>
                <input type="number" step="0.1" value={calories} onChange={(e) => setCalories(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-amber-500 text-sm font-medium" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Proteins (g)</label>
                <input type="number" step="0.1" value={proteins} onChange={(e) => setProteins(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-emerald-500 text-sm font-medium" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Carbs (g)</label>
                <input type="number" step="0.1" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-blue-400 text-sm font-medium" placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Fats (g)</label>
                <input type="number" step="0.1" value={fats} onChange={(e) => setFats(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-rose-500 text-sm font-medium" placeholder="0" />
              </div>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-300">{isBg ? 'Мерни единици (Unit Mappings)' : 'Units Mappings'}</h4>
              <button type="button" onClick={handleAddUnitMapping} className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors">
                + {isBg ? 'Добави мярка' : 'Add Unit'}
              </button>
            </div>
            {unitsMapping.length === 0 && <p className="text-[10px] text-slate-500 italic">{isBg ? 'Няма въведени мерки' : 'No units mapped'}</p>}
            <div className="space-y-2">
              {unitsMapping.map((mapping, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select 
                    value={mapping.unit_id} 
                    onChange={(e) => handleUnitMappingChange(idx, 'unit_id', e.target.value)}
                    className="flex-1 bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm"
                  >
                    <option value="">-- {isBg ? 'Избери мярка' : 'Select unit'} --</option>
                    {measurements.map(m => (
                      <option key={m.unit_id || m.id} value={m.unit_id || m.id}>
                        {isBg ? (m.name_bg || m.name) : (m.name_en || m.name)} ({m.category || m.type})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">=</span>
                    <input 
                      type="number" step="0.1" 
                      value={mapping.weight_grams} 
                      onChange={(e) => handleUnitMappingChange(idx, 'weight_grams', e.target.value)}
                      className="w-20 bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" 
                      placeholder="Grams" 
                    />
                    <span className="text-xs text-slate-400">g/ml</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveUnitMapping(idx)} className="p-1 text-slate-500 hover:text-rose-500 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-primary/10 pt-2 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Тагове (запетая)' : 'Tags (comma separated)'}</label>
              <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="веган, кето, суперхрана" />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Алергени (запетая)' : 'Allergens (comma separated)'}</label>
              <input value={allergensStr} onChange={(e) => setAllergensStr(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="gluten, dairy, nuts" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Срок годност' : 'Shelf Life (days)'}</label>
                <input type="number" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="Days" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">{isBg ? 'Цена/100g (€)' : 'Price/100g (€)'}</label>
                <input type="number" step="0.01" value={pricePer100} onChange={(e) => setPricePer100(e.target.value)} className="w-full bg-background-dark border border-primary/20 rounded p-1.5 text-slate-100 text-sm" placeholder="0.00" />
              </div>
            </div>
          </div>
          
          <button type="submit" className={`w-full font-bold py-2 rounded-lg transition-colors border mt-2 flex justify-center items-center gap-2 ${editingId ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30' : 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/30'}`}>
            <span className="material-symbols-outlined text-[20px]">{editingId ? 'save' : 'add'}</span>
            {editingId ? (isBg ? 'Запази промените' : 'Save Changes') : (isBg ? 'Добави продукт' : 'Add Ingredient')}
          </button>
        </form>

        {/* Search */}
        <div className="mb-4 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isBg ? 'Търси продукт по име...' : 'Search ingredient...'}
            className="w-full bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-xl py-3 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center p-10 text-primary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
            </div>
          ) : (
            filteredIngredients.map(ing => (
              <div key={ing.id} className="bg-surface-dark/50 border border-primary/10 rounded-xl p-3 flex justify-between items-center group hover:border-primary/30 transition-colors">
                <div className="flex gap-3 items-center w-full overflow-hidden pr-2">
                  <div className="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">kitchen</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-100 truncate">
                      {isBg ? ing.name_bg : ing.name_en}
                      <span className="text-primary/70 font-normal text-xs ml-2">({isBg ? ing.name_en : ing.name_bg})</span>
                    </h4>
                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-400 mt-1 items-center">
                      <span className="bg-background-dark px-1.5 py-0.5 rounded border border-primary/10 truncate max-w-[100px]">
                        {ing.classification?.main_group}
                      </span>
                      <span className="text-amber-500 ml-1">{ing.nutrition_per_100?.calories || 0} kcal</span>
                      <span className="text-slate-500 ml-1 truncate max-w-[150px]">
                        {ing.units_mapping?.map(u => u.unit_id).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEditClick(ing)} className="p-2 text-slate-400 hover:text-blue-400 transition-colors bg-background-dark/50 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(ing.id, ing.name_en)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors bg-background-dark/50 rounded-lg">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
          {!loading && filteredIngredients.length === 0 && (
             <div className="text-center p-8 text-slate-500">
               <span className="material-symbols-outlined text-4xl opacity-50 mb-2">search_off</span>
               <p>{isBg ? 'Няма намерени продукти' : 'No ingredients found'}</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageIngredients;
