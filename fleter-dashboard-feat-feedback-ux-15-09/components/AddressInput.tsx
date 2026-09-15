"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

interface AddressInputProps {
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: { address: string; lat: number; lng: number }) => void;
  onClear: () => void;
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line-strong)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 13,
  fontFamily: "var(--font-ui)",
  width: "100%",
  boxSizing: "border-box",
};

export default function AddressInput({ placeholder, value, onChange, onSelect, onClear }: AddressInputProps) {
  const placesLib = useMapsLibrary("places");
  const ready = placesLib !== null;

  const [inputValue, setInputValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value resets (e.g. after adding a stop). Patrón de React
  // "Adjusting state when a prop changes": se ajusta durante el render
  // comparando con el valor anterior, no dentro de un useEffect.
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value);
  }

  const fetchSuggestions = useCallback(
    async (text: string) => {
      if (!ready || !text.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const { suggestions: results } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: text,
            includedRegionCodes: ["ar"],
            locationBias: { south: -34.706, north: -34.527, west: -58.532, east: -58.335 },
          });
        setSuggestions(results.map((s) => s.placePrediction!));
      } catch {
        setSuggestions([]);
      }
    },
    [ready]
  );

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setInputValue(text);
    onChange(text);
    if (!text) {
      setSuggestions([]);
      onClear();
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  }

  async function handleSelect(prediction: google.maps.places.PlacePrediction) {
    const text = prediction.text.toString();
    setInputValue(text);
    setSuggestions([]);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["location", "displayName"] });
      const lat = place.location!.lat();
      const lng = place.location!.lng();
      onSelect({ address: text, lat, lng });
    } catch {
      // fetchFields failed — keep text but don't update coords
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
      <input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInput}
        disabled={!ready}
        style={inputStyle}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            zIndex: 50,
            listStyle: "none",
            margin: 0,
            padding: 0,
            overflow: "hidden",
          }}
        >
          {suggestions.map((prediction) => {
            const key = prediction.placeId;
            const label = prediction.text.toString();
            return (
              <li
                key={key}
                onMouseDown={() => handleSelect(prediction)}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  fontFamily: "var(--font-ui)",
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2, #f5f5f5)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "";
                }}
              >
                {label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
