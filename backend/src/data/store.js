const users = [
  {
    id: "USR-1",
    name: "Admin",
    email: "admin@trafficsign.ai",
    password: "admin123",
    role: "Administrator",
    status: "Active",
  },
  {
    id: "USR-2",
    name: "Manager",
    email: "manager@trafficsign.ai",
    password: "manager123",
    role: "Manager",
    status: "Active",
  },
  {
    id: "USR-3",
    name: "User",
    email: "user@trafficsign.ai",
    password: "user123",
    role: "User",
    status: "Active",
  },
];

const detections = [
  {
    id: "REQ-1001",
    userEmail: "user@trafficsign.ai",
    fileName: "road-crossing.jpg",
    sign: "Pedestrian Crossing",
    category: "Warning",
    confidence: 96,
    status: "Completed",
    detectedAt: "2026-05-10 10:20",
  },
  {
    id: "REQ-1002",
    userEmail: "user@trafficsign.ai",
    fileName: "speed-limit.png",
    sign: "Speed Limit",
    category: "Regulatory",
    confidence: 91,
    status: "Completed",
    detectedAt: "2026-05-11 12:45",
  },
  {
    id: "REQ-1003",
    userEmail: "user@trafficsign.ai",
    fileName: "blurred-upload.jpg",
    sign: "Not detected",
    category: "Unknown",
    confidence: 0,
    status: "Rejected",
    detectedAt: "2026-05-13 09:15",
  },
];

module.exports = { users, detections };
