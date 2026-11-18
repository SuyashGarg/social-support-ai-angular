import { Injectable, computed, effect, signal } from "@angular/core";
import en from "./i18n/en.json";
import ar from "./i18n/ar.json";
import { formSteps } from "./data/formMock";
import { FormElement } from "./types/form";
export type Values = Record<string, string | boolean>;
export interface Entry {
  id: string;
  submittedAt: string;
  data: Values;
}
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
@Injectable({ providedIn: "root" })
export class Store {
  readonly language = signal<"en" | "ar">(read("ss-angular-language", "en"));
  readonly direction = computed(() =>
    this.language() === "ar" ? "rtl" : "ltr",
  );
  readonly values = signal<Values>(read("ss-angular-draft", {}));
  readonly history = signal<Entry[]>(read("ss-angular-history", []));
  readonly errors = signal<Record<string, string>>({});
  readonly storageError = signal(false);
  readonly loading = signal(false);
  readonly generatingField = signal("");
  readonly suggestion = signal("");
  readonly suggestionField = signal("");
  readonly apiError = signal("");
  readonly steps = formSteps;
  constructor() {
    effect(() => {
      document.documentElement.lang = this.language();
      document.documentElement.dir = this.direction();
    });
    effect(
      () => {
        try {
          sessionStorage.setItem(
            "ss-angular-draft",
            JSON.stringify(this.values()),
          );
          sessionStorage.setItem(
            "ss-angular-history",
            JSON.stringify(this.history()),
          );
          sessionStorage.setItem(
            "ss-angular-language",
            JSON.stringify(this.language()),
          );
        } catch {
          this.storageError.set(true);
        }
      },
      { allowSignalWrites: true },
    );
  }
  t(key: string): string {
    let result: unknown = this.language() === "ar" ? ar : en;
    for (const part of key.split("."))
      result = (result as Record<string, unknown>)?.[part];
    return typeof result === "string" ? result : key;
  }
  text(enText: string, arText: string) {
    return this.language() === "ar" ? arText : enText;
  }
  set(name: string, value: string | boolean) {
    this.values.update((data) => ({ ...data, [name]: value }));
    this.errors.update((errors) => {
      const next = { ...errors };
      delete next[name];
      return next;
    });
  }
  error(field: FormElement): string {
    const value = this.values()[field.name];
    const str = String(value ?? "").trim();
    if (field.required && (!str || value === false))
      return "validation.required";
    if (!str) return "";
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str))
      return "validation.invalidEmail";
    if (field.type === "phone" && !/^\+?[\d\s()-]{7,20}$/.test(str))
      return "validation.invalidPhone";
    if (field.type === "id" && !/^784-\d{4}-\d{7}-\d$/.test(str))
      return "validation.invalidEmiratesId";
    if (
      field.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(str) ||
        Number.isNaN(Date.parse(str)) ||
        new Date(str + 'T12:00:00').getDate() !== Number(str.slice(8, 10)) ||
        str > `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`)
    )
      return "validation.invalidDate";
    if (
      ["monthlyIncome", "dependents"].includes(field.name) &&
      (!/^\d+(\.\d{1,2})?$/.test(str) ||
        (field.name === "dependents" && !/^\d+$/.test(str)))
    )
      return "validation.invalidNumber";
    if (field.options && !field.options.some((o) => o.value === str))
      return "validation.required";
    return "";
  }
  validate(index: number) {
    const errors: Record<string, string> = {};
    for (const field of this.steps[index].elements) {
      const error = this.error(field);
      if (error) errors[field.name] = error;
    }
    this.errors.set(errors);
    return !Object.keys(errors).length;
  }
  firstIncomplete() {
    return this.steps.findIndex((step) =>
      step.elements.some((field) => !!this.error(field)),
    );
  }
  submit(): Entry | null {
    const index = this.firstIncomplete();
    if (index >= 0) {
      this.validate(index);
      return null;
    }
    const entry = {
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      data: { ...this.values() },
    };
    this.history.update((entries) => [entry, ...entries]);
    this.values.set({});
    return entry;
  }
  reset() {
    this.values.set({});
    this.errors.set({});
    this.apiError.set("");
    this.suggestionField.set("");
  }
  async assist(field: FormElement) {
    if (this.loading()) return;
    this.generatingField.set(field.name);
    this.loading.set(true);
    this.apiError.set("");
    this.suggestion.set("");
    this.suggestionField.set("");
    try {
      const response = await fetch("/api/openAi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation: String(this.values()[field.name] || ""),
          field: this.t(field.labelKey),
          language: this.language(),
        }),
        signal: AbortSignal.timeout(45000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      this.suggestion.set(data.text);
      this.suggestionField.set(field.name);
    } catch {
      this.apiError.set(
        this.text(
          "Unable to generate a suggestion. Check the server configuration or try again.",
          "تعذر إنشاء اقتراح. تحقق من إعدادات الخادم أو حاول مرة أخرى.",
        ),
      );
    } finally {
      this.generatingField.set("");
      this.loading.set(false);
    }
  }
  accept() {
    this.set(this.suggestionField(), this.suggestion());
    this.suggestionField.set("");
  }
  display(field: FormElement, data: Values) {
    const value = data[field.name];
    if (field.type === "country" && typeof value === "string" && value) {
      try {
        return (
          new Intl.DisplayNames([this.language()], { type: "region" }).of(
            value,
          ) || value
        );
      } catch {
        return value;
      }
    }
    const option = field.options?.find((o) => o.value === value);
    return option
      ? this.t(option.labelKey)
      : typeof value === "boolean"
        ? this.t(value ? "app.yes" : "app.no")
        : value
          ? `${field.prefix ? field.prefix + " " : ""}${value}`
          : "—";
  }
}
