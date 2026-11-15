import * as React from "react";
import { useTranslation } from "react-i18next";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, FileText, GripVertical, Loader2, Plus, Ruler, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/States";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatNumber } from "@/lib/format";
import { moveInList, sumTotals } from "@/lib/calc/estimating";
import { parseAmount } from "@/lib/import/priceResources";
import { UNITS, type UnitCode } from "@/lib/units";
import type { CurrencyCode } from "@/lib/calc/money";
import { currentLanguage } from "@/i18n";
import { EditableCell } from "./EditableCell";
import {
  insertItem,
  insertSection,
  reorderItems,
  reorderSections,
  updateItem,
  updateSection,
  type BoqItemValue,
  type BoqSection,
  type VersionScope,
} from "./api";
import { useEstimateCache } from "./queries";

type Props = {
  scope: VersionScope;
  currency: CurrencyCode;
  readOnly: boolean;
  sections: BoqSection[];
  items: BoqItemValue[];
  onOpenItem: (id: string) => void;
};

export function BoqEditor({ scope, currency, readOnly, sections, items, onOpenItem }: Props) {
  const { t } = useTranslation();
  const cache = useEstimateCache(scope.versionId);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  const [search, setSearch] = React.useState("");
  const [newSection, setNewSection] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [deletingSection, setDeletingSection] = React.useState<BoqSection | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const term = search.trim().toLowerCase();
  const bySection = React.useMemo(() => {
    const map = new Map<string, BoqItemValue[]>();
    for (const s of sections) map.set(s.id, []);
    for (const it of items) {
      if (term && !`${it.code} ${it.description}`.toLowerCase().includes(term)) continue;
      map.get(it.section_id)?.push(it);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
    return map;
  }, [sections, items, term]);

  const dragEnabled = !readOnly && !term;

  async function onSectionDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = sections.map((s) => s.id);
    const next = moveInList(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    try {
      await reorderSections(scope.versionId, next);
      await cache.invalidateSections();
    } catch (err) {
      toast.error(errorMessage(t, err));
    }
  }

  async function addSection() {
    const title = newSection.trim();
    if (!title) return;
    setAdding(true);
    try {
      await insertSection(scope, title, sections.length + 1);
      setNewSection("");
      await cache.invalidateSections();
    } catch (err) {
      toast.error(errorMessage(t, err));
    } finally {
      setAdding(false);
    }
  }

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("estimating.boq.searchItems")}
            aria-label={t("estimating.boq.searchItems")}
            className="ps-8"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(new Set())}>
          <ChevronsUpDown /> {t("estimating.boq.expandAll")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(new Set(sections.map((s) => s.id)))}>
          <ChevronsDownUp /> {t("estimating.boq.collapseAll")}
        </Button>
        {term ? <span className="text-xs text-muted-foreground">{t("estimating.boq.dragDisabledSearch")}</span> : null}
      </div>

      {sections.length === 0 ? (
        <EmptyState title={t("estimating.boq.emptyTitle")} description={readOnly ? undefined : t("estimating.boq.emptyHint")} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onSectionDragEnd(e)}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map((s) => (
              <SectionBlock
                key={s.id}
                section={s}
                items={bySection.get(s.id) ?? []}
                allSectionItems={items.filter((i) => i.section_id === s.id)}
                scope={scope}
                currency={currency}
                readOnly={readOnly}
                dragEnabled={dragEnabled}
                collapsed={collapsed.has(s.id) && !term}
                onToggle={() => toggle(s.id)}
                onOpenItem={onOpenItem}
                onDelete={() => setDeletingSection(s)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {!readOnly ? (
        <form
          className="flex flex-col gap-2 rounded-lg border border-dashed p-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void addSection();
          }}
        >
          <Input
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder={t("estimating.boq.newSectionPlaceholder")}
            aria-label={t("estimating.boq.newSection")}
          />
          <Button type="submit" variant="outline" disabled={!newSection.trim() || adding}>
            {adding ? <Loader2 className="animate-spin" /> : <Plus />} {t("estimating.boq.newSection")}
          </Button>
        </form>
      ) : null}

      <ConfirmDialog
        open={Boolean(deletingSection)}
        onOpenChange={(o) => !o && setDeletingSection(null)}
        destructive
        title={t("estimating.boq.deleteSectionTitle")}
        description={t("estimating.boq.deleteSectionBody", { title: deletingSection?.title ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          if (!deletingSection) return;
          try {
            await updateSection(deletingSection.id, { deleted_at: new Date().toISOString() });
            await Promise.all([cache.invalidateSections(), cache.invalidateItems(), cache.invalidateTotals()]);
          } catch (err) {
            toast.error(errorMessage(t, err));
          }
        }}
      />
    </div>
  );
}

function SectionBlock({
  section,
  items,
  allSectionItems,
  scope,
  currency,
  readOnly,
  dragEnabled,
  collapsed,
  onToggle,
  onOpenItem,
  onDelete,
}: {
  section: BoqSection;
  items: BoqItemValue[];
  allSectionItems: BoqItemValue[];
  scope: VersionScope;
  currency: CurrencyCode;
  readOnly: boolean;
  dragEnabled: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onOpenItem: (id: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const cache = useEstimateCache(scope.versionId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id, disabled: !dragEnabled });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const total = sumTotals(
    allSectionItems.map((i) => i.total_price),
    currency,
  );

  async function saveSection(patch: { code?: string; title?: string }) {
    try {
      await updateSection(section.id, patch);
      await cache.invalidateSections();
    } catch (err) {
      toast.error(errorMessage(t, err));
    }
  }

  async function onItemDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = items.map((i) => i.id);
    const next = moveInList(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    cache.patchItems((rows) => rows.map((r) => (r.section_id === section.id ? { ...r, position: next.indexOf(r.id) + 1 } : r)));
    try {
      await reorderItems(section.id, next);
    } catch (err) {
      toast.error(errorMessage(t, err));
      await cache.invalidateItems();
    }
  }

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-lg border bg-card shadow-sm", isDragging && "z-10 opacity-80 shadow-lg")}
      aria-label={section.title}
    >
      <header className="flex items-center gap-1 border-b bg-muted/50 px-2 py-1.5">
        {dragEnabled ? (
          <button
            type="button"
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={t("estimating.boq.dragSection")}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("estimating.boq.expand") : t("estimating.boq.collapse")}
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90 rtl:rotate-90")} />
        </button>
        <div className="w-16 shrink-0 font-mono text-xs">
          <EditableCell
            value={section.code}
            label={t("common.code")}
            readOnly={readOnly}
            onCommit={(v) => saveSection({ code: String(v ?? "") })}
            className="ltr-nums"
          />
        </div>
        <div className="min-w-0 flex-1 font-semibold">
          <EditableCell
            value={section.title}
            label={t("estimating.boq.sectionTitle")}
            readOnly={readOnly}
            allowEmpty={false}
            onCommit={(v) => saveSection({ title: String(v) })}
          />
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t("estimating.boq.itemCount", { count: allSectionItems.length })}
        </span>
        <span className="min-w-28 text-end font-semibold num">{formatMoney(total, currency, lang)}</span>
        {!readOnly ? (
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t("estimating.boq.deleteSection")}>
            <Trash2 />
          </Button>
        ) : null}
      </header>
      {collapsed ? null : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="w-8" aria-hidden />
                <th className="w-20 px-1 py-1.5 text-start font-semibold">{t("common.code")}</th>
                <th className="px-1 py-1.5 text-start font-semibold">{t("estimating.designation")}</th>
                <th className="w-24 px-1 py-1.5 text-start font-semibold">{t("estimating.unit")}</th>
                <th className="w-28 px-1 py-1.5 text-end font-semibold">{t("estimating.quantity")}</th>
                <th className="w-32 px-1 py-1.5 text-end font-semibold">{t("estimating.dryUnitCost")}</th>
                <th className="w-32 px-1 py-1.5 text-end font-semibold">{t("estimating.unitPrice")}</th>
                <th className="w-36 px-1 py-1.5 text-end font-semibold">{t("estimating.total")}</th>
                <th className="w-20" aria-hidden />
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void onItemDragEnd(e)}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {items.map((it) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      scope={scope}
                      currency={currency}
                      readOnly={readOnly}
                      dragEnabled={dragEnabled}
                      onOpen={() => onOpenItem(it.id)}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
          {!readOnly ? <QuickAddRow scope={scope} sectionId={section.id} nextPosition={allSectionItems.length + 1} /> : null}
        </div>
      )}
    </section>
  );
}

