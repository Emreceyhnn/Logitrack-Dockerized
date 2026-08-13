import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
  Chip,
  Avatar,
  useTheme,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import VerifiedIcon from "@mui/icons-material/Verified";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCustomerById } from "@/app/lib/controllers/customer";
import { CustomerWithRelations } from "@/app/lib/type/customer";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { logger } from "@/app/lib/logger";
import CustomerContactPanel from "./sections/CustomerContactPanel";
import CustomerActivityPanel from "./sections/CustomerActivityPanel";

interface CustomerDetailDialogParams {
  open: boolean;
  onClose: () => void;
  customerId: string | null;
  /**
   * Pre-resolved customer. When supplied the dialog renders it directly and
   * never calls getCustomerById — the path the Live Demo uses, where the
   * authenticated server action would redirect an anonymous visitor to
   * sign-in. Omitted in the real dashboard, which fetches by id as before.
   */
  customerData?: CustomerWithRelations | null;
}

const CustomerDetailDialog = ({
  open,
  onClose,
  customerId,
  customerData,
}: CustomerDetailDialogParams) => {
  /* --------------------------------- states --------------------------------- */
  const theme = useTheme();
  const dict = useDictionary();
  const pathname = usePathname();
  const isDemo = pathname?.includes("/demo");
  const [customer, setCustomer] = useState<CustomerWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && customerId) {
      // Demo (or any caller that already holds the record): render what was
      // handed in. Calling the authenticated action here is what bounced
      // anonymous demo visitors to the sign-in page.
      if (customerData || isDemo) {
        setCustomer(customerData ?? null);
        setError(null);
        setLoading(false);
        return;
      }
      if (customerId.startsWith("temp-")) {
        setCustomer(null);
        setError(null);
        setLoading(true);
        return;
      }
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const data: CustomerWithRelations | null =
            await getCustomerById(customerId);
          setCustomer(data);
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : dict.customers.dialogs.errorAdd; // Use errorAdd as generic error
          setError(message);
          logger.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
       
      setCustomer(null);
      setError(null);
    }
  }, [open, customerId, dict, customerData, isDemo]);

  const getIndustryLabel = (industry: string | null) => {
    if (!industry) return dict.customers.industryGeneral;
    // Common mapping for database values to dictionary keys
    const mapping: Record<string, keyof typeof dict.industries> = {
      "Logistics & Transportation": "logistics",
      "Retail & E-commerce": "retail",
      "E-commerce": "ecommerce",
      "Manufacturing": "manufacturing",
      "Pharmaceuticals": "pharmaceuticals",
      "Automotive": "automotive",
      "Aviation": "aviation",
      "Technology": "technology",
      "Other": "other"
    };

    const key = mapping[industry];
    return key ? dict.industries[key] : industry;
  };

  if (!customerId) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundImage: "none",
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
          overflow: "hidden",
        },
      }}
    >
      {loading ? (
        <Box p={5} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box p={5} textAlign="center">
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button onClick={onClose}>{dict.common.close}</Button>
        </Box>
      ) : !customer ? (
        <Box p={5} textAlign="center">
          <Typography color="text.secondary">{dict.customers.customerNotFound}</Typography>
          <Button onClick={onClose}>{dict.common.close}</Button>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              p: 3,
              background: `linear-gradient(135deg, ${theme.palette.primary._alpha.main_05} 0%, ${theme.palette.background.paper} 100%)`,
              borderBottom: `1px solid ${theme.palette.divider_alpha.main_05}`,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Stack direction="row" spacing={3} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: theme.palette.secondary._alpha.main_10,
                    color: theme.palette.secondary.main,
                    width: 72,
                    height: 72,
                    fontSize: "2rem",
                    fontWeight: 800,
                    borderRadius: 2,
                  }}
                >
                  {customer.name?.charAt(0)}
                </Avatar>
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      sx={{ color: "text.primary" }}
                    >
                      {customer.name}
                    </Typography>
                    <VerifiedIcon color="primary" sx={{ fontSize: "1.2rem" }} />
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                      label={getIndustryLabel(customer.industry || null)}
                      size="small"
                      sx={{
                        height: 24,
                        fontWeight: 600,
                        bgcolor: theme.palette.secondary._alpha.main_10,
                        color: theme.palette.secondary.dark,
                      }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <BusinessIcon
                        fontSize="small"
                        sx={{ fontSize: "1rem" }}
                      />
                      {customer.code}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1}>
                <IconButton
                  onClick={onClose}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    bgcolor: theme.palette.divider_alpha.main_05,
                    "&:hover": {
                      bgcolor: theme.palette.divider_alpha.main_10,
                      color: "text.primary",
                    },
                  }}
                 aria-label="close">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>
          </Box>

          <DialogContent sx={{ p: 0 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                minHeight: 400,
              }}
            >
              <CustomerContactPanel customer={customer} />

              <CustomerActivityPanel customer={customer} />
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};

export default CustomerDetailDialog;
