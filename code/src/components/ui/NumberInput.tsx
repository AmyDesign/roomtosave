"use client";

/**
 * NumberInput — number input that handles the "leading 0" UX issue (TICKET-012).
 *
 * Behavior:
 *   - Internally tracks displayed value as a string (decoupled from the parent
 *     numeric state), so the user can transiently see an empty input while
 *     editing without us forcing "0" back onto the screen.
 *   - On focus: if the current displayed value is "0", clear it to "" so the
 *     user can type a number directly without producing "05000".
 *   - On blur: if the displayed value is empty (or non-numeric), restore it to
 *     "0" and emit onValueChange(0).
 *   - On change: parse and emit onValueChange. The empty string is allowed as
 *     a transient state while focused — emits onValueChange(0) without
 *     reverting the displayed text.
 *   - When parent value changes externally (and we're not focused), re-sync
 *     the displayed value.
 *
 * Use this anywhere we'd previously do:
 *   <Input type="number" value={n} onChange={(e) => ...Number(e.target.value)} />
 *
 * Replace with:
 *   <NumberInput value={n} onValueChange={(n) => ...} />
 */

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import { Input } from "./Input";

type BaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "defaultValue"
>;

interface NumberInputProps extends BaseProps {
  /** Numeric value held by the parent (source of truth). */
  value: number;
  /** Called with the parsed number when the user changes the input. */
  onValueChange: (n: number) => void;
  /** Optional prefix passed through to Input (e.g. "$"). */
  prefix?: string;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, onFocus, onBlur, prefix, ...rest }, ref) => {
    // Zero renders as an empty field showing its placeholder. On a tax form an
    // unfilled box and a zero mean the same thing, and a page of literal "0"s is
    // noise that hides the amounts that were actually entered.
    const toDisplay = (n: number) => (n === 0 ? "" : String(n));

    const [display, setDisplay] = useState<string>(() => toDisplay(value));
    const focusedRef = useRef(false);

    // Keep displayed text in sync when parent value changes externally
    // (e.g. reset, store hydration). Don't override while user is typing.
    useEffect(() => {
      if (!focusedRef.current) {
        setDisplay(toDisplay(value));
      }
    }, [value]);

    return (
      <Input
        ref={ref}
        type="number"
        prefix={prefix}
        value={display}
        onFocus={(e) => {
          focusedRef.current = true;
          // Belt and braces: zero already renders empty, but a "0" arriving
          // from elsewhere would otherwise become "05000" as soon as they type.
          if (display === "0") setDisplay("");
          onFocus?.(e);
        }}
        onBlur={(e) => {
          focusedRef.current = false;
          if (display === "" || Number.isNaN(Number(display))) {
            setDisplay("");
            onValueChange(0);
          } else {
            // Normalize the display (e.g. "5." -> "5", "0005" -> "5")
            const n = Number(display);
            setDisplay(toDisplay(n));
            onValueChange(n);
          }
          onBlur?.(e);
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDisplay(raw);
          if (raw === "") {
            // Allow transient empty state while focused; emit 0 to parent
            onValueChange(0);
          } else {
            const n = Number(raw);
            if (!Number.isNaN(n)) onValueChange(n);
          }
        }}
        {...rest}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";
