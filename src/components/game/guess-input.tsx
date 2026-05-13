'use client';

import { type KeyboardEvent, type WheelEvent, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getMuscleGroupIconPath, resolveMuscleGroupIconKey } from "@/lib/exercises/icons";
import type { LiveExerciseSuggestion } from "@/lib/game/client";

type GuessInputProps = {
  query: string;
  selectedExerciseId: string | null;
  exercises: LiveExerciseSuggestion[];
  loadingExercises: boolean;
  disabled: boolean;
  submitting: boolean;
  onQueryChange: (value: string) => void;
  onSelectExercise: (exercise: LiveExerciseSuggestion) => void;
  onSubmit: (exercise?: LiveExerciseSuggestion) => void;
  autoDropdownPlacement?: boolean;
  preferredDropdownPlacement?: "up" | "down";
  className?: string;
};

type RankedExercise = {
  exercise: LiveExerciseSuggestion;
  score: number;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(value: string): string {
  return normalize(value).replace(/\s+/g, "");
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const costs = new Array(b.length + 1).fill(0);

  for (let j = 0; j <= b.length; j += 1) {
    costs[j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    let prev = costs[0];
    costs[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const temp = costs[j];
      const replace = prev + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insert = costs[j] + 1;
      const remove = costs[j - 1] + 1;
      costs[j] = Math.min(replace, insert, remove);
      prev = temp;
    }
  }

  return costs[b.length];
}

function scoreExercise(query: string, exercise: LiveExerciseSuggestion): number {
  const name = normalize(exercise.display_name || exercise.name);
  const canonical = normalize(exercise.canonical_name || exercise.display_name || exercise.name);
  const aliases = exercise.aliases.map(normalize);
  const queryCompact = normalizeCompact(query);
  const nameCompact = normalizeCompact(name);
  const canonicalCompact = normalizeCompact(canonical);
  const aliasCompacts = aliases.map(normalizeCompact);

  if (!query) return 10;
  if (name === query) return 220;
  if (canonical === query) return 215;
  if (nameCompact === queryCompact) return 210;
  if (canonicalCompact === queryCompact) return 205;
  if (name.startsWith(query)) return 160;
  if (canonical.startsWith(query)) return 155;
  if (name.includes(query)) return 120;
  if (canonical.includes(query)) return 115;

  if (aliases.some((alias) => alias === query)) return 110;
  if (aliasCompacts.some((alias) => alias === queryCompact)) return 108;
  if (query.length >= 2 && aliases.some((alias) => alias.startsWith(query))) return 95;
  if (query.length >= 3 && aliases.some((alias) => alias.includes(query))) return 80;

  // Keep typo tolerance strict to avoid unrelated suggestions (e.g. "ww" -> random exercises).
  if (query.length >= 4 && name[0] === query[0]) {
    const nameDistance = levenshteinDistance(query, name.slice(0, query.length));
    if (nameDistance <= 1) return 72 - nameDistance * 7;
  }

  if (query.length >= 4) {
    const closeAlias = aliases.some((alias) => {
      if (!alias || alias[0] !== query[0]) return false;
      const aliasDistance = levenshteinDistance(query, alias.slice(0, query.length));
      return aliasDistance <= 1;
    });

    if (closeAlias) return 68;
  }

  return -1;
}

export function GuessInput({
  query,
  selectedExerciseId,
  exercises,
  loadingExercises,
  disabled,
  submitting,
  onQueryChange,
  onSelectExercise,
  onSubmit,
  autoDropdownPlacement = false,
  preferredDropdownPlacement = "down",
  className,
}: GuessInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPlacement, setDropdownPlacement] = useState<"up" | "down">(preferredDropdownPlacement);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldWrapRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const normalizedQuery = normalize(query);

  const suggestions = useMemo(() => {
    const ranked: RankedExercise[] = exercises
      .map((exercise) => ({ exercise, score: scoreExercise(normalizedQuery, exercise) }))
      .filter((entry) => entry.score >= 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.exercise.display_name || a.exercise.name).localeCompare(b.exercise.display_name || b.exercise.name),
      );

    return ranked.map((entry) => entry.exercise);
  }, [exercises, normalizedQuery]);

  const showDropdown = isOpen && !disabled && query.trim().length > 0 && !selectedExerciseId;
  const canSubmitFromButton =
    query.trim().length > 0 && !disabled && !loadingExercises && !submitting;

  const updateDropdownPlacement = useCallback(() => {
    if (!autoDropdownPlacement || typeof window === "undefined") {
      return;
    }

    const anchor = fieldWrapRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const gap = 8;
    const minHeight = 140;
    const spaceAbove = Math.max(0, rect.top - gap);
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap);

    let placeUp = preferredDropdownPlacement === "up";
    if (preferredDropdownPlacement === "up") {
      placeUp = spaceAbove >= minHeight || spaceAbove >= spaceBelow;
    } else {
      placeUp = !(spaceBelow >= minHeight || spaceBelow >= spaceAbove);
    }

    const available = Math.max(minHeight, (placeUp ? spaceAbove : spaceBelow) - gap);

    setDropdownPlacement(placeUp ? "up" : "down");
    setDropdownMaxHeight(Math.min(available, 320));
  }, [autoDropdownPlacement, preferredDropdownPlacement]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isMobile = window.matchMedia("(max-width: 760px)").matches;
    const shouldHideFloatingPills = isMobile && showDropdown;
    document.body.classList.toggle("guess-dropdown-open-mobile", shouldHideFloatingPills);

    return () => {
      document.body.classList.remove("guess-dropdown-open-mobile");
    };
  }, [showDropdown]);

  useLayoutEffect(() => {
    if (!showDropdown || !autoDropdownPlacement || typeof window === "undefined") {
      return;
    }

    window.addEventListener("resize", updateDropdownPlacement);
    window.addEventListener("scroll", updateDropdownPlacement, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPlacement);
      window.removeEventListener("scroll", updateDropdownPlacement, true);
    };
  }, [autoDropdownPlacement, showDropdown, suggestions.length, updateDropdownPlacement]);

  const handleSelect = (exercise: LiveExerciseSuggestion) => {
    onSelectExercise(exercise);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      updateDropdownPlacement();
      setIsOpen(true);
      setActiveIndex((prev) => (suggestions.length === 0 ? -1 : Math.min(prev + 1, suggestions.length - 1)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      updateDropdownPlacement();
      setIsOpen(true);
      setActiveIndex((prev) => (suggestions.length === 0 ? -1 : Math.max(prev - 1, 0)));
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (showDropdown && suggestions.length > 0) {
        const picked = activeIndex >= 0 && suggestions[activeIndex] ? suggestions[activeIndex] : suggestions[0];
        handleSelect(picked);
        onSubmit(picked);
        return;
      }

      onSubmit();
    }
  };

  const handleDropdownWheel = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
    const scrollingUp = event.deltaY < 0;
    const scrollingDown = event.deltaY > 0;

    if ((atTop && scrollingUp) || (atBottom && scrollingDown)) {
      event.preventDefault();
    }
  };

  const handleInputFocus = () => {
    updateDropdownPlacement();
    setIsOpen(true);

    if (typeof window === "undefined") {
      return;
    }

    if (!window.matchMedia("(max-width: 768px)").matches) {
      return;
    }

    const focusInput = inputRef.current;
    const inputZone = focusInput?.closest(".game-input-zone");
    if (!(inputZone instanceof HTMLElement)) {
      return;
    }

    const scrollInputNearTop = () => {
      inputZone.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      window.scrollBy({ top: -10, behavior: "smooth" });
    };

    window.requestAnimationFrame(scrollInputNearTop);
    window.setTimeout(scrollInputNearTop, 180);
  };

  return (
    <div className={`guess-input ${className ?? ""}`.trim()}>
      <div className="guess-input__row">
        <div
          ref={fieldWrapRef}
          className={`guess-input__field-wrap ${
            autoDropdownPlacement ? `guess-input__field-wrap--${dropdownPlacement}` : ""
          }`.trim()}
        >
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showDropdown && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            value={query}
            onFocus={handleInputFocus}
            onBlur={() => {
              window.setTimeout(() => {
                setIsOpen(false);
                setActiveIndex(-1);
              }, 100);
            }}
            onChange={(event) => {
              onQueryChange(event.target.value);
              updateDropdownPlacement();
              setIsOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="GUESS THE EXERCISE..."
            disabled={disabled || loadingExercises || submitting}
            className="guess-input__field"
          />

          {showDropdown ? (
            <div
              id={listId}
              role="listbox"
              className={`guess-input__dropdown ${
                autoDropdownPlacement ? `guess-input__dropdown--${dropdownPlacement}` : ""
              }`.trim()}
              style={dropdownMaxHeight ? { maxHeight: `${dropdownMaxHeight}px` } : undefined}
              onWheel={handleDropdownWheel}
            >
              {loadingExercises ? (
                <p className="guess-input__empty">LOADING EXERCISES...</p>
              ) : suggestions.length === 0 ? (
                <p className="guess-input__empty">NO MATCH FOUND.</p>
              ) : (
                suggestions.map((exercise, index) => (
                  <button
                    id={`${listId}-option-${index}`}
                    key={exercise.id}
                    role="option"
                    aria-selected={selectedExerciseId === exercise.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(exercise);
                    }}
                    className={`guess-input__option ${index === activeIndex ? "guess-input__option--active" : ""}`}
                  >
                    <span>{exercise.display_name || exercise.name}</span>
                    <span className="guess-input__option-icon" aria-hidden>
                      <img
                        src={getMuscleGroupIconPath(resolveMuscleGroupIconKey(exercise))}
                        alt=""
                        width={18}
                        height={18}
                        loading="lazy"
                      />
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="guess-input__submit"
          aria-label="Submit guess"
          onClick={() => onSubmit()}
          disabled={!canSubmitFromButton}
        >
          <span className="guess-input__submit-glyph" aria-hidden>{"\u27A4"}</span>
        </button>
      </div>
    </div>
  );
}


