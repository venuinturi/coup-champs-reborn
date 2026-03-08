import { useState } from "react";
import { Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABLE_FELTS, getTableFelt, type TableFelt } from "@/lib/tableFelts";

interface TableFeltPickerProps {
  currentFelt: string;
  onSelectFelt: (feltId: string) => void;
}

const TableFeltPicker = ({ currentFelt, onSelectFelt }: TableFeltPickerProps) => {
  const [hoveredFelt, setHoveredFelt] = useState<TableFelt | null>(null);
  const previewFelt = hoveredFelt ?? getTableFelt(currentFelt);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-muted-foreground">Table Felt</h3>

      {/* Felt swatches */}
      <div className="flex flex-wrap gap-2.5">
        {TABLE_FELTS.map((felt) => {
          const isSelected = currentFelt === felt.id;
          return (
            <button
              key={felt.id}
              onClick={() => onSelectFelt(felt.id)}
              onMouseEnter={() => setHoveredFelt(felt)}
              onMouseLeave={() => setHoveredFelt(null)}
              className={cn(
                "group relative w-11 h-11 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
                "hover:scale-115 hover:shadow-xl",
                isSelected
                  ? "border-foreground ring-2 ring-foreground/20 scale-110"
                  : "border-transparent hover:border-foreground/30"
              )}
              style={{
                backgroundColor: felt.swatch,
                boxShadow: isSelected ? `0 0 16px ${felt.swatch}60` : undefined,
              }}
              title={felt.name}
            >
              {isSelected && (
                <Check className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
              )}
              <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {felt.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live preview — mini table */}
      <div
        className="relative rounded-2xl border overflow-hidden transition-all duration-500"
        style={{ borderColor: `${previewFelt.swatch}40` }}
      >
        {/* Felt surface */}
        <div
          className="relative h-44 transition-all duration-500"
          style={{ background: previewFelt.background }}
        >
          {/* Pattern overlay */}
          {previewFelt.pattern && (
            <div
              className="absolute inset-0 opacity-100"
              style={{
                backgroundImage: previewFelt.pattern,
                backgroundRepeat: "repeat",
              }}
            />
          )}

          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

          {/* Table border rail */}
          <div
            className="absolute inset-3 rounded-[2rem] border-2 transition-all duration-500"
            style={{ borderColor: `${previewFelt.swatch}50` }}
          />

          {/* Inner rail highlight */}
          <div
            className="absolute inset-4 rounded-[1.75rem] border transition-all duration-500"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          />

          {/* Dealer area */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2">
            <div className="flex gap-1.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-7 h-10 rounded-sm border border-white/15 bg-white/5 backdrop-blur-sm"
                />
              ))}
            </div>
          </div>

          {/* Player positions */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="flex gap-1">
                  <div className="w-6 h-8 rounded-sm border border-white/15 bg-white/5 backdrop-blur-sm" />
                  <div className="w-6 h-8 rounded-sm border border-white/15 bg-white/5 backdrop-blur-sm" />
                </div>
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15" />
              </div>
            ))}
          </div>

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Layers className="w-3.5 h-3.5 text-white/60" />
              <span className="text-xs font-bold text-white/70">{previewFelt.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableFeltPicker;
