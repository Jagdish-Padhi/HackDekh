import dotenv from "dotenv";
dotenv.config();
import connectDB from "./db/connection.ts";
import { app } from "./app.ts";

connectDB().then(() => {
  app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is running at PORT: ${process.env.PORT}`);
  });
});
