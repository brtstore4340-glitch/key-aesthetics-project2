# Firestore Collections (Sample Structure)

## users/{uid}
```json
{
  "username": "jane.d",
  "name": "Jane Doe",
  "role": "admin"
}
```

## categories/{categoryId}
```json
{
  "name": "Skin Care",
  "colorTag": "#F5B971"
}
```

## products/{productId}
```json
{
  "name": "Hydrating Serum",
  "description": "Lightweight serum",
  "price": "890",
  "categoryId": "categories/skin-care",
  "images": ["https://.../serum.jpg"],
  "stock": 24,
  "isEnabled": true,
  "createdAt": "<serverTimestamp>"
}
```

## promotions/{promotionId}
```json
{
  "name": "Holiday Deal",
  "productId": "products/serum",
  "withdrawAmount": 2,
  "isActive": true,
  "createdAt": "<serverTimestamp>"
}
```

## orders/{orderId}
```json
{
  "orderNo": "ORD-XL42",
  "status": "submitted",
  "items": [
    {
      "productId": "products/serum",
      "name": "Hydrating Serum",
      "quantity": 2,
      "price": 890
    }
  ],
  "total": 1780,
  "customerInfo": {
    "doctorName": "Dr. Smith",
    "doctorId": "DR-1001",
    "address": "Bangkok"
  },
  "attachments": [
    {
      "type": "payment_slip",
      "url": "https://..."
    }
  ],
  "createdBy": "users/uid",
  "verifiedBy": "users/uid",
  "verifiedAt": "<timestamp>",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```
