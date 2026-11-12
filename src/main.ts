import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { AppComponent, WorkspaceComponent } from "./app/app.component";
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([
      { path: "step/:index", component: WorkspaceComponent },
      { path: "history", component: WorkspaceComponent },
      { path: "review/:id", component: WorkspaceComponent },
      { path: "", pathMatch: "full", redirectTo: "step/0" },
      { path: "**", redirectTo: "step/0" },
    ]),
  ],
}).catch(console.error);
