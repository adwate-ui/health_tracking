import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { MetricCard } from '@/components/MetricCard';
import { Pill } from '@/components/Pill';
import { useTheme } from '@/lib/theme';
import { roles } from '@/tokens/roles';
import { brand, brandMeta } from '@/tokens/brand';
import { ramps } from '@/tokens/primitives';

/**
 * /design-system
 *
 * The canonical reference for every component. Required by design system §10.3.
 * Used during development, kept live in production. The Playwright visual
 * regression suite renders this page in light and dark mode and flags drift.
 */
export function DesignSystemPage() {
  const { theme, resolved, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-surface-canvas text-text-primary px-4 py-8 max-w-4xl mx-auto pb-24">
      <header className="flex items-baseline justify-between mb-8">
        <div>
          <p className="text-eyebrow text-text-tertiary uppercase mb-1">{brandMeta.name}</p>
          <h1 className="text-h1">Design system</h1>
          <p className="text-body-sm text-text-secondary mt-1">
            Resolved theme: <span className="tabular text-text-primary">{resolved}</span>
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant={theme === 'light' ? 'primary' : 'ghost'} size="sm" onClick={() => setTheme('light')}>Light</Button>
          <Button variant={theme === 'dark' ? 'primary' : 'ghost'} size="sm" onClick={() => setTheme('dark')}>Dark</Button>
          <Button variant={theme === 'system' ? 'primary' : 'ghost'} size="sm" onClick={() => setTheme('system')}>System</Button>
        </div>
      </header>

      <Section title="01 — Foundations" subtitle="The six rules">
        <ol className="space-y-3 list-decimal list-inside marker:text-text-tertiary marker:text-small">
          <li className="text-body"><strong className="font-medium">Numbers first.</strong> The metric leads.</li>
          <li className="text-body"><strong className="font-medium">One primary action per screen.</strong> Always visually obvious.</li>
          <li className="text-body"><strong className="font-medium">Whitespace is the most important element.</strong> Two-thirds breathing room.</li>
          <li className="text-body"><strong className="font-medium">Treat the user as an adult.</strong> No emoji, no celebrations.</li>
          <li className="text-body"><strong className="font-medium">Dark mode is a peer.</strong> Both modes designed in parallel.</li>
          <li className="text-body"><strong className="font-medium">Accessible by default.</strong> WCAG 2.2 AA baked into tokens.</li>
        </ol>
      </Section>

      <Section title="02 — Color" subtitle="Brand and semantic ramps">
        <div className="space-y-3">
          {Object.entries(ramps).map(([name, ramp]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-small text-text-secondary w-20 capitalize tabular">{name}</span>
              <div className="grid grid-cols-7 gap-1 flex-1">
                {([50, 100, 200, 400, 600, 800, 900] as const).map((stop) => (
                  <div
                    key={stop}
                    className="aspect-square rounded-xs"
                    style={{ backgroundColor: ramp[stop] }}
                    title={`${name}-${stop} • ${ramp[stop]}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-surface-sunken rounded-md">
          <p className="text-body-sm text-text-secondary">
            The primary brand color is <strong className="text-text-primary">{Object.keys(ramps).find(k => ramps[k as keyof typeof ramps] === brand.primary)}</strong>.
            To rebrand, edit a single line in <code className="font-mono text-body-sm">src/tokens/brand.ts</code>.
          </p>
        </div>
      </Section>

      <Section title="03 — Typography" subtitle="Type scale">
        <Card>
          <div className="flex flex-col gap-3 divide-y divide-border-subtle">
            <TypeRow meta="Display / 32 / 500" sample="128.0 kg" className="text-display tabular" />
            <TypeRow meta="H1 / 22 / 500" sample="This week" className="text-h1" />
            <TypeRow meta="H2 / 18 / 500" sample="Daily targets" className="text-h2" />
            <TypeRow meta="H3 / 16 / 500" sample="Tuesday, 12 May" className="text-h3" />
            <TypeRow meta="Body / 14 / 400" sample="You're on track. 0.3 kg above last week." className="text-body" />
            <TypeRow meta="Small / 12 / 400" sample="Updated 6 minutes ago" className="text-small text-text-secondary" />
            <TypeRow meta="Tabular numerals" sample="1,743 / 2,000 kcal" className="text-body tabular font-mono" />
          </div>
        </Card>
      </Section>

      <Section title="04 — Components" subtitle="Buttons">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Log a meal</Button>
            <Button variant="secondary">Add water</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="primary" loading>Saving</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Card>
      </Section>

      <Section title=" " subtitle="Inputs">
        <Card>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <Input label="Display name" placeholder="Adwate" />
            <Input label="Weight (kg)" type="number" placeholder="80.0" />
            <Input label="Email" type="email" required errorMessage="Enter a valid email" />
            <Input label="Age" type="number" disabled />
          </div>
        </Card>
      </Section>

      <Section title=" " subtitle="Status pills">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Pill state="on-track">On track</Pill>
            <Pill state="approaching">Approaching</Pill>
            <Pill state="below">Below target</Pill>
            <Pill state="logged">Logged</Pill>
            <Pill state="neutral">Draft</Pill>
          </div>
        </Card>
      </Section>

      <Section title=" " subtitle="Metric cards">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <MetricCard label="Calories" value="1,743" unit="of 2,000 kcal" progress={{ current: 1743, target: 2000 }} state="on-track" />
          <MetricCard label="Protein" value="105" unit="of 120 g" progress={{ current: 105, target: 120 }} state="approaching" />
          <MetricCard label="Fibre" value="22" unit="of 30 g" progress={{ current: 22, target: 30 }} state="below" />
          <MetricCard label="Steps" value="11,200" unit="of 10,000" progress={{ current: 11200, target: 10000 }} state="on-track" />
        </div>
      </Section>

      <Section title="05 — Role tokens" subtitle="What components import">
        <Card>
          <p className="text-body-sm text-text-secondary mb-3">
            {Object.keys(roles).length} role tokens. Components reference these names; the brand alias layer
            decides which ramp; primitives provide the hex.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.keys(roles).slice(0, 18).map((name) => (
              <code key={name} className="text-small text-text-secondary tabular bg-surface-sunken px-2 py-1 rounded-xs truncate" title={name}>
                {name}
              </code>
            ))}
          </div>
        </Card>
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <header className="mb-4">
        {title.trim() && <p className="text-eyebrow text-text-tertiary uppercase">{title}</p>}
        {subtitle && <h2 className="text-h2 text-text-primary mt-1">{subtitle}</h2>}
      </header>
      {children}
    </section>
  );
}

function TypeRow({ meta, sample, className }: { meta: string; sample: string; className: string }) {
  return (
    <div className="flex items-baseline gap-4 py-2 first:pt-0">
      <span className="text-small text-text-tertiary w-32 font-mono shrink-0">{meta}</span>
      <span className={className}>{sample}</span>
    </div>
  );
}
