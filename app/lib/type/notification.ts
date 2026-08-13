export type NotificationType = "INFO" | "WARNING" | "ERROR" | "SUCCESS";

export type NotificationCategory =
  | "SHIPMENT_UPDATE"
  | "MAINTENANCE_ALERT"
  | "NEW_ASSIGNMENT"
  | "DELAY_ALERT"
  | "SYSTEM";

export interface NotificationTarget {
  userId?: string;
  companyId?: string;
  roleId?: string;
  isGlobal?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: number;
  isRead: boolean;
  category?: NotificationCategory;
  link?: string;
  metadata?: Record<string, unknown>;
}