function ItemRow({
  item,
  scope,
  currency,
  readOnly,
  dragEnabled,
  onOpen,
}: {
  item: BoqItemValue;
  scope: VersionScope;
  currency: CurrencyCode;
  readOnly: boolean;
  dragEnabled: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const cache = useEstimateCache(scope.versionId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !dragEnabled });

  async function save(patch: Parameters<typeof updateItem>[1]) {
    try {
      await updateItem(item.id, patch);
      await cache.refreshItem(item.id);
    } catch (err) {
      toast.error(errorMessage(t, err));
    }
  }

  async function remove() {
    try {
      await updateItem(item.id, { deleted_at: new Date().toISOString() });
      await cache.refreshItem(item.id);
      toast(t("estimating.boq.itemDeleted"), {
        action: {
          label: t("common.restore"),
          onClick: () => void updateItem(item.id, { deleted_at: null }).then(() => cache.refreshItem(item.id)),
        },
      });
    } catch (err) {
      toast.error(errorMessage(t, err));
    }
  }

  const money = (v: number | null) => (v === null ? <span className="text-muted-foreground">—</span> : formatMoney(v, currency, lang));

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("border-b align-top last:border-0 hover:bg-muted/30", isDragging && "relative z-10 bg-card shadow")}
    >
      <td className="py-1 ps-1">
        {dragEnabled ? (
          <button
            type="button"
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={t("estimating.boq.dragItem")}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
      </td>
      <td className="px-1 py-1 font-mono text-xs">
        <EditableCell
          value={item.code}
          label={t("common.code")}
          readOnly={readOnly}
          onCommit={(v) => save({ code: String(v ?? "") })}
          className="ltr-nums"
        />
      </td>
      <td className="px-1 py-1">
        <EditableCell
          value={item.description}
          label={t("estimating.designation")}
          readOnly={readOnly}
          multiline
          allowEmpty={false}
          onCommit={(v) => save({ description: String(v) })}
          className="whitespace-pre-line"
        />
      </td>
      <td className="px-1 py-1">
        {readOnly ? (
          <span className="block px-1.5 py-1">{t(`units.${item.unit}`)}</span>
        ) : (
          <NativeSelect
            value={item.unit}
            onChange={(e) => void save({ unit: e.target.value as UnitCode })}
            aria-label={t("estimating.unit")}
            className="h-8 border-transparent bg-transparent shadow-none hover:border-input"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`units.${u}`)}
              </option>
            ))}
          </NativeSelect>
        )}
      </td>
      <td className="px-1 py-1">
        {item.quantity_source === "takeoff" ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center justify-end gap-1 rounded px-1.5 py-1 hover:bg-muted num"
            title={t("estimating.boq.fromTakeoff")}
            aria-label={t("estimating.boq.openTakeoff")}
          >
            <Ruler className="size-3.5 text-accent" aria-hidden />
            {formatNumber(item.effective_quantity, lang, 3)}
          </button>
        ) : (
          <EditableCell
            type="number"
            value={item.quantity}
            display={formatNumber(item.quantity, lang, 3)}
            label={t("estimating.quantity")}
            readOnly={readOnly}
            allowEmpty={false}
            onCommit={(v) => save({ quantity: Number(v ?? 0) })}
          />
        )}
      </td>
      <td className="px-1 py-1">
        {item.upa_id ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex w-full flex-col items-end rounded px-1.5 py-1 hover:bg-muted"
            title={t("estimating.boq.fromAnalysis")}
          >
            <Badge variant="accent" className="font-mono">
              {item.upa_code}
            </Badge>
            <span className="num">{money(item.dry_unit_cost)}</span>
          </button>
        ) : (
          <EditableCell
            type="number"
            value={item.unit_cost}
            display={money(item.unit_cost)}
            label={t("estimating.dryUnitCost")}
            readOnly={readOnly}
            onCommit={(v) => save({ unit_cost: v === null ? null : Number(v) })}
          />
        )}
      </td>
      <td className="px-1 py-1 text-end num">
        <span className="inline-flex items-center gap-1 px-1.5 py-1">
          {item.unit_price !== null ? (
            <span
              className="size-1.5 rounded-full bg-accent"
              title={t("estimating.boq.priceOverridden")}
              aria-label={t("estimating.boq.priceOverridden")}
            />
          ) : null}
          {money(item.effective_unit_price)}
        </span>
      </td>
      <td className="px-1 py-1 text-end font-medium num">
        <span className="block px-1.5 py-1">{money(item.total_price)}</span>
      </td>
      <td className="py-1 pe-1 text-end">
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" className="size-8" onClick={onOpen} aria-label={t("estimating.boq.itemDetails")}>
            <FileText />
          </Button>
          {!readOnly ? (
            <Button variant="ghost" size="icon" className="size-8" onClick={() => void remove()} aria-label={t("common.delete")}>
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function QuickAddRow({ scope, sectionId, nextPosition }: { scope: VersionScope; sectionId: string; nextPosition: number }) {
  const { t } = useTranslation();
  const cache = useEstimateCache(scope.versionId);
  const [description, setDescription] = React.useState("");
  const [unit, setUnit] = React.useState<UnitCode>("m3");
  const [quantity, setQuantity] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const descRef = React.useRef<HTMLInputElement>(null);

  async function add() {
    if (!description.trim()) return;
    const q = quantity.trim() ? parseAmount(quantity) : 0;
    const c = cost.trim() ? parseAmount(cost) : null;
    if (q === null || q < 0 || (cost.trim() && (c === null || c < 0))) {
      toast.error(t("validation.number"));
      return;
    }
    setBusy(true);
    try {
      const id = await insertItem({
        company_id: scope.companyId,
        project_id: scope.projectId,
        version_id: scope.versionId,
        section_id: sectionId,
        position: nextPosition,
        description: description.trim(),
        unit,
        quantity: q,
        unit_cost: c,
      });
      await cache.refreshItem(id);
      setDescription("");
      setQuantity("");
      setCost("");
      descRef.current?.focus();
    } catch (err) {
      toast.error(errorMessage(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2 border-t bg-muted/20 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
    >
      <Input
        ref={descRef}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("estimating.boq.newItemPlaceholder")}
        aria-label={t("estimating.designation")}
        className="h-8 min-w-48 flex-1"
      />
      <NativeSelect
        value={unit}
        onChange={(e) => setUnit(e.target.value as UnitCode)}
        aria-label={t("estimating.unit")}
        className="h-8 w-28"
      >
        {UNITS.map((u) => (
          <option key={u} value={u}>
            {t(`units.${u}`)}
          </option>
        ))}
      </NativeSelect>
      <Input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        inputMode="decimal"
        placeholder={t("estimating.quantity")}
        aria-label={t("estimating.quantity")}
        className="h-8 w-28 text-end ltr-nums"
      />
      <Input
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        inputMode="decimal"
        placeholder={t("estimating.dryUnitCost")}
        aria-label={t("estimating.dryUnitCost")}
        className="h-8 w-32 text-end ltr-nums"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={!description.trim() || busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Plus />} {t("estimating.boq.addItem")}
      </Button>
    </form>
  );
}
