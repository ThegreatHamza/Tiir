import { supabase, type Tables, type Views } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/fetchAll";
import { enqueue } from "@/lib/offline/sync";
import { newId } from "@/lib/offline/logic";

export type SiteOrderLine = Views<"purchase_order_lines_site">;

export async function fetchOpenOrderLines(projectId: string, orderId?: string) {
  return fetchAllPages<SiteOrderLine>((f, t) => {
    let q = supabase.from("purchase_order_lines_site").select("*").eq("project_id", projectId);
    if (orderId) q = q.eq("purchase_order_id", orderId);
    return q.order("order_number", { ascending: false }).range(f, t);
  });
}

export async function fetchLocations(projectId: string) {
  const { data, error } = await supabase
    .from("stock_locations")
    .select("id, name")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchOrder(orderId: string) {
  const { data, error } = await supabase.from("purchase_order_values").select("*").eq("id", orderId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateOrder(orderId: string, values: Partial<Tables<"purchase_orders">>) {
  const { error } = await supabase.from("purchase_orders").update(values).eq("id", orderId);
  if (error) throw error;
}

export async function setRequestStatus(id: string, status: Tables<"purchase_requests">["status"]) {
  const { error } = await supabase.from("purchase_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function orderFromRequest(requestId: string) {
  const { data, error } = await supabase.rpc("order_from_request", { p_request_id: requestId });
  if (error) throw error;
  return data;
}

export async function createOrder(companyId: string, projectId: string, orderDate: string) {
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({ company_id: companyId, project_id: projectId, order_date: orderDate })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export type ReceiptLine = {
  orderLineId: string | null;
  description: string;
  unit: SiteOrderLine["unit"];
  resourceId: string | null;
  received: number;
  rejected: number;
};

/** Records a delivery through the offline queue (works without network). */
export async function receiveDelivery(input: {
  companyId: string;
  projectId: string;
  orderId: string | null;
  locationId: string;
  date: string;
  note: string;
  lines: ReceiptLine[];
  label: string;
}) {
  const deliveryId = newId();
  await enqueue(
    "deliveries",
    {
      id: deliveryId,
      company_id: input.companyId,
      project_id: input.projectId,
      purchase_order_id: input.orderId,
      location_id: input.locationId,
      delivery_date: input.date,
      delivery_note: input.note || null,
    },
    { label: input.label, companyId: input.companyId },
  );
  for (const l of input.lines.filter((x) => x.received > 0 || x.rejected > 0)) {
    await enqueue(
      "delivery_lines",
      {
        company_id: input.companyId,
        project_id: input.projectId,
        delivery_id: deliveryId,
        purchase_order_line_id: l.orderLineId,
        resource_id: l.resourceId,
        description: l.description,
        unit: l.unit,
        quantity_received: l.received,
        quantity_rejected: l.rejected,
      },
      { label: `${input.label} · ${l.description}`, companyId: input.companyId },
    );
  }
  return deliveryId;
}
