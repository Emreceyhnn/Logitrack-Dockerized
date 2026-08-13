// Barrel re-exporting the company controller, split across submodules under
// ./company/ to keep each file focused and under ~400 lines.
export {
  createCompany,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "./company/crud";
export {
  getCompanyUsers,
  getCompanyWarehouses,
  getCompanyVehicles,
  getCompanyDrivers,
  getCompanyCustomers,
} from "./company/resources";
export {
  removeCompanyUser,
  addCompanyUser,
  updateCompanyMember,
} from "./company/members";
export {
  getCompanyProfile,
  getCompanyStats,
  getCompanyWithDashboardData,
} from "./company/stats";
