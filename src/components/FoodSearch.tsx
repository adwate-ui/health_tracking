import { useState, useEffect } from 'react';
import { IconSearch, IconX, IconBarcode, IconCheck, IconHistory } from '@tabler/icons-react';
import { useFoodSearch, type FoodSearchResult } from '@/hooks/useFoodSearch';
import { useRecentFoods } from '@/hooks/useDailyLog';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BarcodeScanner } from '@/components/BarcodeScanner';

interface FoodSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (food: FoodSearchResult, grams: number) => void;
}

export function FoodSearch({ isOpen, onClose, onAdd }: FoodSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [grams, setGrams] = useState<string>('100');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  const { data: results, isLoading } = useFoodSearch(debouncedQuery);
  const { data: recentFoods } = useRecentFoods(user?.id);

  if (!isOpen) return null;

  function handleAdd() {
    if (selectedFood) {
      onAdd(selectedFood, Number(grams) || 100);
      setSelectedFood(null);
      setQuery('');
      setDebouncedQuery('');
      setIsScanning(false);
      onClose();
    }
  }

  function handleBarcodeDetected(code: string) {
    setQuery(code);
    setDebouncedQuery(code);
    setIsScanning(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-surface-base/80 backdrop-blur-sm">
      <div className="bg-surface-raised w-full max-w-lg rounded-xl shadow-lg border border-border-subtle flex flex-col max-h-[85vh] h-[85vh] sm:h-auto overflow-hidden relative">
        
        {isScanning ? (
          <BarcodeScanner onDetected={handleBarcodeDetected} onCancel={() => setIsScanning(false)} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <h2 className="text-h3 text-text-primary">Food Search</h2>
              <button onClick={onClose} className="p-1 text-text-tertiary hover:text-text-primary transition-colors">
                <IconX size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 overflow-y-auto">
              {!selectedFood ? (
                <>
                  <Input
                    placeholder="Search foods or scan barcode..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setDebouncedQuery(e.target.value);
                    }}
                    leadingIcon={<IconSearch size={18} />}
                    trailingAffix={
                      <button className="text-action-accent" onClick={() => setIsScanning(true)} title="Scan Barcode">
                        <IconBarcode size={20} />
                      </button>
                    }
                  />
              
              <div className="mt-4 flex flex-col gap-2">
                {query.length < 2 && recentFoods && recentFoods.length > 0 && (
                  <>
                    <h3 className="text-eyebrow text-text-tertiary flex items-center gap-1 uppercase mt-2 mb-1">
                      <IconHistory size={14} /> Recent
                    </h3>
                    {recentFoods.map((food) => {
                      const sf: FoodSearchResult = {
                        id: food.source_id || food.id,
                        source: food.source as any,
                        name: food.name,
                      };
                      if (food.calories != null) sf.calories_100g = (food.calories * 100) / food.grams;
                      if (food.protein_g != null) sf.protein_100g = (food.protein_g * 100) / food.grams;
                      if (food.carbs_g != null) sf.carbs_100g = (food.carbs_g * 100) / food.grams;
                      if (food.fat_g != null) sf.fat_100g = (food.fat_g * 100) / food.grams;
                      if (food.fibre_g != null) sf.fibre_100g = (food.fibre_g * 100) / food.grams;

                      return (
                      <button
                        key={food.id}
                        onClick={() => setSelectedFood(sf)}
                        className="flex flex-col text-left p-3 rounded-md hover:bg-surface-sunken transition-colors border border-transparent hover:border-border-subtle"
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="text-body font-medium text-text-primary line-clamp-1">{food.name}</span>
                          {food.calories && (
                            <span className="text-small text-text-secondary tabular-nums whitespace-nowrap ml-2">
                              {Math.round((food.calories * 100) / food.grams)} kcal/100g
                            </span>
                          )}
                        </div>
                      </button>
                      );
                    })}
                  </>
                )}

                {isLoading && query.length >= 2 && (
                  <p className="text-small text-text-tertiary text-center py-4">Searching...</p>
                )}
                
                {query.length >= 2 && results?.map((food) => (
                  <button
                    key={`${food.source}-${food.id}`}
                    onClick={() => setSelectedFood(food)}
                    className="flex flex-col text-left p-3 rounded-md hover:bg-surface-sunken transition-colors border border-transparent hover:border-border-subtle"
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="text-body font-medium text-text-primary line-clamp-1">{food.name}</span>
                      {food.calories_100g && (
                        <span className="text-small text-text-secondary tabular-nums whitespace-nowrap ml-2">
                          {Math.round(food.calories_100g)} kcal/100g
                        </span>
                      )}
                    </div>
                    {food.brand && <span className="text-small text-text-tertiary line-clamp-1">{food.brand}</span>}
                  </button>
                ))}
                
                {!isLoading && results?.length === 0 && query.length >= 2 && (
                  <p className="text-small text-text-tertiary text-center py-4">No results found.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="text-h2 text-text-primary">{selectedFood.name}</h3>
                {selectedFood.brand && <p className="text-body text-text-secondary">{selectedFood.brand}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Portion size (g)"
                  type="number"
                  inputMode="numeric"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  autoFocus
                />
                <div className="flex flex-col gap-1 justify-end">
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setGrams('100')} size="sm">100g</Button>
                    <Button variant="secondary" onClick={() => setGrams('250')} size="sm">250g</Button>
                  </div>
                </div>
              </div>

              <Card>
                <h4 className="text-eyebrow text-text-tertiary uppercase mb-2">Nutrition for {grams || 0}g</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="flex flex-col">
                    <span className="text-small text-text-secondary">Cals</span>
                    <span className="text-body font-medium tabular-nums text-text-primary">
                      {selectedFood.calories_100g ? Math.round((selectedFood.calories_100g * Number(grams)) / 100) : '-'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-small text-text-secondary">Protein</span>
                    <span className="text-body font-medium tabular-nums text-text-primary">
                      {selectedFood.protein_100g ? Math.round((selectedFood.protein_100g * Number(grams)) / 100) : '-'}g
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-small text-text-secondary">Carbs</span>
                    <span className="text-body font-medium tabular-nums text-text-primary">
                      {selectedFood.carbs_100g ? Math.round((selectedFood.carbs_100g * Number(grams)) / 100) : '-'}g
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-small text-text-secondary">Fat</span>
                    <span className="text-body font-medium tabular-nums text-text-primary">
                      {selectedFood.fat_100g ? Math.round((selectedFood.fat_100g * Number(grams)) / 100) : '-'}g
                    </span>
                  </div>
                </div>
              </Card>

              <div className="flex gap-3 mt-4">
                <Button variant="secondary" onClick={() => setSelectedFood(null)} fullWidth>
                  Back
                </Button>
                <Button variant="primary" onClick={handleAdd} fullWidth leadingIcon={<IconCheck size={18} />}>
                  Add to log
                </Button>
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
