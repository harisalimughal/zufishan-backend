import { Router } from "express";
import { validate } from "../middlewares/validate.middleware";
import { marketplaceExtensionController as controller } from "../controllers/marketplace-extension.controller";
import { categoryIdSchema, createCategorySchema, updateCategorySchema } from "../validators/marketplace-category.validator";

const router = Router();

router.get("/categories", controller.listCategories);
router.post("/categories", validate(createCategorySchema), controller.createCategory);
router.patch("/categories/:categoryId", validate(categoryIdSchema, "params"), validate(updateCategorySchema), controller.updateCategory);
router.delete("/categories/:categoryId", validate(categoryIdSchema, "params"), controller.deactivateCategory);

export default router;
