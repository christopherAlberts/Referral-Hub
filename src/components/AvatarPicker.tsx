"use client";

import { useRef } from "react";
import { initials } from "@/lib/utils";

export function AvatarPicker({
  name,
  avatarUrl,
  onChange,
  onClear,
}: {
  name: string;
  avatarUrl: string | null;
  onChange: (file: File) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full"
        style={{ background: "var(--ink)" }}
        onClick={() => inputRef.current?.click()}
        aria-label="Change profile image"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
            {initials(name || "U")}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Change
        </span>
      </button>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--ink)]">Profile image</p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Click the photo to upload a new one</p>
        {avatarUrl && onClear && (
          <button
            type="button"
            className="mt-2 text-xs text-[var(--muted)] underline"
            onClick={onClear}
          >
            Remove image
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
