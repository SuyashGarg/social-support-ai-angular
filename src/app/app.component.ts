import { Component, computed, inject, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterOutlet,
} from "@angular/router";
import { Store } from "./store";
import { DatePickerComponent } from "./date-picker.component";
import { Country, State } from "country-state-city";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: ` <header>
      <div class="header-inner">
        <a routerLink="/step/0" class="brand"
          ><img src="/logo.png" alt="" /><span>Social Support AI</span></a
        >
        <nav>
          <button
            (click)="s.language.set(s.language() === 'en' ? 'ar' : 'en')"
            aria-label="Change language"
          >
            {{ s.language() === "en" ? "العربية" : "English" }}</button><a
            routerLink="/history"
            >{{ s.t("app.history") }}</a
          >
        </nav>
      </div>
    </header>
    <main><router-outlet /></main>
    <footer>
      {{
        s.text(
          "Social Support AI · Your next step toward support",
          "الدعم الاجتماعي بالذكاء الاصطناعي · خطوتك التالية نحو الدعم"
        )
      }}
    </footer>`,
})
export class AppComponent {
  readonly s = inject(Store);
}
@Component({
  selector: "app-workspace",
  standalone: true,
  imports: [CommonModule, RouterLink, DatePickerComponent],
  templateUrl: "./workspace.html",
})
export class WorkspaceComponent implements OnDestroy {
  readonly s = inject(Store);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly page = signal("step");
  readonly step = signal(0);
  readonly id = signal("");
  readonly current = computed(() => this.s.steps[this.step()]);
  readonly entry = computed(() =>
    this.s.history().find((e) => e.id === this.id()),
  );
  readonly countries = Country.getAllCountries();
  states() {
    return State.getStatesOfCountry(this.value("country"));
  }
  countryName(code: string) {
    try {
      return (
        new Intl.DisplayNames([this.s.language()], { type: "region" }).of(
          code,
        ) || code
      );
    } catch {
      return code;
    }
  }
  readonly today = new Date().toISOString().slice(0, 10);
  private subscription = this.route.url.subscribe((segments) => {
    this.page.set(segments[0]?.path || "step");
    this.id.set(segments[1]?.path || "");
    if (this.page() === "step") {
      const raw = Number(segments[1]?.path);
      const requested = Number.isInteger(raw) && raw >= 0 && raw < 3 ? raw : 0;
      const incomplete = this.s.firstIncomplete();
      const actual =
        incomplete >= 0 ? Math.min(requested, incomplete) : requested;
      this.step.set(actual);
      if (raw !== actual)
        void this.router.navigate(["/step", actual], { replaceUrl: true });
    }
  });
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  value(name: string) {
    return String(this.s.values()[name] ?? "");
  }
  private idDigits(value: string) {
    return value
      .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
      .replace(/\D/g, "");
  }
  private formatId(value: string) {
    const digits = this.idDigits(value).slice(0, 15);
    return [
      digits.slice(0, 3),
      digits.slice(3, 7),
      digits.slice(7, 14),
      digits.slice(14, 15),
    ]
      .filter(Boolean)
      .join("-");
  }
  private updateId(target: HTMLInputElement) {
    const digitsBefore = this.idDigits(
      target.value.slice(0, target.selectionStart ?? target.value.length),
    ).length;
    const formatted = this.formatId(target.value);
    let caret = 0,
      count = 0;
    while (caret < formatted.length && count < digitsBefore) {
      if (/\d/.test(formatted[caret])) count++;
      caret++;
    }
    target.value = formatted;
    this.s.set("nationalId", formatted);
    target.setSelectionRange(caret, caret);
  }
  beforeIdInput(event: Event, name: string) {
    if (name !== "nationalId") return;
    const input = event as InputEvent;
    const target = input.target as HTMLInputElement;
    const start = target.selectionStart ?? 0;
    if (start !== target.selectionEnd) return;
    const backward = input.inputType === "deleteContentBackward";
    const forward = input.inputType === "deleteContentForward";
    if (backward && target.value[start - 1] === "-") {
      event.preventDefault();
      target.value =
        target.value.slice(0, start - 2) + target.value.slice(start);
      target.setSelectionRange(start - 2, start - 2);
      this.updateId(target);
    } else if (forward && target.value[start] === "-") {
      event.preventDefault();
      target.value =
        target.value.slice(0, start) + target.value.slice(start + 2);
      target.setSelectionRange(start, start);
      this.updateId(target);
    }
  }
  change(event: Event, name: string) {
    const target = event.target as HTMLInputElement;
    if (name === "nationalId") {
      this.updateId(target);
      return;
    }
    this.s.set(
      name,
      target.type === "checkbox" ? target.checked : target.value,
    );
    if (name === "country") this.s.set("state", "");
  }
  next() {
    if (!this.s.validate(this.step())) {
      setTimeout(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    void this.router.navigate(["/step", this.step() + 1]);
  }
  submit() {
    const entry = this.s.submit();
    if (entry) void this.router.navigate(["/review", entry.id]);
    else {
      const step = this.s.firstIncomplete();
      void this.router.navigate(["/step", Math.max(0, step)]);
    }
  }
  reset() {
    this.s.reset();
    void this.router.navigate(["/step", 0]);
  }
}
