"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import type { Dictionary } from "@/app/lib/language/language";
import {
  useOperatingExpenses,
  useOperatingExpenseMutations,
} from "@/app/hooks/useOperatingExpenses";
import { OperatingExpenseCategory } from "@/app/lib/type/enums";

export default function ExpensesClient({ dict }: { dict: Dictionary }) {
  const { data: expenses = [], isLoading } = useOperatingExpenses();
  const { createExpense, deleteExpense } = useOperatingExpenseMutations();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<OperatingExpenseCategory>(
    OperatingExpenseCategory.LABOR
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [note, setNote] = useState("");

  const resetForm = () => {
    setCategory(OperatingExpenseCategory.LABOR);
    setAmount("");
    setDate(dayjs());
    setNote("");
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !date) return;
    await createExpense.mutateAsync({
      category,
      amount: parsedAmount,
      date: date.toDate(),
      note: note.trim() || undefined,
    });
    setOpen(false);
    resetForm();
  };

  return (
    <Box p={4} width="100%">
      <Container maxWidth="lg">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={4}
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight={800} color="text.primary" gutterBottom>
              {dict.expenses.title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {dict.expenses.pageSubtitle}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            {dict.expenses.addExpense}
          </Button>
        </Stack>

        <Card sx={{ borderRadius: 4, boxShadow: 2 }}>
          <CardContent>
            {!isLoading && expenses.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <ReceiptLongIcon sx={{ fontSize: 56, color: "text.secondary", mb: 2, opacity: 0.5 }} />
                <Typography variant="body1" color="text.secondary">
                  {dict.expenses.noExpenses}
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{dict.expenses.table.category}</TableCell>
                    <TableCell align="right">{dict.expenses.table.amount}</TableCell>
                    <TableCell>{dict.expenses.table.date}</TableCell>
                    <TableCell>{dict.expenses.table.note}</TableCell>
                    <TableCell align="right">{dict.expenses.table.actions}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        {dict.expenses.categories[
                          e.category as keyof typeof dict.expenses.categories
                        ] || e.category}
                      </TableCell>
                      <TableCell align="right">
                        {e.amount.toLocaleString(undefined, {
                          style: "currency",
                          currency: e.currency,
                        })}
                      </TableCell>
                      <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                      <TableCell>{e.note || "-"}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (window.confirm(dict.expenses.confirmDelete)) {
                              deleteExpense.mutate(e.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Container>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{dict.expenses.dialogs.addTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <CustomTextArea
              select
              name="category"
              label={dict.expenses.fields.category}
              value={category}
              onChange={(e) => setCategory(e.target.value as OperatingExpenseCategory)}
            >
              {Object.values(OperatingExpenseCategory).map((c) => (
                <MenuItem key={c} value={c}>
                  {dict.expenses.categories[c as keyof typeof dict.expenses.categories]}
                </MenuItem>
              ))}
            </CustomTextArea>

            <CustomTextArea
              name="amount"
              type="number"
              label={dict.expenses.fields.amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            />

            <DatePicker
              label={dict.expenses.fields.date}
              value={date}
              onChange={(val) => setDate(val)}
              slotProps={{ textField: { fullWidth: true } }}
            />

            <CustomTextArea
              name="note"
              label={dict.expenses.fields.note}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>
            {dict.common.cancel}
          </Button>
          <Button
            variant="contained"
            disabled={!amount || parseFloat(amount) <= 0 || !date || createExpense.isPending}
            onClick={handleSubmit}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {dict.common.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
