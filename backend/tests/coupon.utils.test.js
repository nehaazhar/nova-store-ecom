import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCouponApplicable,
  calculateDiscountedAmount,
  getCouponRejectionReason,
  validateCouponPayload,
  getCouponStatus,
} from '../utils/coupon.utils.js';

test('valid coupon with active status and enough order amount applies', () => {
  const coupon = {
    code: 'SAVE10',
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
    minOrderAmount: 100,
    usageCount: 0,
    maxUsage: 50,
  };

  assert.equal(isCouponApplicable(coupon, 150), true);
  assert.equal(calculateDiscountedAmount(150, coupon), 135);
  assert.equal(getCouponRejectionReason(coupon, 150), null);
});

test('expired coupon is not applicable', () => {
  const coupon = {
    code: 'EXPIRED',
    discountPercentage: 10,
    expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    isActive: true,
    minOrderAmount: 50,
    usageCount: 0,
    maxUsage: 10,
  };

  assert.equal(isCouponApplicable(coupon, 100), false);
  assert.match(getCouponRejectionReason(coupon, 100), /expired/i);
});

test('coupon with usage limit reached is not applicable', () => {
  const coupon = {
    code: 'LIMITED',
    discountPercentage: 20,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
    minOrderAmount: 50,
    usageCount: 10,
    maxUsage: 10,
  };

  assert.equal(isCouponApplicable(coupon, 100), false);
  assert.match(getCouponRejectionReason(coupon, 100), /maximum usage/i);
});

test('min order amount rejection includes shortfall', () => {
  const coupon = {
    code: 'MIN100',
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
    minOrderAmount: 100,
    usageCount: 0,
    maxUsage: 10,
  };

  const reason = getCouponRejectionReason(coupon, 40);
  assert.match(reason, /Minimum order amount/i);
  assert.match(reason, /60\.00/);
});

test('already used by user is rejected', () => {
  const userId = '507f1f77bcf86cd799439011';
  const coupon = {
    code: 'ONCE',
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
    minOrderAmount: 0,
    usageCount: 1,
    maxUsage: 10,
    usedBy: [userId],
  };

  assert.match(getCouponRejectionReason(coupon, 50, userId), /already used/i);
});

test('validateCouponPayload returns field errors', () => {
  const errors = validateCouponPayload({
    code: 'ab',
    discountPercentage: 150,
    expirationDate: '2000-01-01',
    minOrderAmount: -5,
    maxUsage: 0,
  });

  assert.ok(errors.length >= 3);
});

test('getCouponStatus maps coupon states', () => {
  assert.equal(
    getCouponStatus({
      isActive: true,
      expirationDate: new Date(Date.now() + 86400000),
      usageCount: 0,
      maxUsage: 5,
    }),
    'active'
  );
  assert.equal(
    getCouponStatus({
      isActive: false,
      expirationDate: new Date(Date.now() + 86400000),
      usageCount: 0,
      maxUsage: 5,
    }),
    'inactive'
  );
  assert.equal(
    getCouponStatus({
      isActive: true,
      expirationDate: new Date(Date.now() - 86400000),
      usageCount: 0,
      maxUsage: 5,
    }),
    'expired'
  );
  assert.equal(
    getCouponStatus({
      isActive: true,
      expirationDate: new Date(Date.now() + 86400000),
      usageCount: 5,
      maxUsage: 5,
    }),
    'exhausted'
  );
});
