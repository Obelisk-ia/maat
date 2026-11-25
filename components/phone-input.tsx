"use client";

import type { ComponentProps } from "react";
import { reformatInput } from "@/lib/format-input";
import { formatPhoneInput } from "@/lib/registration";
import "./phone-input.css";

/** A phone field that spaces the number as it's typed. Shows +52 unless another prefix is entered. */
export function PhoneInput({ value, onValueChange, ...props }:
  Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
    value: string;
    onValueChange: (value: string) => void;
  }) {
  return (
    <div className="phone-input">
      {!value.startsWith("+") && <span aria-hidden="true">+52</span>}
      <input {...props} type="tel" inputMode="tel" maxLength={24} value={value}
        onChange={(event) => onValueChange(reformatInput(event.target, formatPhoneInput))} />
    </div>
  );
}
