import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrder, getOrderById, getOrders, updateOrder } from "@/lib/mock-data";
import { type CreateOrderRequest, type UpdateOrderRequest } from "@/lib/schema";

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ["orders", status ?? "all"],
    queryFn: async () => getOrders(status),
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => getOrderById(id),
    enabled: !!id && !isNaN(id),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateOrderRequest) =>
      updateOrder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
    },
  });
}
