"use client";
import { useEffect } from "react";
// Centralised dayjs setup — this card mounts its own LocalizationProvider, so
// it must ensure the same locale/plugin/formats config is applied.
import dayjs from "@/app/lib/utils/dayjsConfig";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { PickersDay } from "@mui/x-date-pickers/PickersDay";
import type { PickersDayProps } from "@mui/x-date-pickers/PickersDay";
import { Badge, Divider, Tooltip, Typography } from "@mui/material";
import CustomCard from "../../cards/card";
import { useDictionary, useLanguage } from "@/app/lib/language/DictionaryContext";

interface VehicleDocument {
  id: string;
  plate: string;
  documentType: string;
  expiryDate: Date | null;
}

interface VehicleService {
  id: string;
  plate: string;
  serviceType: string;
  serviceDate: Date;
}

interface VehicleDocumentCalenderCardProps {
  data?: VehicleDocument[];
  maintenanceData?: VehicleService[];
}

const DocumentCalenderCard = ({
  data = [],
  maintenanceData = [],
}: VehicleDocumentCalenderCardProps) => {
  const dict = useDictionary();
  const { lang } = useLanguage();
  const safeLang = ["en", "tr"].includes(lang) ? lang : "en";

  useEffect(() => {
    dayjs.locale(safeLang);
  }, [safeLang]);

  const DocumentDay = (props: PickersDayProps) => {
    const { day, ...other } = props;

    const docsForDay = data.filter((d) =>
      d.expiryDate ? dayjs(d.expiryDate).isSame(day, "day") : false
    );

    const maintenanceForDay = maintenanceData.filter((m) =>
      m.serviceDate ? dayjs(m.serviceDate).isSame(day, "day") : false
    );

    if (docsForDay.length === 0 && maintenanceForDay.length === 0) {
      return <PickersDay day={day} {...other} />;
    }

    const getLocalizedDocType = (type: string) => {
      return (dict.vehicles.docTypes as Record<string, string>)?.[type] || type;
    };

    const getLocalizedServiceType = (type: string) => {
      return (
        (dict.vehicles.serviceTypes as Record<string, string>)?.[type] || type
      );
    };

    const tooltipContent = [
      ...docsForDay.map(
        (d) => `${getLocalizedDocType(d.documentType)} - ${d.plate}`
      ),
      ...maintenanceForDay.map(
        (m) => `${getLocalizedServiceType(m.serviceType)} - ${m.plate}`
      ),
    ].join(", ");

    const badgeColor = docsForDay.length > 0 ? "error" : "info";

    return (
      <Tooltip title={tooltipContent} arrow>
        <Badge
          variant="dot"
          color={badgeColor}
          overlap="circular"
          sx={{
            "& .MuiBadge-badge": {
              ...(docsForDay.length > 0 &&
                maintenanceForDay.length > 0 && {
                  background:
                    "linear-gradient(45deg, #f44336 50%, #2196f3 50%)",
                }),
            },
          }}
        >
          <PickersDay day={day} {...other} />
        </Badge>
      </Tooltip>
    );
  };

  return (
    <CustomCard sx={{ padding: "0 0 6px 0" }}>
      <Typography sx={{ fontSize: 18, fontWeight: 600, p: 2 }}>
        {dict.vehicles.dashboard.expiringSoon}
      </Typography>
      <Divider />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={safeLang}>
        <DateCalendar
          referenceDate={dayjs()}
          views={["year", "month", "day"]}
          slots={{
            day: DocumentDay,
          }}
        />
      </LocalizationProvider>
    </CustomCard>
  );
};

export default DocumentCalenderCard;
