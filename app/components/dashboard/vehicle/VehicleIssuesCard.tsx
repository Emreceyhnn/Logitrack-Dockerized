import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { PriorityChip } from "../../chips/priorityChips";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface CheckIssue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: Date;
  vehicle?: {
    plate: string;
  };
}

interface VehicleIssuesCardProps {
  issues: CheckIssue[];
}

export default function VehicleIssuesCard({ issues }: VehicleIssuesCardProps) {
  const dict = useDictionary();

  /* ------------------------------- components ------------------------------- */
  const getStatusIcon = (status: string) => {
    switch (status.toLocaleUpperCase('en-US')) {
      case "OPEN":
        return <ErrorIcon color="error" />;
      case "IN_PROGRESS":
        return <WarningIcon color="warning" />;
      case "RESOLVED":
        return <CheckCircleIcon color="success" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardHeader
        title={dict.vehicles.dashboard.openIssues}
        subheader={dict.vehicles.dashboard.activeIssues.replace(
          "{count}",
          issues.length.toString()
        )}
      />
      <CardContent sx={{ flexGrow: 1, overflow: "auto" }}>
        {issues.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <Typography variant="body2" color="text.secondary">
              {dict.vehicles.dashboard.noOpenIssues}
            </Typography>
          </Box>
        ) : (
          <List>
            {issues.map((issue) => {
              return (
                <ListItem key={issue.id} divider>
                  <ListItemIcon>{getStatusIcon(issue.status)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="subtitle2">
                          {issue.title}
                        </Typography>
                        <PriorityChip status={issue.priority} />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          {issue.vehicle?.plate
                            ? `${dict.vehicles.fields.plate}: ${issue.vehicle.plate}`
                            : ""}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {issue.description}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
