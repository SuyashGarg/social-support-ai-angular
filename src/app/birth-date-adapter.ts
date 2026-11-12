import { Injectable } from '@angular/core';
import { MAT_NATIVE_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class BirthDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value !== 'string') return value instanceof Date ? value : null;
    const normalized = value.trim()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0));
    if (!normalized) return null;
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);
    if (!match) return this.invalid();
    const [, d, m, y] = match;
    try {
      const date = this.createDate(Number(y), Number(m) - 1, Number(d));
      return Number(y) > 0 && date.getDate() === Number(d) && date.getMonth() === Number(m) - 1 ? date : this.invalid();
    } catch { return this.invalid(); }
  }
  override format(date: Date, displayFormat: Object): string {
    if (displayFormat === 'birth-date-input') {
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).padStart(4, '0')}`;
    }
    return super.format(date, displayFormat);
  }
}
export const BIRTH_DATE_FORMATS = {
  ...MAT_NATIVE_DATE_FORMATS,
  display: { ...MAT_NATIVE_DATE_FORMATS.display, dateInput: 'birth-date-input' },
};
