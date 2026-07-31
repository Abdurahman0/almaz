# Backend — Buyurtma bosqichini o'zgartirish endpoint (Kanban drag-&-drop)

> **Kim uchun:** backend dasturchisi.
> **Nima kerak:** buyurtma **statusini qo'lda o'zgartirish** (stage transition) endpointi. Hozir yo'q,
> shu sababli Buyurtmalar sahifasidagi **Kanban drag-&-drop faqat brauzerda ishlaydi — serverga
> saqlanmaydi** (sahifani yangilasa, karta eski ustuniga qaytadi).
>
> Frontend bu endpointга **allaqachon to'liq ulangan** (optimistik yangilash + rollback + toast).
> Endpoint chiqishi bilan bitta env flag yoqiladi (`VITE_FEATURE_ORDERS_DND=true`) — boshqa frontend
> ishi kerak emas.

**Backend bazaviy URL (prod):** `https://almaz.api.cognilabs.org`

---

## 1. Muammo va tasdiqlangan holat (live probe, 2026-07-29)

Kanban ustundan-ustunga sudralganda status shu endpointга yuborilishi kerak, lekin u **yo'q**:

| So'rov | Natija | Xulosa |
|---|---|---|
| `POST /orders/{id}/status` `{ "status": "confirmed" }` | **404** `{"detail":"Not Found"}` | Route **umuman mavjud emas** |
| `POST /orders/{id}/cancel` (mavjud, taqqoslash uchun) | `404 {"detail":"Buyurtma topilmadi"}` | Route bor — faqat buyurtma topilmadi |
| `PATCH /orders/{id}` | **405** `Allow: GET` | Buyurtmani tahrirlash ham yo'q (alohida masala, §6) |

Ya'ni generik `404 "Not Found"` (route yo'q) vs `/cancel`ning aniq `"Buyurtma topilmadi"` (route bor) —
farq statusni o'zgartirish route umuman ro'yxatdan o'tmaganini ko'rsatadi.

Hozir yagona haqiqiy status o'zgarishi — `POST /orders/{id}/cancel` (faqat `cancelled`ga).

---

## 2. Kerakli endpoint — `POST /orders/{order_id}/status`

Frontend aynan shuni chaqiradi (`src/features/orders/api.ts` → `setOrderStatus`):

```http
POST /orders/{order_id}/status
Authorization: Bearer <access_token>
Content-Type: application/json

{ "status": "confirmed" }
```

| Maydon | Tur | Majburiy | Izoh |
|---|---|---|---|
| `order_id` (path) | uuid | HA | Buyurtma id |
| `status` (body) | enum `OrderStatus` | HA | Yangi status (quyidagi ro'yxatdan) |

**Ruxsat:** `orders:update` (yoki mavjud `orders:manage`) — admin/menejer rollarida. Ruxsatsiz `403`.

**Javob `200` — to'liq yangilangan `OrderOut`** (frontend javobni cache'ga yozadi):

```json
{
  "id": "d4e5...uuid",
  "order_no": "ORD-260729-EE7220",
  "customer_id": "…",
  "assigned_operator_id": "…",
  "status": "confirmed",
  "items_total": "900000.00",
  "delivery_fee": "30000.00",
  "grand_total": "930000.00",
  "created_at": "2026-07-29T10:00:00Z",
  "items": [ … ],
  "history": [
    { "from_status": "waiting_payment", "to_status": "confirmed",
      "changed_by": "user-uuid", "created_at": "2026-07-29T12:00:00Z" }
  ]
}
```

**Nima qilishi kerak:**
1. `order.status` ni yangi qiymatga o'rnatish.
2. `order_status_history` ga yozuv qo'shish: `from_status` (eski), `to_status` (yangi), `changed_by`
   (joriy foydalanuvchi), `created_at`. Frontend `history[]` ni `OrderOut` ichida kutadi.
3. To'liq `OrderOut` qaytarish.

> **Idempotent:** yangi status eski bilan bir xil bo'lsa — `200` qaytaring (o'zgarishsiz), `history`ga
> yozmasangiz ham bo'ladi. Frontend bir xil ustunga tashlashni allaqachon bloklaydi, lekin xavfsiz bo'lsin.

---

## 3. `OrderStatus` qiymatlari va Kanban ustunlari

Frontenddagi to'liq enum (`src/shared/api/types.ts`):

