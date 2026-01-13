import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { createOrder, fetchOrder, fetchOrders, updateOrderStatus } from "@/services/orders";
import type { OrderInput, OrderStatus } from "@/types/models";

export function useOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ["orders", status],
    queryFn: () => fetchOrders(status),
  });
}

export function useOrder(id?: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => fetchOrder(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (data: OrderInput) => createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", variables.id] });
    },
  });
}
