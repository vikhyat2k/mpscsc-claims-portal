# MPSCSC Claims Portal - User Guide

Welcome to the **MPSCSC Claims Portal**, a comprehensive offline web-based application designed to manage Travelling Allowance (TA), Daily Allowance (DA), Transfer Claims, and Medical Reimbursement for specific employees of the Madhya Pradesh State Civil Supplies Corporation.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Employee Master](#employee-master)
4. [Claims Management](#claims-management)
    - [TA/DA Claims](#tada-claims)
    - [Transfer Claims](#transfer-claims)
    - [Tour Diary](#tour-diary)
5. [Medical Claims](#medical-claims)
6. [Reports](#reports)
7. [Language Support](#language-support)

---

## 1. Getting Started
The portal is designed to be intuitive. Use the **Navigation Bar** on the left (or top) to access different modules. The application supports both **English** and **Hindi**.

## 2. Dashboard
**Route:** `/`
The **Dashboard** is the landing page that provides a high-level overview of the system's status.
- **Statistics**: View total number of employees, total TA/DA claims count & amount, and Transfer claims count & amount.
- **Quick Links**: Fast access buttons to key modules like Employees, Tour Diaries, and Claims.

## 3. Employee Master
**Route:** `/employees`
This module handles the database of all employees.
- **Add Employee**: Register a new employee with details like Name, Designation, Pay Level, Basic Pay, and Headquarters.
- **Edit/Delete**: Update existing employee details or remove them from the system.
- **Search**: Filter employees by name or designation.
- **Note**: An employee MUST be registered here before any claim can be created for them.

## 4. Claims Management
This is the core functionality of the portal, divided into different claim types.

### TA/DA Claims
**Route:** `/claims/tada`
Manage standard Tour Allowance and Daily Allowance claims.
- **Create Claim**: Select an employee and define the tour period (Month/Year).
- **Edit Claim**: Modify claim details.
- **Tour Diary Integration**: Link daily journey details to the claim.
- **Bill View**: Generate the final printable **Tour Allowance Bill** with automatic calculation of DA based on journey duration (0% for <=6hrs, 50% for 6-12hrs, 100% for >12hrs).
- **Export**: Export bills to Excel for further processing.

### Transfer Claims
**Route:** `/claims/transfer-list`
Manage claims related to employee transfers.
- **Features**: Similar to TA/DA but includes additional fields for **Family Members**, **Baggage Weight**, **Goods Transport Charges**, and **Packing Charges**.
- **Calculations**: Automatically calculates fares and allowances specific to transfer rules.

### Tour Diary
**Route:** `/tour-diaries`
Record day-to-day travel details.
- **Journey Details**: Log Departure/Arrival time, Station, Mode of Travel, Distance, and Purpose.
- **Auto-Calculation**: The system automatically calculates **Journey Duration** and **Stay Duration** to determine applicable DA.

## 5. Medical Claims
**Route:** `/medical`
Manage reimbursement claims for medical expenses.
- **New Claim**: Record patient details, relationship to employee, illness type, and duration.
- **Bill Entry**: Add individual medical bills/receipts.
- **Print**: Generate a consolidated Medical Claim form.

## 6. Reports
**Route:** `/reports`
Generate summary reports for administrative use.
- **Date Range Filter**: Select a start and end date to generate reports.
- **Printable Format**: Reports are formatted for easy printing.

## 7. Language Support
The application includes a toggle button (usually in the sidebar or top bar) to switch between **English** and **Hindi (हिं)**. This translates interface labels and headers for better accessibility.

---
*MPSCSC Claims Portal © 2026*
