"use client";
import { useState } from "react";
import { Search, X, ChevronDown, Users } from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };

function uname(u: User) { return u.username ?? u.name ?? "?"; }

export function UserPickerSheet({
  label,
  users,
  selected,
  onToggle,
  searchValue,
  onSearchChange,
}: {
  label: string;
  users: User[];
  selected: string[];
  onToggle: (id: string) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-left sm:hidden"
      >
        <span className="flex items-center gap-2 text-gray-400">
          <Users className="w-3.5 h-3.5" />
          {selected.length > 0 ? (
            <span className="text-white">{selected.length} {label} ausgewählt</span>
          ) : (
            <span>{label} auswählen...</span>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />
      </button>

      {/* Desktop grid (always visible on sm+) */}
      <div className="hidden sm:block">
        <PickerGrid
          users={users}
          selected={selected}
          onToggle={onToggle}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
        />
      </div>

      {/* Bottom sheet modal (mobile only) */}
      {open && (
        <div className="sm:hidden">
          {/* Backdrop */}
          <div
            className="sheet-backdrop fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Sheet */}
          <div className="sheet-slide-up fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[80dvh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-600" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
              <p className="text-sm font-semibold text-white">{label} auswählen</p>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Search */}
            <div className="px-4 pt-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="User suchen..."
                  value={searchValue}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg pl-8 pr-3 py-2 placeholder:text-gray-600"
                  autoFocus
                />
              </div>
            </div>
            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6">
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {users.map(u => {
                  const isSelected = selected.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onToggle(u.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs text-left transition-colors ${
                        isSelected
                          ? "bg-teal-900/40 border border-teal-600/40 text-teal-300"
                          : "bg-gray-800 border border-transparent text-gray-300 hover:bg-gray-750"
                      }`}
                    >
                      {u.image ? (
                        <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0 ring-1 ring-white/10" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                          {uname(u)[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="truncate font-medium">{uname(u)}</span>
                      {isSelected && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Done button */}
            <div className="px-4 pb-6 pt-2 safe-area-pb border-t border-gray-800">
              <button
                onClick={() => setOpen(false)}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-xl py-3 transition-colors"
              >
                Fertig ({selected.length} ausgewählt)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PickerGrid({
  users, selected, onToggle, searchValue, onSearchChange,
}: {
  users: User[];
  selected: string[];
  onToggle: (id: string) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="User suchen..."
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg pl-8 pr-3 py-1.5 placeholder:text-gray-600"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
        {users.map(u => (
          <label key={u.id} className="flex items-center gap-1.5 p-1.5 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer text-xs">
            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => onToggle(u.id)} className="rounded shrink-0" />
            <span className="text-white truncate">{uname(u)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
