"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mostRepeatTimes, type Rule } from "@/lib/reminders";
import { NumberField } from "./shared";

// What a reminder starts with when the owner turns repeating on.
const startingRepeat = { repeatEveryDays: 14, maxTimes: 4 };
const units = { days: { label: "días", size: 1 }, weeks: { label: "semanas", size: 7 } } as const;
type Unit = keyof typeof units;

/** Whether a reminder goes once or again every so often. */
export function RepeatFields({ rule, onChange }: { rule: Rule; onChange: (values: Partial<Rule>) => void }) {
  const id = useId();
  const repeats = rule.repeatEveryDays !== undefined;
  const every = rule.repeatEveryDays ?? startingRepeat.repeatEveryDays;
  // Chosen once, so typing "7" days doesn't turn into "1" week under the owner's fingers.
  const [unit, setUnit] = useState<Unit>(every % 7 === 0 ? "weeks" : "days");
  const count = every / units[unit].size;

  function changeUnit(next: Unit) {
    setUnit(next);
    // The number stays; what it counts changes.
    onChange({ repeatEveryDays: count * units[next].size });
  }

  return (
    <div className="campaign-repeat">
      <div className="campaign-field">
        <label htmlFor={`${id}-mode`}>Se envía</label>
        <select id={`${id}-mode`} value={repeats ? "repeat" : "once"}
          onChange={(event) => {
            if (event.target.value === "repeat") {
              setUnit("weeks");
              onChange(startingRepeat);
            } else onChange({ repeatEveryDays: undefined, maxTimes: undefined });
          }}>
          <option value="once">Una sola vez</option>
          <option value="repeat">Cada cierto tiempo</option>
        </select>
      </div>
      {repeats && (
        <>
          <div className="campaign-every">
            <NumberField label="Repetir cada" value={count} max={unit === "weeks" ? 52 : 365}
              onChange={(value) => onChange({ repeatEveryDays: value * units[unit].size })} />
            <select aria-label="Unidad de la repetición" value={unit} onChange={(event) => changeUnit(event.target.value as Unit)}>
              {(Object.keys(units) as Unit[]).map((option) => <option key={option} value={option}>{units[option].label}</option>)}
            </select>
          </div>
          <div className="campaign-field">
            <Label htmlFor={`${id}-times`}>Máximo de avisos</Label>
            <Input id={`${id}-times`} type="number" inputMode="numeric" min={2} max={mostRepeatTimes} step={1}
              placeholder="Sin límite" value={rule.maxTimes ?? ""}
              onChange={(event) => onChange({ maxTimes: event.target.value === "" ? undefined : Number(event.target.value) })} />
          </div>
        </>
      )}
    </div>
  );
}
