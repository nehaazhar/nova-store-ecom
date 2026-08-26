import express from "express";
import { askShoppingAssistant } from "../controllers/assistant.controller.js";

const router = express.Router();

router.post("/ask", askShoppingAssistant);

export default router;
