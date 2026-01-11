import { useProducts, useCategories } from "@/hooks/use-products";
import { Loader2, Plus } from "lucide-react";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your inventory catalog</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products?.map((product) => (
          <div key={product.id} className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="aspect-[4/3] bg-secondary/20 relative overflow-hidden">
              <img 
                src={Array.isArray(product.images) && product.images[0] ? String(product.images[0]) : "https://placehold.co/600x400/171A1D/D4B16A?text=Product"} 
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${product.stock > 0 ? "bg-mint/90 text-teal-950" : "bg-destructive/90 text-white"}`}>
                  {product.stock > 0 ? "In Stock" : "Out of Stock"}
                </span>
              </div>
            </div>
            
            <div className="p-5 space-y-3">
              <div>
                <h3 className="font-semibold text-lg leading-tight truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2 min-h-[2.5em]">
                  {product.description || "No description available"}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-lg font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {categories?.find(c => c.id === product.categoryId)?.name || "Uncategorized"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
