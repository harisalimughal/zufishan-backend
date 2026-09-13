import supertest from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

// Helper to generate random email
const rand = () => Math.random().toString(36).substring(2, 10);

(async () => {
  const request = supertest(app);

  // 1. Register buyer
  const buyerEmail = `buyer_${rand()}@example.com`;
  await request
    .post('/api/marketplace/register')
    .send({
      email: buyerEmail,
      password: 'Pass123!',
      fullName: 'Buyer Test',
      role: 'BUYER',
      contact: '03000000000',
      address: 'Test address',
    })
    .expect(201);

  // Ensure a product category exists
  let category = await prisma.productCategory.findFirst();
  if (!category) {
    category = await prisma.productCategory.create({ data: { name: 'Default', slug: `default-${rand()}` } });
  }

  // 2. Register vendor
  const vendorEmail = `vendor_${rand()}@example.com`;
  await request
    .post('/api/marketplace/register')
    .send({
      email: vendorEmail,
      password: 'Pass123!',
      fullName: 'Vendor Test',
      role: 'VENDOR',
      contact: '03000000001',
      businessName: 'Vendor Test Business',
      proof: 'https://example.com/proof.pdf',
      location: 'Test market',
      currentState: 'Punjab',
      businessRegistrationNumber: 'REG-001',
      vendorPicture: 'https://example.com/vendor.jpg',
      businessPicture: 'https://example.com/business.jpg',
      categories: [category.id],
    })
    .expect(201);

  // 3. Login buyer
  const buyerLoginRes = await request
    .post('/api/marketplace/login')
    .send({ email: buyerEmail, password: 'Pass123!' })
    .expect(200);
  const buyerToken = buyerLoginRes.body.data.token;

  // 4. Login vendor (will be pending approval, but we can still get token)
  const vendorLoginRes = await request
    .post('/api/marketplace/login')
    .send({ email: vendorEmail, password: 'Pass123!' })
    .expect(200);
  const vendorToken = vendorLoginRes.body.data.token;

  // 5. Approve vendor directly in DB (test shortcut)
  const vendorUserId = vendorLoginRes.body.data.user.id;
  const vendorProfile = await prisma.vendorProfile.findUnique({ where: { userId: vendorUserId } });
  if (vendorProfile) {
    await prisma.vendorProfile.update({ where: { id: vendorProfile.id }, data: { approvalStatus: 'APPROVED' } });
  }

  // 6. Create a product (vendor must be approved)
  const productRes = await request
    .post('/api/marketplace/vendor/products')
    .set('Authorization', `Bearer ${vendorToken}`)
    .send({
      name: 'Test Product',
      description: 'Test product description',
      price: 10.0,
      stock: 100,
      categoryId: category.id,
    })
    .expect(201);
  const productId = productRes.body.data.id;

  // 7. Buyer adds product to cart
  await request
    .post('/api/marketplace/cart/items')
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({ productId, quantity: 2 })
    .expect(201);

  // 8. Checkout
  const checkoutRes = await request
    .post('/api/marketplace/orders')
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({ paymentMethod: 'COD', shippingAddress: 'Test address' })
    .expect(201);
  const orderId = checkoutRes.body.data.id;

  // 9. Vendor advances the order lifecycle
  await request
    .patch(`/api/marketplace/vendor/orders/${orderId}`)
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({ status: 'CONFIRMED' })
    .expect(403);

  for (const status of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']) {
    await request
      .patch(`/api/marketplace/vendor/orders/${orderId}`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ status })
      .expect(200);
  }

  // 10. Return request (buyer requests return for first order item)
  const orderItem = await prisma.orderItem.findFirst({ where: { orderId } });
  await request
    .post(`/api/marketplace/orders/${orderId}/returns`)
    .set('Authorization', `Bearer ${buyerToken}`)
    .send({ orderItemId: orderItem?.id, reason: 'Defective' })
    .expect(201);

  // 11. Failure case: invalid token
  await request
    .get('/api/marketplace/cart')
    .set('Authorization', 'Bearer invalidtoken')
    .expect(401);

  console.log('✅ All marketplace API tests passed');
  await prisma.$disconnect();
})();
