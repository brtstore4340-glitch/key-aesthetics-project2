import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  createProductsBatch,
  getCategories,
  getProductById,
  getProducts,
} from "@/lib/mock-data";
import { type CreateProductRequest } from "@/lib/schema";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => getProducts(),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => getProductById(id),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => getCategories(),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductRequest) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useBatchCreateProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductRequest[]) => createProductsBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
