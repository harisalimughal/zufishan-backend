import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { marketplaceExtensionController as controller } from "../controllers/marketplace-extension.controller";
import { createRatingSchema, ratingIdSchema, ratingProductIdSchema, updateRatingSchema } from "../validators/marketplace-category.validator";

const router = Router();

router.get("/products/:productId/ratings", validate(ratingProductIdSchema, "params"), controller.listRatings);
router.post("/products/:productId/ratings", authenticate, validate(ratingProductIdSchema, "params"), validate(createRatingSchema), controller.createRating);
router.patch("/ratings/:ratingId", authenticate, validate(ratingIdSchema, "params"), validate(updateRatingSchema), controller.updateRating);
router.delete("/ratings/:ratingId", authenticate, validate(ratingIdSchema, "params"), controller.deleteRating);

export default router;
