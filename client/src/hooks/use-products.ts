import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  createProduct,
  createProductsBatch,
  fetchProduct,
  fetchProducts,
} from "@/services/products";
import { fetchCategories } from "@/services/categories";
import type { ProductInput } from "@/types/models";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchProduct(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: (data: ProductInput) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCreateProductsBatch() {
  return useMutation({
    mutationFn: (data: ProductInput[]) => createProductsBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
