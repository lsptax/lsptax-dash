import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import {
  register,
  login,
  logout,
  docusignOAuthCallback,
} from "../controller/authController.js";


const router = Router();
router.post(
  "/register",
  body("email").isEmail().withMessage("Invalid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  validate,
  register
);

router.post(
  "/login",
  body("email").isEmail().withMessage("Invalid email"),
  body("password").exists().withMessage("Password is required"),
  validate,
  login
);

router.post("/logout", logout)
router.get("/docusign/callback", docusignOAuthCallback);
export default router;
