# RetailFlow — Role-Based Access Control (RBAC) Specification

## 1. Permission Model

RetailFlow models RBAC using relational database entities:

* **User**: Individual user accounts.
* **Role**: Named collection of permissions.
* **Permission**: Atomic capability identifier (e.g. `REPORT_VIEW`, `PURCHASE_ORDER_APPROVE`).
* **UserRole**: Many-to-many relationship connecting users to roles.
* **RolePermission**: Many-to-many relationship connecting roles to permissions.

## 2. Granular Permissions Registry

| Domain | Permission Name | Description |
| :--- | :--- | :--- |
| **Catalog** | `CATEGORY_VIEW` / `CATEGORY_CREATE` / `CATEGORY_UPDATE` / `CATEGORY_DELETE` | Category taxonomy governance |
| **Catalog** | `PRODUCT_VIEW` / `PRODUCT_CREATE` / `PRODUCT_UPDATE` / `PRODUCT_DELETE` | Product catalogue governance |
| **Stock** | `STOCK_VIEW` | View current inventory levels |
| **Stock** | `STOCK_UPDATE` | Execute manual inventory adjustments |
| **Stock** | `INVENTORY_MOVEMENT_VIEW` | Inspect chronological stock ledger |
| **POS & Sales**| `POS_ACCESS` / `POS_SALE_CREATE` | Access cash register and process checkouts |
| **POS & Sales**| `SALES_VIEW` / `SALES_VIEW_OWN` / `SALES_VIEW_ALL` | Scoped sales transaction visibility |
| **POS & Sales**| `SALES_DETAIL` / `SALES_DETAIL_OWN` / `SALES_DETAIL_ALL` | Itemized sales receipt inspection |
| **Refunds** | `SALES_REFUND` / `TRANSACTION_REFUND_CREATE` | Initiate refund requests |
| **Refunds** | `SALES_REFUND_APPROVE` / `TRANSACTION_REFUND_APPROVE` | Managerial refund authorization |
| **Suppliers** | `SUPPLIER_VIEW` / `SUPPLIER_CREATE` / `SUPPLIER_UPDATE` / `SUPPLIER_DELETE` | Vendor record management |
| **Purchasing** | `PURCHASE_ORDER_VIEW` / `PURCHASE_ORDER_CREATE` / `PURCHASE_ORDER_UPDATE` | PO lifecycle drafting and edits |
| **Purchasing** | `PURCHASE_ORDER_SUBMIT` / `PURCHASE_ORDER_APPROVE` / `PURCHASE_ORDER_CANCEL` | PO stage workflow transitions |
| **Warehouse** | `GOODS_RECEIPT_VIEW` / `GOODS_RECEIPT_CREATE` / `GOODS_RECEIPT_UPDATE` | Receiving verification |
| **Warehouse** | `GOODS_RECEIPT_CONFIRM` / `GOODS_RECEIPT_CANCEL` | Stock ledger incrementing on arrival |
| **Reports** | `REPORT_VIEW` | Access report center |
| **Reports** | `REPORT_SALES_VIEW` | View sales analytics |
| **Reports** | `REPORT_INVENTORY_VIEW` | View stock balance and turnover reports |
| **Reports** | `REPORT_PURCHASING_VIEW` | View procurement expense and fulfillment |
| **Reports** | `REPORT_WAREHOUSE_VIEW` | View receiving and discrepancy reports |
| **Reports** | `REPORT_FINANCE_VIEW` | View revenue, tax, and settlement summaries |
| **Reports** | `REPORT_CASHIER_VIEW` | View cashier tender and cash collection reports |
| **Reports** | `REPORT_AUDIT_VIEW` | View audit logs and historical activities |
| **Reports** | `REPORT_EXPORT` | Export tabular report data to CSV/Excel |

## 3. Super Admin & Auditor Behavioral Rules

* **Super Admin**: Super Admin possesses all valid permissions via database assignment. Code paths verify `hasPermission(userId, permission)` rather than `if (isSuperAdmin) return true`.
* **Auditor Role**: The Auditor role possesses all analytical, reporting, and read-only inspection permissions. It is strictly excluded from every mutation capability.
