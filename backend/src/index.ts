import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, () => {
  console.log("🚀 AI Engineering Platform Backend");
  console.log(`🌐 http://localhost:${env.port}`);
});