```
draft · pending · waiting_payment · payment_review · confirmed ·
preparing · packed · shipping · delivered · completed ·
cancelled · refunded · returned
```

Kanban ustunlari → tashlaganda yuboriladigan **asosiy status**:

| Ustun (UI) | Yuboriladigan `status` | Ustunga tegishli statuslar |
|---|---|---|
| Yangi | `pending` | draft, pending |
| To'lov kutilmoqda | `waiting_payment` | waiting_payment, payment_review |
| Tasdiqlangan | `confirmed` | confirmed |
| Tayyorlanmoqda | `preparing` | preparing, packed |
| Yo'lda | `shipping` | shipping |
| Yakunlangan | `delivered` | delivered, completed |
| **Bekor / qaytarilgan** | `cancelled` | cancelled, refunded, returned |

---

## 4. Transition qoidalari (backend qarori)

Ikki variant — qaysi biri biznes mantiqga mos bo'lsa:

- **A (tavsiya, sodda):** admin/menejer uchun **istalgan → istalgan** o'tishга ruxsat (qo'lda tuzatish
  boardi). Faqat statusni yozing + history. Eng kam ish, board to'liq ishlaydi.
- **B (qat'iy):** ruxsat etilgan o'tishlar grafi (masalan `pending → waiting_payment → confirmed →
  preparing → shipping → delivered`; orqaga qaytish cheklangan). Noto'g'ri o'tishда `400` +
  `{"detail":"<sabab>"}`. Frontend `400`ni inline ko'rsatadi va kartani orqaga qaytaradi.

> **`cancelled` haqida muhim:** bekor qilish odatда zaxirани bo'shatish + sabab talab qiladi. Ikki yo'l:
> - `POST /orders/{id}/status {status:"cancelled"}` ni **qabul qilmang** (`400` "cancel uchun /cancel
>   ishlating") — biz frontendда «Bekor» ustuniga tashlaganда `POST /orders/{id}/cancel` chaqiramiz; **yoki**
> - `/status` ичида `cancelled` ni ham to'liq ishlang (zaxira bo'shatish bilan).
>
> **Iltimos qaysi biri ekanini ayting** — frontend shunga qarab «Bekor» ustunini `/status` yoki
> `/cancel`ga yo'naltiradi. Standart taxminimiz: `cancelled`/`refunded`/`returned` **`/status` orqali
> qabul qilinmaydi**, qolgan hammasi `/status` orqali.

---

## 5. Xatolar

| Holat | HTTP | `detail` |
|---|---|---|
| Buyurtma topilmadi | `404` | `"Buyurtma topilmadi"` |
| Noto'g'ri status qiymati | `422` | FastAPI validatsiya (enum) |
| Ruxsat etilmagan o'tish (B varianti) | `400` | matnli sabab |
| Ruxsat yo'q | `403` | `orders:update` kerak |
| Token yo'q/eskirgan | `401` | — |

---

## 6. Bog'liq (ixtiyoriy, alohida) — `PATCH /orders/{order_id}`

Hozir `405 Allow: GET`. Buyurtmani tahrirlash (mijoz, qatorlar, o'lcham, narx, izoh) shu endpointни kutadi
va frontendда `VITE_FEATURE_ORDER_EDITING` flagi ortида tayyor turibdi. **Drag-&-drop uchun shart emas** —
faqat kelajak uchun eslatma.

Kutilayotgan shakl: `PATCH /orders/{id}` `{ status?, notes?, customer_id?, items?, ring_size?, … }` →
`OrderOut`.

---

## 7. Frontend tomoni (siz uchun kontekst — o'zgartirish kerak emas)

- `POST /orders/{id}/status` allaqachon ulangan: `setOrderStatus()` + `useSetOrderStatus()`
  (optimistik yangilash, xatoда rollback + toast).
- Kanban board `FEATURES.ordersKanbanDnd` flagi ortида. Endpoint chiqishi bilan:
  **`.env` da `VITE_FEATURE_ORDERS_DND=true`** — tamom.
- Test: bir buyurtmани ustundan-ustunga sudrab, sahifani yangilang — status saqlanib qolishi kerak;
  `order.history` ga yangi yozuv qo'shilishi kerak.

**Qisqacha:** `POST /orders/{order_id}/status { status }` → yangilangan `OrderOut`; statusни yozing +
history qo'shing; ruxsat `orders:update`; `cancelled` ni `/cancel`ga qoldirasizmi — ayting.
