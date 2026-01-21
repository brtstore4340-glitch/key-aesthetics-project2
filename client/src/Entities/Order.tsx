{
  "name": "Order",
  "type": "object",
  "properties": {
    "order_number": {
      "type": "string",
      "description": "Unique order number"
    },
    "customer_name": {
      "type": "string",
      "description": "Customer full name"
    },
    "customer_phone": {
      "type": "string",
      "description": "Customer phone number"
    },
    "customer_address": {
      "type": "string",
      "description": "Delivery address"
    },
    "items": {
      "type": "array",
      "description": "Order line items",
      "items": {
        "type": "object",
        "properties": {
          "product_id": {
            "type": "string"
          },
          "product_name": {
            "type": "string"
          },
          "quantity": {
            "type": "number"
          },
          "unit_price": {
            "type": "number"
          },
          "total": {
            "type": "number"
          }
        }
      }
    },
    "subtotal": {
      "type": "number",
      "description": "Subtotal before VAT"
    },
    "vat_amount": {
      "type": "number",
      "description": "VAT amount"
    },
    "total_amount": {
      "type": "number",
      "description": "Final total including VAT"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "cancelled"
      ],
      "default": "pending"
    },
    "citizen_id_url": {
      "type": "string",
      "description": "Uploaded citizen ID card image"
    },
    "payment_slip_url": {
      "type": "string",
      "description": "Uploaded payment slip image"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes"
    },
    "sales_rep_id": {
      "type": "string",
      "description": "ID of the sales representative"
    },
    "sales_rep_name": {
      "type": "string",
      "description": "Name of the sales representative"
    }
  },
  "required": [
    "customer_name",
    "customer_phone",
    "items",
    "total_amount"
  ]
}
