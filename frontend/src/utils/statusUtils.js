export function statusPillClass(status) {
  if (status === "Completed") return "status-pill status-active";
  if (status === "Rejected") return "status-pill status-inactive";
  return "status-pill";
}
