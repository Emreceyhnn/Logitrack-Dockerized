"use server";

import { db } from "../db";
import { OperatingExpenseCategory } from "@prisma/client";
import { checkPermission } from "./utils/checkPermission";
import { authenticatedAction } from "../auth-middleware";
import { controllerGuard } from "./utils/controllerGuard";
import { logReportEvent } from "@/app/lib/services/reportEvents";

/**
 * tr-belirtilen tarih aralığındaki operasyonel giderleri getirir
 * en-retrieves operating expenses within the specified date range
 * input (user: AuthenticatedUser, filters: { startDate?: Date, endDate?: Date, category?: OperatingExpenseCategory })
 * output (Promise<OperatingExpense[]>)
 */
export const getOperatingExpenses = authenticatedAction(
  async (
    user,
    filters: {
      startDate?: Date | undefined;
      endDate?: Date | undefined;
      category?: OperatingExpenseCategory | undefined;
    } = {}
  ) => {
    return controllerGuard("getOperatingExpenses", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId);

      const { startDate, endDate, category } = filters;

      const expenses = await db.operatingExpense.findMany({
        where: {
          companyId,
          ...(category && { category }),
          ...(startDate && endDate && { date: { gte: startDate, lte: endDate } }),
        },
        orderBy: { date: "desc" },
      });

      return expenses.map((e) => ({ ...e, amount: Number(e.amount) }));
    });
  }
);

/**
 * tr-yeni bir operasyonel gider kaydı oluşturur
 * en-creates a new operating expense record
 * input (user: AuthenticatedUser, data: { category: OperatingExpenseCategory, amount: number, date: Date, currency?: string, note?: string })
 * output (Promise<OperatingExpense>)
 */
export const createOperatingExpense = authenticatedAction(
  async (
    user,
    data: {
      category: OperatingExpenseCategory;
      amount: number;
      date: Date;
      currency?: string | undefined;
      note?: string | undefined;
    }
  ) => {
    return controllerGuard("createOperatingExpense", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      if (data.amount <= 0) {
        throw new Error("Amount must be positive");
      }

      const expense = await db.$transaction(async (tx) => {
        const created = await tx.operatingExpense.create({
          data: {
            companyId,
            category: data.category,
            amount: data.amount,
            currency: data.currency || "TRY",
            date: data.date,
            note: data.note || null,
            createdById: user!.id,
          },
        });

        await logReportEvent(tx, {
          eventType: "OPERATING_EXPENSE_LOGGED",
          occurredAt: created.date,
          companyId,
          subjectType: "OPERATING_EXPENSE",
          subjectId: created.id,
          actorUserId: user!.id,
          amount: Number(created.amount),
          payload: { category: created.category, currency: created.currency, note: created.note },
          sourceEventId: `operating-expense-logged-${created.id}`,
        });

        return created;
      });

      return { ...expense, amount: Number(expense.amount) };
    });
  }
);

/**
 * tr-belirtilen operasyonel gider kaydını siler
 * en-deletes the specified operating expense record
 * input (user: AuthenticatedUser, id: string)
 * output (Promise<{ success: boolean }>)
 */
export const deleteOperatingExpense = authenticatedAction(
  async (user, id: string) => {
    return controllerGuard("deleteOperatingExpense", async () => {
      const companyId = user?.companyId || "";
      await checkPermission(user, companyId, ["role_admin", "role_manager"]);

      const existing = await db.operatingExpense.findFirst({
        where: { id, companyId },
      });
      if (!existing) {
        throw new Error("Operating expense not found or unauthorized");
      }

      await db.operatingExpense.delete({ where: { id } });
      return { success: true };
    });
  }
);
