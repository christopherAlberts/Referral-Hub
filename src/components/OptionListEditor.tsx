"use client";

export function OptionListEditor({
  label,
  description,
  items,
  draft,
  onDraftChange,
  onChangeItem,
  onAdd,
  onRemove,
}: {
  label: string;
  description?: string;
  items: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onChangeItem: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-white/55 p-4">
      <div>
        <h3 className="font-semibold text-[var(--ink)]">{label}</h3>
        {description && <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>}
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <div className="field flex-1">
              <input
                aria-label={`${label} ${index + 1}`}
                value={item}
                onChange={(e) => onChangeItem(index, e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary !px-3"
              disabled={items.length <= 1}
              onClick={() => onRemove(index)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="field flex-1">
          <label>Add an option</label>
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAdd();
              }
            }}
          />
        </div>
        <button type="button" className="btn mt-6" onClick={onAdd}>
          Add
        </button>
      </div>
    </div>
  );
}
