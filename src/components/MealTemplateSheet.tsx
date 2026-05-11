import { useState } from 'react';
import { IconX, IconBookmark, IconTrash, IconCheck, IconPlus } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import {
  useMealTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  logTemplate,
  type MealTemplateWithItems,
  type LogFoodFn,
} from '@/hooks/useMealTemplates';
import type { FoodEntryRow } from '@/hooks/useDailyLog';

interface MealTemplateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Today's food entries — used for the "save as template" flow */
  todayEntries: FoodEntryRow[];
  /** Passes through to the existing handleAddFood in TodayPage */
  onLogFood: LogFoodFn;
}

type SheetMode = 'browse' | 'create';

export function MealTemplateSheet({ isOpen, onClose, todayEntries, onLogFood }: MealTemplateSheetProps) {
  const { user } = useAuth();
  const { data: templates, isLoading } = useMealTemplates(user?.id);
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [mode, setMode] = useState<SheetMode>('browse');
  const [templateName, setTemplateName] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  // ─── Browse mode handlers ────────────────────────────────────────
  async function handleLogTemplate(template: MealTemplateWithItems) {
    setLoggingId(template.id);
    try {
      await logTemplate(template, onLogFood);
      onClose();
    } catch (e) {
      console.error('Failed to log template', e);
      alert('Failed to log template.');
    } finally {
      setLoggingId(null);
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    try {
      await deleteTemplate.mutateAsync({ templateId, userId: user!.id });
      setConfirmDeleteId(null);
    } catch (e) {
      console.error('Failed to delete template', e);
    }
  }

  // ─── Create mode handlers ────────────────────────────────────────
  function toggleEntry(id: string) {
    setSelectedEntryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveTemplate() {
    if (!templateName.trim()) {
      alert('Give the template a name.');
      return;
    }
    const selected = todayEntries.filter(e => selectedEntryIds.has(e.id));
    if (!selected.length) {
      alert('Select at least one food item.');
      return;
    }

    try {
      await createTemplate.mutateAsync({
        userId: user!.id,
        name: templateName.trim(),
        items: selected.map(e => ({
          source: e.source,
          source_id: e.source_id,
          name: e.name,
          grams: e.grams,
          calories: e.calories,
          protein_g: e.protein_g,
          fibre_g: e.fibre_g,
          fat_g: e.fat_g,
          carbs_g: e.carbs_g,
        })),
      });
      setMode('browse');
      setTemplateName('');
      setSelectedEntryIds(new Set());
    } catch (e) {
      console.error('Failed to save template', e);
      alert('Failed to save template.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-surface-base/80 backdrop-blur-sm">
      <div className="bg-surface-raised w-full max-w-lg rounded-xl shadow-lg border border-border-subtle flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2">
            <IconBookmark size={18} className="text-text-tertiary" />
            <h2 className="text-h3 text-text-primary">
              {mode === 'browse' ? 'Meal templates' : 'Save as template'}
            </h2>
          </div>
          <button
            onClick={() => { setMode('browse'); onClose(); }}
            className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

          {/* ─── Browse mode ─────────────────────────── */}
          {mode === 'browse' && (
            <>
              {isLoading && <p className="text-small text-text-tertiary">Loading templates...</p>}

              {!isLoading && templates?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <p className="text-text-tertiary text-small text-center">
                    No templates yet. Log some foods today and save them as a template.
                  </p>
                </div>
              )}

              {templates?.map(template => (
                <Card key={template.id} className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-body font-medium text-text-primary">{template.name}</p>
                      <p className="text-small text-text-secondary tabular-nums">
                        {template.totalCalories.toLocaleString()}&nbsp;kcal
                        {template.totalProteinG > 0 && ` · ${template.totalProteinG}g protein`}
                        {` · ${template.items.length} item${template.items.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {confirmDeleteId === template.id ? (
                        <>
                          <button
                            className="text-small text-action-danger hover:underline"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            Confirm delete
                          </button>
                          <button
                            className="text-small text-text-tertiary hover:underline"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-text-tertiary hover:text-action-danger transition-colors p-1"
                          onClick={() => setConfirmDeleteId(template.id)}
                          title="Delete template"
                        >
                          <IconTrash size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    loading={loggingId === template.id}
                    leadingIcon={<IconCheck size={16} />}
                    onClick={() => handleLogTemplate(template)}
                  >
                    Log this meal
                  </Button>
                </Card>
              ))}
            </>
          )}

          {/* ─── Create mode ─────────────────────────── */}
          {mode === 'create' && (
            <>
              <Input
                label="Template name"
                placeholder="My usual breakfast"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                autoFocus
              />

              <p className="text-eyebrow text-text-tertiary uppercase mt-2">Select items from today</p>

              {todayEntries.length === 0 && (
                <p className="text-small text-text-tertiary">
                  No food entries logged today. Log some foods first.
                </p>
              )}

              {todayEntries.map(entry => {
                const checked = selectedEntryIds.has(entry.id);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => toggleEntry(entry.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      checked
                        ? 'border-forest-500 bg-forest-500/10'
                        : 'border-border-subtle bg-surface-base hover:border-border-strong'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                      checked ? 'bg-forest-500 border-forest-500' : 'border-border-strong'
                    }`}>
                      {checked && <IconCheck size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-text-primary line-clamp-1">{entry.name}</p>
                      <p className="text-small text-text-secondary tabular-nums">
                        {entry.grams}g
                        {entry.calories != null && ` · ${Math.round(entry.calories)} kcal`}
                        {entry.protein_g != null && ` · ${Math.round(entry.protein_g)}g protein`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle shrink-0 flex gap-3">
          {mode === 'browse' ? (
            <>
              {todayEntries.length > 0 && (
                <Button
                  variant="secondary"
                  fullWidth
                  leadingIcon={<IconPlus size={16} />}
                  onClick={() => setMode('create')}
                >
                  Save today as template
                </Button>
              )}
              <Button variant="secondary" fullWidth onClick={onClose}>Close</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setMode('browse')}>Back</Button>
              <Button
                variant="primary"
                fullWidth
                loading={createTemplate.isPending}
                onClick={handleSaveTemplate}
              >
                Save template
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
