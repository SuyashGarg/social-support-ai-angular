import { createApp } from "./app.js";
createApp().listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log(
    "Social Support API listening on port " + (process.env.PORT || 3001),
  ),
);
