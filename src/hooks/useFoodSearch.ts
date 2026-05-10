import { useQuery } from '@tanstack/react-query';

export interface FoodSearchResult {
  id: string;
  source: 'off' | 'usda';
  name: string;
  brand?: string;
  calories_100g?: number;
  protein_100g?: number;
  carbs_100g?: number;
  fat_100g?: number;
  fibre_100g?: number;
}

export function useFoodSearch(query: string) {
  return useQuery({
    queryKey: ['food-search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const results: FoodSearchResult[] = [];

      // Open Food Facts
      try {
        const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
        url.searchParams.set('search_terms', query);
        url.searchParams.set('search_simple', '1');
        url.searchParams.set('action', 'process');
        url.searchParams.set('json', '1');
        url.searchParams.set('page_size', '15');

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          const offResults = (data.products || [])
            .filter((p: any) => p.product_name && p.nutriments)
            .map((p: any) => ({
              id: p.code,
              source: 'off' as const,
              name: p.product_name,
              brand: p.brands,
              calories_100g: p.nutriments['energy-kcal_100g'],
              protein_100g: p.nutriments.proteins_100g,
              carbs_100g: p.nutriments.carbohydrates_100g,
              fat_100g: p.nutriments.fat_100g,
              fibre_100g: p.nutriments.fiber_100g,
            }));
          results.push(...offResults);
        }
      } catch (e) {
        console.error('Open Food Facts API error', e);
      }

      // USDA FoodData Central
      try {
        const usdaKey = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';
        const usdaRes = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${encodeURIComponent(query)}&pageSize=10`);
        if (usdaRes.ok) {
          const usdaData = await usdaRes.json();
          const usdaResults = (usdaData.foods || []).map((f: any) => {
            const getNutrient = (name: string) => f.foodNutrients?.find((n: any) => n.nutrientName.toLowerCase().includes(name.toLowerCase()))?.value;
            return {
              id: String(f.fdcId),
              source: 'usda' as const,
              name: f.description,
              brand: f.brandOwner,
              calories_100g: getNutrient('energy'), // Usually Energy in kcal
              protein_100g: getNutrient('protein'),
              carbs_100g: getNutrient('carbohydrate'),
              fat_100g: getNutrient('total lipid'),
              fibre_100g: getNutrient('fiber'),
            };
          });
          results.push(...usdaResults);
        }
      } catch (e) {
        console.error('USDA API error', e);
      }

      return results;
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
