import { onRequest } from "firebase-functions/v2/https";
import { createApp } from "../../shared/server/app";

const ready = createApp({
  withStatic: false,
  withVite: false,
});

export const api = onRequest(
  {
    region: "asia-southeast1",
  },
  async (req, res) => {
    const { app } = await ready;
    return app(req, res);
  },
);
