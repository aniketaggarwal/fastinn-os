# FastInn 🏨

FastInn is a comprehensive, modern hotel booking and management system designed to streamline both the guest experience and hotel operations. 

The project is split into two primary components: a user-facing booking portal and an admin/kiosk application for staff and self-service check-ins. Both applications are built with [Next.js](https://nextjs.org/) and powered by [Supabase](https://supabase.com/) for the backend database and authentication.

---

## 🏗️ Architecture

The monorepo contains two main applications:

### 1. Booking Portal (`/booking-portal`)
The customer-facing application where guests can:
- Browse available rooms and amenities.
- Make hotel reservations.
- View their booking details.

**Tech Stack Highlights:**
- **Framework:** Next.js 15
- **Backend/DB:** Supabase

### 2. Admin & Kiosk Dashboard (`/bit-wizardz`)
The management system for hotel staff, inclusive of a self-service kiosk for guests. Included features:
- **Admin Dashboard:** Manage bookings, room statuses, and view hotel statistics.
- **Kiosk Mode:** A self-service check-in flow for guests arriving at the hotel.
- **Advanced Integrations:** 
  - **Face Recognition:** Uses `face-api.js` for secure facial verification during check-in.
  - **ID Scanning:** Uses `tesseract.js` for OCR (Optical Character Recognition) to scan documents/IDs.
  - **QR Scanning:** Uses `html5-qrcode` to scan booking QR codes.

**Tech Stack Highlights:**
- **Framework:** Next.js 16 (with PWA support)
- **Styling:** Tailwind CSS v4
- **Backend/DB:** Supabase

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (comes with Node.js)
- A [Supabase](https://supabase.com/) project (for database and auth)

### Setting up Environment Variables

Before running the applications, you'll need to set up your environment variables. 
Create a `.env.local` file in both the `booking-portal` and `bit-wizardz` directories. 

You will typically need your Supabase keys (example):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

*(Check `.env.local.example` if available in the respective directories for all required keys).*

---

### Running the Booking Portal

To run the guest booking portal:

```bash
cd booking-portal
npm install
npm run dev
```
The booking portal will start on **http://localhost:3001**.

---

### Running the Admin & Kiosk Dashboard

To run the staff and kiosk application:

```bash
cd bit-wizardz
npm install
npm run dev
```
The admin/kiosk dashboard will start on **http://localhost:3000**.

---

## 💡 Usage Guide (When Completed)

1. **For Staff:**
   - Navigate to `http://localhost:3000`.
   - Log in using staff/admin credentials to access the internal dashboard.
   - Manage room inventory, monitor incoming bookings, and handle guest check-ins.

2. **For Guests (Booking):**
   - Navigate to `http://localhost:3001`.
   - Browse rooms, select dates, and complete the booking process.
   - Guests will receive a booking confirmation (often with a QR code) upon success.

3. **For Guests (Self Check-in at Hotel):**
   - The hotel lobby tablet/computer will be running `http://localhost:3000` in **Kiosk Mode**.
   - The guest scans their booking QR code.
   - The system verifies their face (`face-api.js`) and/or ID (`tesseract.js`) to complete a seamless, contactless check-in.
