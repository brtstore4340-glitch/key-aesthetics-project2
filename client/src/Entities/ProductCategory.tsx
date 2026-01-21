{
  "name": "ProductCategory",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Category name"
    },
    "description": {
      "type": "string",
      "description": "Category description"
    },
    "image_url": {
      "type": "string",
      "description": "Category image"
    },
    "sort_order": {
      "type": "number",
      "description": "Display order"
    }
  },
  "required": [
    "name"
  ]
}
