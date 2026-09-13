import { Router } from "express";
import { MarketplaceOrderController } from "../controllers/marketplace-order.controller";
import { MarketplaceProductController } from "../controllers/marketplace-product.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createProductSchema,
  productIdSchema,
  updateProductSchema,
} from "../validators/marketplace-product.validator";
import {
  orderIdSchema,
  returnRequestIdSchema,
  updateOrderStatusSchema,
  updateReturnStatusSchema,
} from "../validators/marketplace-order.validator";

const router = Router();
const productController = new MarketplaceProductController();
const orderController = new MarketplaceOrderController();

router.use(authenticate);

router.get("/products", productController.listVendorProducts);
router.post("/products", validate(createProductSchema), productController.createProduct);
router.patch(
  "/products/:productId",
  validate(productIdSchema, "params"),
  validate(updateProductSchema),
  productController.updateProduct
);
router.delete(
  "/products/:productId",
  validate(productIdSchema, "params"),
  productController.deleteProduct
);

router.get("/orders", orderController.getVendorOrders);
router.get(
  "/orders/:orderId",
  validate(orderIdSchema, "params"),
  orderController.getOrderDetails
);
router.patch(
  "/orders/:orderId",
  validate(orderIdSchema, "params"),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);
router.get("/returns", orderController.getVendorReturns);
router.patch(
  "/returns/:returnRequestId",
  validate(returnRequestIdSchema, "params"),
  validate(updateReturnStatusSchema),
  orderController.updateReturnStatus
);
router.get("/sales", orderController.getVendorAnalytics);

export default router;
