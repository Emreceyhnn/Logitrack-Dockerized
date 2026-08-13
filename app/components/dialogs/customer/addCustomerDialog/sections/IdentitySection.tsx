import {
  Box,
  Grid,
  Stack,
  Typography,
  MenuItem,
  SvgIconProps,
} from "@mui/material";
import { AddCustomerIdentity } from "@/app/lib/type/add-customer";
import CustomTextArea from "@/app/components/inputs/customTextArea";
import BusinessIcon from "@mui/icons-material/Business";
import BadgeIcon from "@mui/icons-material/Badge";
import CategoryIcon from "@mui/icons-material/Category";
import ReceiptIcon from "@mui/icons-material/Receipt";

import { useFormikContext } from "formik";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

const LabelWithIcon = ({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<SvgIconProps>;
  label: string;
}) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
    <Icon sx={{ fontSize: "0.9rem", color: "primary.main", opacity: 0.8 }} />
    <Typography
      variant="caption"
      color="text.secondary"
      fontWeight={700}
      sx={{ letterSpacing: "0.05em", textTransform: "uppercase" }}
    >
      {label}
    </Typography>
  </Stack>
);

const IdentitySection = () => {
  const dict = useDictionary();
  const { values, errors, touched, setFieldValue, handleBlur } =
    useFormikContext<AddCustomerIdentity>();

  const INDUSTRIES = [
    { value: "Logistics & Transportation", label: dict.industries.logistics },
    { value: "Retail & E-commerce", label: dict.industries.retail },
    { value: "Manufacturing", label: dict.industries.manufacturing },
    { value: "Pharmaceuticals", label: dict.industries.pharmaceuticals },
    { value: "Automotive", label: dict.industries.automotive },
    { value: "Aviation", label: dict.industries.aviation },
    { value: "Technology", label: dict.industries.technology },
    { value: "Other", label: dict.industries.other },
  ];

  return (
    <Box sx={{ py: 1 }}>
      <Stack spacing={4}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={0}>
              <LabelWithIcon
                icon={BusinessIcon}
                label={`${dict.customers.fields.companyName} *`}
              />
              <CustomTextArea
                name="name"
                placeholder={dict.common.na}
                value={values.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFieldValue("name", e.target.value)
                }
                onBlur={handleBlur}
                error={touched.name && Boolean(errors.name)}
                helperText={touched.name ? (errors.name as string) : ""}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "theme.palette.common.white_alpha.main_02",
                    "&:hover": {
                      bgcolor: "theme.palette.common.white_alpha.main_04",
                    },
                    "&.Mui-focused": {
                      bgcolor: "theme.palette.common.white_alpha.main_04",
                    },
                  },
                }}
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={0}>
              <LabelWithIcon
                icon={BadgeIcon}
                label={dict.customers.fields.customerCode}
              />
              <CustomTextArea
                name="code"
                placeholder={dict.common.optional}
                value={values.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFieldValue("code", e.target.value)
                }
                onBlur={handleBlur}
                error={touched.code && Boolean(errors.code)}
                helperText={touched.code ? (errors.code as string) : ""}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "theme.palette.common.white_alpha.main_02",
                  },
                }}
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={0}>
              <LabelWithIcon
                icon={ReceiptIcon}
                label={dict.customers.fields.taxId}
              />
              <CustomTextArea
                name="taxId"
                placeholder={dict.common.na}
                value={values.taxId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFieldValue("taxId", e.target.value)
                }
                onBlur={handleBlur}
                error={touched.taxId && Boolean(errors.taxId)}
                helperText={touched.taxId ? (errors.taxId as string) : ""}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "theme.palette.common.white_alpha.main_02",
                  },
                }}
              />
            </Stack>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Stack spacing={0}>
              <LabelWithIcon
                icon={CategoryIcon}
                label={dict.customers.fields.industry}
              />
              <CustomTextArea
                name="industry"
                select
                value={values.industry}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFieldValue("industry", e.target.value)
                }
                onBlur={handleBlur}
                error={touched.industry && Boolean(errors.industry)}
                helperText={touched.industry ? (errors.industry as string) : ""}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "theme.palette.common.white_alpha.main_02",
                  },
                }}
              >
                <MenuItem value="" disabled>
                  {dict.customers.fields.selectIndustry}
                </MenuItem>
                {INDUSTRIES.map((ind) => (
                  <MenuItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </MenuItem>
                ))}
              </CustomTextArea>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default IdentitySection;
