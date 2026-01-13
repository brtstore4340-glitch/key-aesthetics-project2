import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dbService, type CreateProductInput } from "@/lib/services/dbService";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => dbService.listProducts(),
  });
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      if (!id) return null;
      return dbService.getProduct(id);
    },
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => dbService.listCategories(),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductInput) => dbService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useBatchCreateProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProductInput[]) => dbService.batchCreateProducts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
