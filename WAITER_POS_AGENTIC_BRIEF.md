# Waiter-Only Restaurant POS - Agentic Brief Prompt

Copy-paste the prompt below into Cursor Agent when you want full waiter-only POS implementation with RTK Query and user-friendly mobile UI.

## Prompt

You are a senior React Native engineer building a **waiter-only Restaurant POS mobile app**.

### Product Role and Scope (Strict)
- Build only waiter workflows.
- Do not build manager/admin settings, reports, inventory, users, or advanced back-office controls.
- Optimize for speed of order-taking with minimal taps.
- Keep UI polished, modern, and highly readable on small screens.

### Tech Requirements
- Use Redux Toolkit + RTK Query.
- Use TypeScript for API contracts and screen props.
- Centralize auth token handling (Bearer token from signin response).
- Show graceful loading, empty, and error states on all network screens.
- Add retry action for failed requests.
- Logout automatically on unauthorized responses (401/invalid token).

### Base API
- Base URL: `http://localhost:8000/api/v1`
- Authorization: `Bearer <accessToken>`

### Endpoint Contracts (Preserve field names exactly)

1) `POST /auth/signin`
- Request:
  - `email: string`
  - `password: string`
- Response:
  - `success: boolean`
  - `message: string`
  - `accessToken: string`
  - `user: { username, name, role, photo, designation, phone, email, scope, tenant_id, is_active }`

2) `POST /auth/signout`
- Request: no strict body required from sample.
- Behavior: clear session locally even if API fails.

3) `GET /pos/init`
- Response:
  - `categories: Array<{ id, title, is_enabled }>`
  - `paymentTypes: Array<{ id, title, is_active, icon }>`
  - `printSettings: object | null`
  - `storeSettings: { tenant_id, store_image, store_name, address, phone, email, currency, is_qr_menu_enabled, unique_qr_code, is_qr_order_enabled, is_feedback_enabled, unique_id }`
  - `storeTables: Array<{ id, table_title, floor, seating_capacity, encrypted_id }>`
  - `menuItems: Array<{ id, title, description, price, net_price, tax_id, tax_title, tax_rate, tax_type, category_id, category_title, image, is_enabled, addons, variants, recipeItems }>`
  - `serviceCharge: string`

4) `GET /customers/search-by-phone-name/search?q=<query>`
- Response: `Array<{ phone, name, email, birth_date, gender, is_member, created_at }>`

5) `POST /customers/add`
- Request:
  - `phone: string`
  - `name: string`
  - `email: string`
  - `birthDate: string` (YYYY-MM-DD)
  - `gender: string`
- Response:
  - `message: string`

6) `POST /pos/create-order-and-invoice`
- Request:
  - `cart: Array<MenuItemWithQuantityAndNotes>`
  - `deliveryType: "dinein" | "takeaway" | string`
  - `customerType: string`
  - `customerId: { phone: string, name: string } | null`
  - `tableId: string | number`
  - `netTotal: number`
  - `taxTotal: number`
  - `serviceChargeTotal: number`
  - `total: number`
  - `selectedQrOrderItem: unknown | null`
  - `selectedPaymentType: string | number`
- Response:
  - `success: boolean`
  - `message: string`
  - `tokenNo: number`
  - `orderId: number`
  - `invoiceId: number`

7) `POST /pos/create-order`
- Request:
  - `cart: Array<MenuItemWithQuantityAndNotes>`
  - `deliveryType: "dinein" | "takeaway" | string`
  - `customerType: string`
  - `customerId: { phone: string, name: string } | null`
  - `tableId: string | number`
  - `selectedQrOrderItem: unknown | null`
- Response:
  - `success: boolean`
  - `message: string`
  - `tokenNo: number`
  - `orderId: number`

### RTK Query Architecture (Implement this shape)
- `authApi`
  - `signin` mutation
  - `signout` mutation
- `posApi`
  - `getPosInit` query
- `customerApi`
  - `searchCustomers` query (query arg: string, debounce at UI layer)
  - `addCustomer` mutation
- `orderApi`
  - `createOrder` mutation
  - `createOrderAndInvoice` mutation

Use:
- `fetchBaseQuery` with `prepareHeaders` to inject token.
- A small `baseQueryWithReauthHandling` wrapper to catch 401 and dispatch logout.
- Tag strategy:
  - `["PosInit"]`, `["Customers"]`, `["Orders"]`
  - invalidate `Customers` after `addCustomer`
  - optionally invalidate/refetch `Orders` after create mutation success

### Suggested Types
- `AuthUser`, `SigninRequest`, `SigninResponse`
- `Category`, `PaymentType`, `StoreTable`, `MenuItem`, `PosInitResponse`
- `CustomerSearchItem`, `AddCustomerRequest`, `AddCustomerResponse`
- `CartItem extends MenuItem { quantity: number; notes: string | null }`
- `CreateOrderRequest`, `CreateOrderResponse`
- `CreateOrderAndInvoiceRequest`, `CreateOrderAndInvoiceResponse`

### Waiter-First UX Requirements
- Home/POS screen:
  - top: selected table badge and quick switch
  - category chips (horizontal)
  - menu grid with image, name, short allergen/tags, price, + button
- Item detail bottom sheet:
  - quantity stepper
  - notes input
  - addons/variants list if available
  - “Add to Cart” primary CTA
- Sticky mini cart bar:
  - item count + total
  - one-tap open cart
- Cart/Checkout screen:
  - customer search box with inline results
  - quick add customer modal
  - delivery type toggle (dine-in/takeaway)
  - payment type selector (for create-order-and-invoice)
  - large confirm button
- Success state:
  - show token number prominently
  - quick actions: New Order, View Last Order Summary

### UX Quality Rules
- Keep critical actions thumb-friendly and visible without excessive scroll.
- Use skeleton loaders for init/menu.
- Disable submit button while mutation in progress.
- Show inline validation messages (phone, required customer fields, empty cart).
- Show toasts/snackbars for success and recoverable failures.
- Handle nulls from `/pos/init` without crashing (e.g., missing store_name, currency, image).

### Business Logic Rules
- Exclude disabled categories/menu items (`is_enabled !== true`) from selectable list.
- Prevent order submission when cart is empty.
- For dine-in, require `tableId`.
- Recompute totals from cart before submit (do not trust stale UI totals).
- Keep `selectedQrOrderItem` as `null` unless QR flow is explicitly active.

### Acceptance Criteria
1. Waiter can sign in and reach POS screen with init data loaded.
2. Waiter can filter menu by category and add items with quantity/notes.
3. Waiter can search existing customer or add a new customer.
4. Waiter can create order (`/pos/create-order`) successfully.
5. Waiter can create order + invoice (`/pos/create-order-and-invoice`) successfully.
6. App shows token number after success.
7. Logout clears token and app state.
8. All API error/empty/loading states are user-friendly and non-blocking.

### Test Scenarios
- Invalid login credentials.
- Slow network during `/pos/init`.
- Empty customers search result.
- Add customer with invalid phone/date.
- Create order with empty cart (blocked).
- Create order API failure and retry.
- Token expiry mid-session (forces logout).

Now implement screens, RTK Query services, Redux wiring, and production-grade UX according to this brief.
