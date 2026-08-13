import dayjs from "dayjs";
import trLocale from "dayjs/locale/tr";
import enLocale from "dayjs/locale/en";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.locale("tr", trLocale);
dayjs.locale("en", enLocale);
if (dayjs.Ls.en && !dayjs.Ls.en.formats) {
  dayjs.Ls.en.formats = {
    LT: "h:mm A",
    LTS: "h:mm:ss A",
    L: "MM/DD/YYYY",
    LL: "MMMM D, YYYY",
    LLL: "MMMM D, YYYY h:mm A",
    LLLL: "dddd, MMMM D, YYYY h:mm A",
  };
}

export default dayjs;
