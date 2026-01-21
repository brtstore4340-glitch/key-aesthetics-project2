{
  "name": "Product",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Product name"
    },
    "description": {
      "type": "string",
      "description": "Product description"
    },
    "price": {
      "type": "number",
      "description": "Product price"
    },
    "image_url": {
      "type": "string",
      "description": "Product image"
    },
    "category_id": {
      "type": "string",
      "description": "Reference to ProductCategory"
    },
    "sku": {
      "type": "string",
      "description": "Stock keeping unit"
    },
    "in_stock": {
      "type": "boolean",
      "default": true,
      "description": "Availability status"
    }
  },
  "required": [
    "name",
    "price"
  ]
}
