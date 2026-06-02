export function statusPillClass(status) {
  if (status === "Completed" || status === "Success") return "status-pill status-active";
  if (status === "Rejected" || status === "Failed") return "status-pill status-inactive";
  return "status-pill";
}
