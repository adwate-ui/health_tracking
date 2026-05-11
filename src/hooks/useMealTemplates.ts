import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { FoodSearchResult } from '@/hooks/useFoodSearch';

export type MealTemplateRow = Database['public']['Tables']['meal_templates']['Row'];
export type MealTemplateItemRow = Database['public']['Tables']['meal_template_items']['Row'];
export type MealTemplateItemInsert = Database['public']['Tables']['meal_template_items']['Insert'];

export interface MealTemplateWithItems extends MealTemplateRow {
  items: MealTemplateItemRow[];
  totalCalories: number;
  totalProteinG: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useMealTemplates(userId: string | undefined) {
  return useQuery<MealTemplateWithItems[]>({
    queryKey: ['meal-templates', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data: templates, error: tErr } = await supabase
        .from('meal_templates')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (tErr) throw tErr;
      if (!templates?.length) return [];

      const templateIds = templates.map(t => t.id);

      const { data: items, error: iErr } = await supabase
        .from('meal_template_items')
        .select('*')
        .in('template_id', templateIds);

      if (iErr) throw iErr;

      return templates.map(template => {
        const templateItems = (items ?? []).filter(i => i.template_id === template.id);
        return {
          ...template,
          items: templateItems,
          totalCalories: Math.round(templateItems.reduce((s, i) => s + (i.calories ?? 0), 0)),
          totalProteinG: Math.round(templateItems.reduce((s, i) => s + (i.protein_g ?? 0), 0)),
        };
      });
    },
    enabled: Boolean(userId),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

interface CreateTemplateArgs {
  userId: string;
  name: string;
  items: Omit<MealTemplateItemInsert, 'template_id' | 'user_id'>[];
}

export function useCreateTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, name, items }: CreateTemplateArgs) => {
      // 1. Insert the template header
      const { data: template, error: tErr } = await supabase
        .from('meal_templates')
        .insert({ user_id: userId, name })
        .select()
        .single();

      if (tErr) throw tErr;

      if (items.length > 0) {
        // 2. Insert the items
        const { error: iErr } = await supabase
          .from('meal_template_items')
          .insert(
            items.map(item => ({
              ...item,
              template_id: template.id,
              user_id: userId,
            })),
          );

        if (iErr) throw iErr;
      }

      return template;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['meal-templates', vars.userId] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, userId }: { templateId: string; userId: string }) => {
      // Items cascade-delete via FK
      const { error } = await supabase
        .from('meal_templates')
        .delete()
        .eq('id', templateId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['meal-templates', vars.userId] });
    },
  });
}

// ─── Log a template ───────────────────────────────────────────────────────────
// Accepts the same signature as TodayPage's handleAddFood.
export type LogFoodFn = (food: FoodSearchResult, grams: number) => Promise<void> | void;

export async function logTemplate(template: MealTemplateWithItems, logFood: LogFoodFn) {
  for (const item of template.items) {
    const food: FoodSearchResult = {
      id: item.source_id ?? item.id,
      // meal_template_items.source includes 'manual'; cast to the search result union.
      // 'manual' entries degrade gracefully — they have no source_id lookup.
      source: (item.source === 'manual' ? 'off' : item.source) as 'off' | 'usda',
      name: item.name,
      ...(item.calories != null ? { calories_100g: (item.calories * 100) / item.grams } : {}),
      ...(item.protein_g != null ? { protein_100g: (item.protein_g * 100) / item.grams } : {}),
      ...(item.fibre_g != null ? { fibre_100g: (item.fibre_g * 100) / item.grams } : {}),
      ...(item.fat_g != null ? { fat_100g: (item.fat_g * 100) / item.grams } : {}),
      ...(item.carbs_g != null ? { carbs_100g: (item.carbs_g * 100) / item.grams } : {}),
    };
    await logFood(food, item.grams);
  }
}
