"use client";
import { useState } from "react";
import {
  Chip,
  Typography,
  Box,
  useTheme,
  Stack
} from "@mui/material";
import CustomCard from "../../cards/card";
import { InventoryMovementWithRelations } from "@/app/lib/type/warehouse";
import HistoryIcon from '@mui/icons-material/History';
import DataTable from "@/app/components/ui/DataTable";
import type { DataTableColumn } from "@/app/lib/type/dataTable";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { formatDisplayDate, formatDisplayTime } from "@/app/lib/utils/date";
import { useDateSettings } from "@/app/hooks/useDateSettings";

interface RecentStockMovementsProps {
  movements: InventoryMovementWithRelations[];
  loading?: boolean;
}

const RecentStockMovements = ({
  movements,
  loading,
}: RecentStockMovementsProps) => {
  const theme = useTheme();
  const dict = useDictionary();
  const dateSettings = useDateSettings();
  
  // Local pagination
  const [localPage, setLocalPage] = useState(1);
  const [localLimit, setLocalLimit] = useState(10);

  const paginatedMovements = movements.slice(
    (localPage - 1) * localLimit,
    localPage * localLimit
  );

  const meta = {
    page: localPage,
    limit: localLimit,
    total: movements.length,
  };

  const handlePageChange = (newPage: number) => {
    setLocalPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLocalLimit(newLimit);
    setLocalPage(1);
  };

  const columns: DataTableColumn<InventoryMovementWithRelations>[] = [
    {
      key: "warehouse",
      label: dict.dashboard.warehouse.warehouse,
      render: (row) => (
        <Typography variant="body2" fontWeight={800} color="text.primary">
          {row.warehouse?.code}
        </Typography>
      ),
    },
    {
      key: "itemSku",
      label: dict.dashboard.warehouse.itemSku,
      render: (row) => (
        <>
          <Typography variant="body2" fontWeight={600}>
            {row.itemName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
            {row.sku}
          </Typography>
        </>
      ),
    },
    {
      key: "type",
      label: dict.dashboard.warehouse.type,
      render: (row) => {
        const isPick = row.type === "PICK";
        return (
          <Chip
            label={dict.inventory?.dialogs?.historyTypes?.[row.type as keyof typeof dict.inventory.dialogs.historyTypes] || row.type}
            size="small"
            sx={{
              bgcolor: isPick ? theme.palette.warning._alpha.main_10 : theme.palette.success._alpha.main_10,
              color: isPick ? theme.palette.warning.main : theme.palette.success.main,
              fontWeight: 800,
              borderRadius: "8px",
              fontSize: "0.65rem",
              height: 24,
              border: `1px solid ${isPick ? theme.palette.warning._alpha.main_10 : theme.palette.success._alpha.main_10}`,
            }}
          />
        );
      },
    },
    {
      key: "quantity",
      label: dict.dashboard.warehouse.quantity,
      render: (row) => {
        const isPick = row.type === "PICK";
        return (
          <Typography 
            variant="body2" 
            fontWeight={800} 
            color={isPick ? "warning.main" : "success.main"}
          >
            {isPick ? "-" : "+"}
            {Math.abs(row.quantity)}
          </Typography>
        );
      },
    },
    {
      key: "timestamp",
      label: dict.dashboard.warehouse.timestamp,
      align: "right",
      render: (row) => (
        <>
          <Typography variant="body2" fontWeight={600} color="text.primary">
            {formatDisplayTime(row.date, dateSettings)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6 }}>
            {formatDisplayDate(row.date, dateSettings)}
          </Typography>
        </>
      ),
    },
  ];

  if (loading) return (
    <CustomCard sx={{ flex: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography color="text.secondary">{dict.dashboard.warehouse.loadingMovements}</Typography>
    </CustomCard>
  );

  return (
    <CustomCard sx={{ flex: 7, p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ 
            p: 1, 
            borderRadius: '12px', 
            bgcolor: theme.palette.primary._alpha.main_10,
            color: theme.palette.primary.main,
            display: 'flex'
          }}>
            <HistoryIcon fontSize="small" />
          </Box>
          <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: "-0.02em" }}>
            {dict.dashboard.warehouse.recentMovements}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ borderTop: `1px solid ${theme.palette.divider_alpha.main_05}`, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <DataTable<InventoryMovementWithRelations>
          rows={paginatedMovements}
          columns={columns}
          emptyMessage={dict.dashboard.warehouse.noMovements}
          meta={meta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          sx={{ flex: 1 }}
        />
      </Box>
    </CustomCard>
  );
};

export default RecentStockMovements;
