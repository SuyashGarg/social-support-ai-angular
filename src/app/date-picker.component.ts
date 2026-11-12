import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { BidiModule } from '@angular/cdk/bidi';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatDatepickerIntl, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { BirthDateAdapter, BIRTH_DATE_FORMATS } from './birth-date-adapter';
import { Store } from './store';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [FormsModule, BidiModule, MatDatepickerModule, MatFormFieldModule, MatInputModule],
  providers: [{ provide: DateAdapter, useClass: BirthDateAdapter }, { provide: MAT_DATE_FORMATS, useValue: BIRTH_DATE_FORMATS }, MatDatepickerIntl],
  template: `
    <mat-form-field [class.date-invalid]="invalid()" [dir]="s.direction()" appearance="outline" subscriptSizing="dynamic">
      <input #dateInput matInput [id]="fieldId()" [matDatepicker]="picker" [ngModel]="model()" [ngModelOptions]="{standalone: true}"
        [max]="today" autocomplete="bday" inputmode="numeric" dir="ltr"
        [placeholder]="s.text('DD/MM/YYYY', 'يوم/شهر/سنة')"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="invalid() ? fieldId() + '-error' : null"
        (input)="typed(dateInput.value)" (dateChange)="select($event.value, dateInput.value)" />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker startView="month" [startAt]="selected() || today" />
    </mat-form-field>
  `,
  styles: `
    :host { display: block; }
    mat-form-field {
      width: 100%;
      --mat-form-field-container-height: 46px;
      --mat-form-field-container-vertical-padding: 11px;
      --mat-form-field-container-text-font: inherit;
      --mat-form-field-container-text-size: 15px;
      --mat-form-field-container-text-tracking: normal;
      --mdc-outlined-text-field-container-shape: 6px;
      --mdc-outlined-text-field-outline-color: #d1d5db;
      --mdc-outlined-text-field-hover-outline-color: #d1d5db;
      --mdc-outlined-text-field-focus-outline-color: #d1d5db;
      --mdc-outlined-text-field-focus-outline-width: 1px;
      --mdc-outlined-text-field-input-text-color: #111827;
      --mdc-outlined-text-field-input-text-placeholder-color: #9ca3af;
      --mdc-outlined-text-field-caret-color: #111827;
      --mdc-outlined-text-field-error-outline-color: #b91c1c;
      --mdc-outlined-text-field-error-hover-outline-color: #b91c1c;
      --mdc-outlined-text-field-error-focus-outline-color: #b91c1c;
      --mat-datepicker-toggle-icon-color: #6b7280;
      --mat-datepicker-toggle-active-state-icon-color: #475569;
    }
    mat-form-field.date-invalid {
      --mdc-outlined-text-field-outline-color: #b91c1c;
      --mdc-outlined-text-field-hover-outline-color: #b91c1c;
      --mdc-outlined-text-field-focus-outline-color: #b91c1c;
    }
    input { cursor: text; }
  `,
})
export class DatePickerComponent {
  readonly s = inject(Store);
  readonly value = input('');
  readonly fieldId = input('dateOfBirth');
  readonly invalid = input(false);
  readonly valueChange = output<string>();
  readonly today = new Date();
  readonly model = signal<Date | null>(null);
  private lastEmitted: string | undefined;
  private readonly adapter = inject(DateAdapter<Date>);
  private readonly intl = inject(MatDatepickerIntl);
  readonly selected = computed(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.value())) return null;
    const [year, month, day] = this.value().split('-').map(Number);
    try {
      const date = this.adapter.createDate(year, month - 1, day);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    } catch { return null; }
  });
  constructor() {
    effect(() => {
      const value = this.value();
      const selected = this.selected();
      if (value !== this.lastEmitted) this.model.set(selected);
    }, { allowSignalWrites: true });
    effect(() => {
      this.adapter.setLocale(this.s.language() === 'ar' ? 'ar-AE' : 'en-GB');
      const ar = this.s.language() === 'ar';
      this.intl.calendarLabel = ar ? 'التقويم' : 'Calendar';
      this.intl.openCalendarLabel = ar ? 'فتح التقويم' : 'Open calendar';
      this.intl.closeCalendarLabel = ar ? 'إغلاق التقويم' : 'Close calendar';
      this.intl.prevMonthLabel = ar ? 'الشهر السابق' : 'Previous month';
      this.intl.nextMonthLabel = ar ? 'الشهر التالي' : 'Next month';
      this.intl.prevYearLabel = ar ? 'السنة السابقة' : 'Previous year';
      this.intl.nextYearLabel = ar ? 'السنة التالية' : 'Next year';
      this.intl.prevMultiYearLabel = ar ? 'السنوات السابقة' : 'Previous years';
      this.intl.nextMultiYearLabel = ar ? 'السنوات التالية' : 'Next years';
      this.intl.switchToMonthViewLabel = ar ? 'اختيار التاريخ' : 'Choose date';
      this.intl.switchToMultiYearViewLabel = ar ? 'اختيار السنة' : 'Choose year';
      this.intl.changes.next();
    });
  }
  typed(raw: string) { this.select(this.adapter.parse(raw, null), raw); }
  select(date: Date | null, raw: string) {
    const value = date && this.adapter.isValid(date) ? `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : raw.trim();
    this.lastEmitted = value;
    this.valueChange.emit(value);
  }
}
